import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");

type Product = {
  id: string;
  userId: string;
  name: string;
  sku?: string | null;
  price: string | number;
  quantity: number;
  lowStockAt?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string | null;
};

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch (err) {
    // create default file
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

async function readAll(): Promise<Product[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw) as Product[];
  } catch (err) {
    return [];
  }
}

async function writeAll(items: Product[]) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function fallbackGetProducts(userId: string, deleted = false) {
  const items = await readAll();
  return items.filter((p) => p.userId === userId && Boolean(p.deleted || false) === Boolean(deleted));
}

export async function fallbackDeleteProduct(userId: string, id: string) {
  const items = await readAll();
  const now = new Date().toISOString();
  const updated = items.map((p) => {
    if (p.id === id && p.userId === userId) {
      return { ...p, deleted: true, deletedAt: now, updatedAt: now };
    }
    return p;
  });
  await writeAll(updated);
}

export async function fallbackEditProduct(userId: string, id: string, data: Partial<Product>) {
  const items = await readAll();
  const now = new Date().toISOString();
  const updated = items.map((p) => {
    if (p.id === id && p.userId === userId) {
      return { ...p, ...data, updatedAt: now } as Product;
    }
    return p;
  });
  await writeAll(updated);
}

export async function fallbackRestoreProduct(userId: string, id: string) {
  const items = await readAll();
  const now = new Date().toISOString();
  const updated = items.map((p) => {
    if (p.id === id && p.userId === userId) {
      const copy = { ...p } as any;
      copy.deleted = false;
      copy.deletedAt = null;
      copy.updatedAt = now;
      return copy as Product;
    }
    return p;
  });
  await writeAll(updated);
}

export async function fallbackInitSample(userId: string) {
  const items = await readAll();
  if (items.some((p) => p.userId === userId)) return;
  const now = new Date().toISOString();
  const sample: Product[] = [
    { id: "p1", userId, name: "Sample Product A", sku: "SPA-1", price: "49.99", quantity: 10, createdAt: now, updatedAt: now, deleted: false },
    { id: "p2", userId, name: "Sample Product B", sku: "SPB-1", price: "19.99", quantity: 3, createdAt: now, updatedAt: now, deleted: false },
  ];
  await writeAll([...items, ...sample]);
}
