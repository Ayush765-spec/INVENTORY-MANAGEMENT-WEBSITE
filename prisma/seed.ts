import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");
  
  const demoUserId = "394f4ce6-d9f0-4532-8299-a907eab952df";
  console.log(`Using user ID: ${demoUserId}`);

  console.log("Creating products...");
  const result = await prisma.product.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      userId: demoUserId,
      name: `Product ${i + 1}`,
      price: (Math.random() * 90 + 10).toFixed(2),
      quantity: Math.floor(Math.random() * 20),
      lowStockAt: 5,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i + 5))
    }))
  });
  
  console.log("Products created:", result.count);
  console.log("Seed data created successfully");
  console.log(`Created ${result.count} products for user ID: ${demoUserId}`);
}

main()
  .then(() => {
    console.log("Main function completed");
  })
  .catch((e) => {
    console.error("Error occurred:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Disconnecting from database...");
    await prisma.$disconnect();
    console.log("Disconnected");
  });