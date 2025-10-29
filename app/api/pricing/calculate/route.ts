import { BillingService } from "@/lib/billing/invoice";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, customerId, quantity, userId } = body;

    if (!productId || !customerId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: productId, customerId, quantity" },
        { status: 400 }
      );
    }

    // Validate that the customer belongs to the authenticated user (if userId provided)
    if (userId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || customer.userId !== userId) {
        return NextResponse.json(
          { error: "Unauthorized: Customer does not belong to this user" },
          { status: 403 }
        );
      }
    }

    const pricing = await BillingService.calculatePrice(
      productId,
      customerId,
      quantity
    );

    return NextResponse.json({
      basePrice: pricing.basePrice.toNumber(),
      discountedPrice: pricing.discountedPrice.toNumber(),
      discountAmount: pricing.discountAmount.toNumber(),
      discountPercent: pricing.discountPercent.toNumber(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate price" },
      { status: 400 }
    );
  }
}