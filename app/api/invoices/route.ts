import { prisma } from "@/lib/prisma";
import { BillingService } from "@/lib/billing/invoice";
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      customerId,
      lineItems,
      deliveryAddress,
      notes,
      isSameState = true,
    } = body;

    if (!userId || !customerId || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const invoice = await BillingService.createInvoice(
      userId,
      customerId,
      lineItems,
      deliveryAddress,
      notes,
      isSameState
    );

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const customerId = req.nextUrl.searchParams.get("customerId");
    const status = req.nextUrl.searchParams.get("status");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

    const where: any = {};
    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    where.deleted = false;

    const total = await prisma.invoice.count({ where });
    const invoices = await prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: true,
        lineItems: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoices" },
      { status: 400 }
    );
  }
}