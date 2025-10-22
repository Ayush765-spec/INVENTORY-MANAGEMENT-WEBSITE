"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { prisma } from "../prisma";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().nonnegative("Price must be non-negative"),
  quantity: z.coerce.number().int().min(0, "Quantity must be non-negative"),
  sku: z.string().optional(),
  lowStockAt: z.coerce.number().int().min(0).optional(),
});

export async function deleteProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return redirect("/sign-in");
  const id = String(formData.get("id") || "");

  if (!id) return;

  await prisma.product.deleteMany({ where: { id: id, userId: user.id } });
}

export async function createProduct(formData: FormData) {
  const user = await getCurrentUser();

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    sku: formData.get("sku") || undefined,
    lowStockAt: formData.get("lowStockAt") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  try {
    await prisma.product.create({
      data: { ...parsed.data, userId: user.id },
    });
    redirect("/inventory");
  } catch (error) {
    throw new Error("Failed to create product.");
  }
}

export async function editProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return redirect("/sign-in");

  const id = String(formData.get("id") || "");
  if (!id) return;

  const payload: any = {};
  const name = formData.get("name");
  const price = formData.get("price");
  const quantity = formData.get("quantity");
  const sku = formData.get("sku");
  const lowStockAt = formData.get("lowStockAt");

  if (name && typeof name === "string") payload.name = name;
  if (sku && typeof sku === "string") payload.sku = sku;
  if (price && typeof price === "string") payload.price = price;
  if (quantity && typeof quantity === "string") payload.quantity = parseInt(quantity, 10) || 0;
  if (lowStockAt && typeof lowStockAt === "string") payload.lowStockAt = parseInt(lowStockAt, 10) || null;

  if (Object.keys(payload).length === 0) return;

  try {
    await prisma.product.updateMany({ where: { id, userId: user.id }, data: payload as any });
  } catch (err) {
    console.error("editProduct failed:", err);
    throw err;
  }
}