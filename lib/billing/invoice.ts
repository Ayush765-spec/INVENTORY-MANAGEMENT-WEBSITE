import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

interface LineItemData {
  productId: string;
  quantity: number;
  discount?: number;
  discountPercent?: number;
}

export class BillingService {
  // Generate unique invoice number
  static async generateInvoiceNumber(userId: string): Promise<string> {
    const date = new Date();
    const prefix = "INV";
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        userId,
        invoiceNumber: {
          startsWith: `${prefix}${dateStr}`,
        },
      },
      orderBy: { invoiceNumber: "desc" },
      take: 1,
    });

    const sequence =
      lastInvoice && lastInvoice.invoiceNumber
        ? parseInt(lastInvoice.invoiceNumber.slice(-4)) + 1
        : 1;

    return `${prefix}${dateStr}${String(sequence).padStart(4, "0")}`;
  }

  // Calculate pricing with all rules applied
  static async calculatePrice(
    productId: string,
    customerId: string,
    quantity: number
  ): Promise<{
    basePrice: Decimal;
    discountedPrice: Decimal;
    discountAmount: Decimal;
    discountPercent: Decimal;
  }> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");

    let finalPrice = product.price;
    let discountPercent = new Decimal(0);
    let discountAmount = new Decimal(0);

    // Check for pricing rules (bulk discount, customer-specific, time-based)
    const applicableRules = await prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { customerId },
          { productId },
          { customerGroup: "Regular" }, // fallback to group pricing
        ],
        AND: [
          { startDate: { lte: new Date() } },
          {
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          {
            AND: [
              { minQuantity: { lte: quantity } },
              { OR: [{ maxQuantity: null }, { maxQuantity: { gte: quantity } }] },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Apply most recent applicable pricing rule
    if (applicableRules.length > 0) {
      const rule = applicableRules[0];
      if (rule.priceType === "Fixed") {
        finalPrice = rule.priceValue;
      } else if (rule.priceType === "Percentage") {
        discountPercent = rule.priceValue;
        discountAmount = product.price
          .mul(discountPercent)
          .div(100);
        finalPrice = product.price.sub(discountAmount);
      }
    } else {
      // Apply bulk discount if no specific rule
      if (quantity >= 10) {
        discountPercent = new Decimal(5);
      } else if (quantity >= 20) {
        discountPercent = new Decimal(10);
      } else if (quantity >= 50) {
        discountPercent = new Decimal(15);
      }

      if (discountPercent.gt(0)) {
        discountAmount = product.price
          .mul(discountPercent)
          .div(100);
        finalPrice = product.price.sub(discountAmount);
      }
    }

    return {
      basePrice: product.price,
      discountedPrice: finalPrice,
      discountAmount,
      discountPercent,
    };
  }

  // Calculate taxes (GST with CGST/SGST for same state, IGST for inter-state)
  static calculateTax(
    amount: Decimal,
    gstRate: Decimal,
    isSameState: boolean = true
  ): {
    cgst: Decimal;
    sgst: Decimal;
    igst: Decimal;
    totalTax: Decimal;
  } {
    if (isSameState) {
      const halfRate = gstRate.div(2);
      const cgst = amount.mul(halfRate).div(100);
      const sgst = amount.mul(halfRate).div(100);
      return {
        cgst,
        sgst,
        igst: new Decimal(0),
        totalTax: cgst.add(sgst),
      };
    } else {
      const igst = amount.mul(gstRate).div(100);
      return {
        cgst: new Decimal(0),
        sgst: new Decimal(0),
        igst,
        totalTax: igst,
      };
    }
  }

  // Calculate TDS (Tax Deducted at Source) - typically 2% for B2B
  static calculateTDS(
    amount: Decimal,
    applicable: boolean,
    rate: Decimal = new Decimal(2)
  ): Decimal {
    if (!applicable) return new Decimal(0);
    return amount.mul(rate).div(100);
  }

  // Calculate TCS (Tax Collected at Source) - typically 1% for B2C
  static calculateTCS(
    amount: Decimal,
    applicable: boolean,
    rate: Decimal = new Decimal(1)
  ): Decimal {
    if (!applicable) return new Decimal(0);
    return amount.mul(rate).div(100);
  }

  // Create invoice with line items
  static async createInvoice(
    userId: string,
    customerId: string,
    lineItems: LineItemData[],
    deliveryAddress?: string,
    notes?: string,
    isSameState: boolean = true
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new Error("Customer not found");
    if (customer.userId !== userId) throw new Error("Unauthorized: Customer does not belong to this user");

    const invoiceNumber = await this.generateInvoiceNumber(userId);
    let subtotal = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);
    let totalTDS = new Decimal(0);
    let totalTCS = new Decimal(0);
    let totalProfit = new Decimal(0);

    // Validate and calculate line items
    const processedLineItems = [];
    for (const item of lineItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // Check stock availability
      if (product.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        );
      }

      const pricing = await this.calculatePrice(
        item.productId,
        customerId,
        item.quantity
      );

      const unitPrice = pricing.discountedPrice;
      const taxableAmount = unitPrice.mul(item.quantity);
      const gstRate = product.gstRate || new Decimal(18);

      const tax = this.calculateTax(taxableAmount, gstRate, isSameState);

      const lineTotal = taxableAmount
        .add(tax.totalTax)
        .sub(new Decimal(item.discount || 0));

      // Calculate profit (simplified - using cost as 60% of price)
      const costPrice = product.price.mul(new Decimal(0.6));
      const profit = unitPrice.sub(costPrice).mul(item.quantity);

      subtotal = subtotal.add(taxableAmount);
      totalCGST = totalCGST.add(tax.cgst);
      totalSGST = totalSGST.add(tax.sgst);
      totalIGST = totalIGST.add(tax.igst);
      totalProfit = totalProfit.add(profit);

      processedLineItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount: new Decimal(item.discount || 0),
        discountPercent: pricing.discountPercent,
        taxableAmount,
        gstRate,
        sgst: tax.sgst,
        cgst: tax.cgst,
        igst: tax.igst,
        lineTotal,
        costPrice,
        profit,
      });
    }

    // Check credit limit
    const newCreditUsed = customer.creditUsed.add(subtotal);
    if (newCreditUsed.gt(customer.creditLimit)) {
      throw new Error(
        `Credit limit exceeded. Available: ${customer.creditLimit.sub(customer.creditUsed)}`
      );
    }

    // Get TDS/TCS rules
    const taxRule = await prisma.taxRule.findFirst({
      where: {
        userId,
        hsnCode: lineItems[0]?.productId || undefined,
      },
    });

    totalTDS = this.calculateTDS(
      subtotal,
      taxRule?.tdsApplicable || false,
      taxRule?.tdsRate || new Decimal(2)
    );
    totalTCS = this.calculateTCS(
      subtotal,
      taxRule?.tcsApplicable || false,
      taxRule?.tcsRate || new Decimal(1)
    );

    const total = subtotal
      .add(totalCGST)
      .add(totalSGST)
      .add(totalIGST)
      .sub(totalTDS)
      .sub(totalTCS);

    // Calculate profit margins
    const profitPercent =
      subtotal.gt(0) ? totalProfit.mul(100).div(subtotal) : new Decimal(0);

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        customerId,
        invoiceDate: new Date(),
        subtotal,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        tds: totalTDS,
        tcs: totalTCS,
        total,
        amountDue: total,
        status: "Draft",
        deliveryAddress,
        notes,
        profitMargin: totalProfit,
        profitPercent,
        lineItems: {
          create: processedLineItems,
        },
      },
      include: {
        lineItems: true,
        customer: true,
      },
    });

    return invoice;
  }

  // Record payment
  static async recordPayment(
    invoiceId: string,
    customerId: string,
    amount: Decimal,
    paymentMethod: string,
    transactionId?: string,
    notes?: string
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const newAmountPaid = invoice.amountPaid.add(amount);
    const newStatus =
      newAmountPaid.gte(invoice.total)
        ? "Paid"
        : newAmountPaid.gt(0)
          ? "Partial"
          : "Issued";

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        customerId,
        amount,
        paymentMethod,
        transactionId,
        notes,
      },
    });

    // Update invoice
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: invoice.total.sub(newAmountPaid),
        status: newStatus,
      },
    });

    // Update customer credit used
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (customer) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          creditUsed: customer.creditUsed.sub(amount),
        },
      });
    }

    return payment;
  }

  // Apply loyalty points
  static async applyLoyaltyPoints(
    customerId: string,
    invoiceId: string,
    points: number = 0,
    pointsPerRupee: number = 1
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new Error("Invoice not found");

    const earnedPoints =
      points || Math.floor(invoice.total.toNumber() * pointsPerRupee);

    // Record loyalty transaction
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        points: earnedPoints,
        type: "Earned",
        invoiceId,
        description: `Earned from invoice ${invoice.invoiceNumber}`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      },
    });

    // Update customer loyalty points
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: {
          increment: earnedPoints,
        },
      },
    });

    return { earnedPoints };
  }

  // Deduct inventory on invoice issue
  static async deductInventory(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lineItems: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    for (const item of invoice.lineItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "Issued" },
    });
  }

  // Generate delivery challan
  static async generateDeliveryChallan(
    userId: string,
    invoiceId: string,
    recipientName?: string,
    recipientPhone?: string,
    notes?: string
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const lastChallan = await prisma.deliveryChallan.findFirst({
      where: {
        userId,
        challanNumber: {
          startsWith: `CHALLAN${dateStr}`,
        },
      },
      orderBy: { challanNumber: "desc" },
      take: 1,
    });

    const sequence =
      lastChallan && lastChallan.challanNumber
        ? parseInt(lastChallan.challanNumber.slice(-4)) + 1
        : 1;

    const challanNumber = `CHALLAN${dateStr}${String(sequence).padStart(4, "0")}`;

    const challan = await prisma.deliveryChallan.create({
      data: {
        userId,
        challanNumber,
        invoiceId,
        deliveryDate: new Date(),
        deliveryAddress: invoice.deliveryAddress || invoice.customer.address || "",
        recipientName: recipientName || invoice.customer.name,
        recipientPhone: recipientPhone || invoice.customer.phone || "",
        notes,
        status: "Pending",
      },
    });

    return challan;
  }
}