import { db } from "./db";
import { receipts, settings, type ReceiptResponse, type CreateReceiptRequest, type UpdateReceiptRequest } from "@shared/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  getSettings(): Promise<{ secretaryName: string }>;
  updateSettings(input: { secretaryName: string }): Promise<{ secretaryName: string }>;

  listReceipts(filters?: {
    q?: string;
    receiptNumber?: number;
    date?: string;
  }): Promise<ReceiptResponse[]>;
  getReceipt(id: number): Promise<ReceiptResponse | undefined>;
  createReceipt(input: CreateReceiptRequest): Promise<ReceiptResponse>;
  updateReceipt(id: number, updates: UpdateReceiptRequest): Promise<ReceiptResponse | undefined>;
  deleteReceipt(id: number): Promise<boolean>;

  getNextReceiptNumber(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getSettings(): Promise<{ secretaryName: string }> {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "secretaryName"));
    return { secretaryName: row?.value ?? "" };
  }

  async updateSettings(input: { secretaryName: string }): Promise<{ secretaryName: string }> {
    await db
      .insert(settings)
      .values({ key: "secretaryName", value: input.secretaryName })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: input.secretaryName },
      });
    return { secretaryName: input.secretaryName };
  }

  async listReceipts(filters?: {
    q?: string;
    receiptNumber?: number;
    date?: string;
  }): Promise<ReceiptResponse[]> {
    const whereParts: any[] = [];
    if (filters?.receiptNumber) {
      whereParts.push(eq(receipts.receiptNumber, filters.receiptNumber));
    }
    if (filters?.date) {
      whereParts.push(eq(receipts.issueDate, filters.date));
    }
    if (filters?.q && filters.q.trim().length > 0) {
      const q = `%${filters.q.trim()}%`;
      whereParts.push(
        or(
          ilike(receipts.studentName, q),
          ilike(receipts.paymentDescription, q),
          ilike(receipts.guardianName, q),
          ilike(receipts.studentNumber, q),
        ),
      );
    }

    const where = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db
      .select()
      .from(receipts)
      .where(where)
      .orderBy(desc(receipts.receiptNumber));
    return rows;
  }

  async getReceipt(id: number): Promise<ReceiptResponse | undefined> {
    const [row] = await db.select().from(receipts).where(eq(receipts.id, id));
    return row;
  }

  async getNextReceiptNumber(): Promise<number> {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${receipts.receiptNumber}), 0)` })
      .from(receipts);
    return (row?.max ?? 0) + 1;
  }

  async createReceipt(input: CreateReceiptRequest): Promise<ReceiptResponse> {
    const next = await this.getNextReceiptNumber();
    const [row] = await db
      .insert(receipts)
      .values({
        ...input,
        receiptNumber: next,
        issueDate: new Date().toISOString().slice(0, 10),
      })
      .returning();
    return row;
  }

  async updateReceipt(
    id: number,
    updates: UpdateReceiptRequest,
  ): Promise<ReceiptResponse | undefined> {
    const [row] = await db
      .update(receipts)
      .set(updates)
      .where(eq(receipts.id, id))
      .returning();
    return row;
  }

  async deleteReceipt(id: number): Promise<boolean> {
    const [row] = await db.delete(receipts).where(eq(receipts.id, id)).returning();
    return Boolean(row);
  }
}

export const storage = new DatabaseStorage();
