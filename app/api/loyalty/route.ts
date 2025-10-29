import { prisma } from "@/lib/prisma";
import { BillingService } from "@/lib/billing/invoice";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, invoiceId, points, pointsPerRupee = 1 } = body;

    if (!customerId || !invoiceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await BillingService.applyLoyaltyPoints(
      customerId,
      invoiceId,
      points,
      pointsPerRupee
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply loyalty points" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");
    const type = req.nextUrl.searchParams.get("type");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;

    const total = await prisma.loyaltyTransaction.count({ where });
    const transactions = await prisma.loyaltyTransaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });

    // Get customer total points
    const customer = customerId
      ? await prisma.customer.findUnique({
          where: { id: customerId },
          select: { loyaltyPoints: true },
        })
      : null;

    return NextResponse.json({
      data: transactions,
      customerPoints: customer?.loyaltyPoints || 0,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch loyalty transactions" },
      { status: 400 }
    );
  }
}