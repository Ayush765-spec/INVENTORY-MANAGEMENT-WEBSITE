import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      customerId,
      productId,
      customerGroup,
      priceType,
      priceValue,
      minQuantity = 1,
      maxQuantity,
      startDate,
      endDate,
    } = body;

    if (!userId || !priceType || !priceValue) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const rule = await prisma.pricingRule.create({
      data: {
        userId,
        customerId,
        productId,
        customerGroup,
        priceType,
        priceValue: new Decimal(priceValue),
        minQuantity,
        maxQuantity,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create pricing rule" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const customerId = req.nextUrl.searchParams.get("customerId");
    const productId = req.nextUrl.searchParams.get("productId");
    const isActive = req.nextUrl.searchParams.get("isActive");

    const where: any = {};
    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;
    if (productId) where.productId = productId;
    if (isActive === "true") where.isActive = true;
    else if (isActive === "false") where.isActive = false;

    const rules = await prisma.pricingRule.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        product: { select: { name: true, sku: true } },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pricing rules" },
      { status: 400 }
    );
  }
}