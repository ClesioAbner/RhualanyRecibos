import { pgTable, serial, text, varchar, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
});

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  receiptNumber: integer("receipt_number").notNull().unique(),
  issueDate: date("issue_date").notNull(),
  secretaryName: text("secretary_name").notNull(),

  studentName: text("student_name").notNull(),
  studentClass: varchar("student_class", { length: 8 }).notNull(),
  studentNumber: text("student_number"),
  guardianName: text("guardian_name"),

  paymentDescription: text("payment_description").notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
  ivaAmount: numeric("iva_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  amountInWords: text("amount_in_words").notNull(),
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  receiptNumber: true,
  issueDate: true,
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;

export type CreateReceiptRequest = InsertReceipt;
export type UpdateReceiptRequest = Partial<InsertReceipt>;
export type ReceiptResponse = Receipt;

export type SettingsKey = "secretaryName";
export type SettingsResponse = {
  secretaryName: string;
};
