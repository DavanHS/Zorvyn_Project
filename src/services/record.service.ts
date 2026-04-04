import { prisma } from "../utils/db.js";
import type { RecordType, Category } from "@prisma/client";
import type { Prisma } from "@prisma/client";

function rupeesTopaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function paiseToRupees(paise: number): number {
  return paise / 100;
}

export interface CreateRecordInput {
  amount: number;
  type: RecordType;
  category: Category;
  date: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateRecordInput {
  amount?: number;
  type?: RecordType;
  category?: Category;
  date?: string;
  notes?: string;
}

export async function createRecord(input: CreateRecordInput) {
  const date = new Date(input.date);

  const record = await prisma.record.create({
    data: {
      amount: rupeesTopaise(input.amount),
      type: input.type,
      category: input.category,
      date: date,
      notes: input.notes || null,
      createdBy: input.createdBy,
    },
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      createdBy: true,
      createdAt: true,
    },
  });

  return {
    ...record,
    amount: paiseToRupees(record.amount),
  };
}

export async function getRecordById(id: string) {
  const record = await prisma.record.findFirst({
    where: { id, isDeleted: false },
  });

  if (!record) {
    return null;
  }

  return {
    ...record,
    amount: paiseToRupees(record.amount),
  };
}

export async function updateRecord(id: string, input: UpdateRecordInput) {
  const existingRecord = await prisma.record.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existingRecord) {
    throw new Error("Record not found");
  }

  const updateData: {
    amount?: number;
    type?: RecordType;
    category?: Category;
    date?: Date;
    notes?: string | null;
  } = {};

  if (input.amount !== undefined) {
    updateData.amount = rupeesTopaise(input.amount);
  }
  if (input.type !== undefined) {
    updateData.type = input.type;
  }
  if (input.category !== undefined) {
    updateData.category = input.category;
  }
  if (input.date !== undefined) {
    updateData.date = new Date(input.date);
  }
  if (input.notes !== undefined) {
    updateData.notes = input.notes || null;
  }

  const record = await prisma.record.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...record,
    amount: paiseToRupees(record.amount),
  };
}

export async function deleteRecord(id: string) {
  const existingRecord = await prisma.record.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existingRecord) {
    throw new Error("Record not found");
  }

  return prisma.record.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}

export interface ListRecordsInput {
  page: number;
  limit: number;
  type?: "income" | "expense";
  category?: Category;
  from?: string;
  to?: string;
  search?: string;
}

export interface ListRecordsOutput {
  records: Array<{
    id: string;
    amount: number;
    type: string;
    category: string;
    date: Date;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getRecords(input: ListRecordsInput): Promise<ListRecordsOutput> {
  const { page, limit, type, category, from, to, search } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.RecordWhereInput = { isDeleted: false };

  if (type) {
    where.type = type;
  }
  if (category) {
    where.category = category;
  }
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.record.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        date: true,
        notes: true,
        createdBy: true,
        createdAt: true,
      },
    }),
    prisma.record.count({ where }),
  ]);

  return {
    records: records.map((r) => ({
      ...r,
      amount: paiseToRupees(r.amount),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}