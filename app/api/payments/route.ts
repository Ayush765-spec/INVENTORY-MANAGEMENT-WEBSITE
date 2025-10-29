import { prisma } from "@/lib/prisma";
import { BillingService } from "@/lib/billing/invoice";
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceId,
      customerId,
      amount,
      paymentMethod,
      transactionId,
      notes,
    } = body;

    if (!invoiceId || !customerId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payment = await BillingService.recordPayment(
      invoiceId,
      customerId,
      new Decimal(amount),
      paymentMethod,
      transactionId,
      notes
    );

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const invoiceId = req.nextUrl.searchParams.get("invoiceId");
    const customerId = req.nextUrl.searchParams.get("customerId");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (customerId) where.customerId = customerId;

    const total = await prisma.payment.count({ where });
    const payments = await prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { invoice: true, customer: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payments" },
      { status: 400 }
    );
  }
}