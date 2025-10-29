import { prisma } from "@/lib/prisma";
import { BillingService } from "@/lib/billing/invoice";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      invoiceId,
      recipientName,
      recipientPhone,
      notes,
    } = body;

    if (!userId || !invoiceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const challan = await BillingService.generateDeliveryChallan(
      userId,
      invoiceId,
      recipientName,
      recipientPhone,
      notes
    );

    return NextResponse.json(challan, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create delivery challan" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const invoiceId = req.nextUrl.searchParams.get("invoiceId");
    const status = req.nextUrl.searchParams.get("status");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

    const where: any = {};
    if (userId) where.userId = userId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;

    const total = await prisma.deliveryChallan.count({ where });
    const challans = await prisma.deliveryChallan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: challans,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch delivery challans" },
      { status: 400 }
    );
  }
}