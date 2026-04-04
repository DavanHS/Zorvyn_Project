import { prisma } from "../utils/db.js";
import type { Prisma } from "@prisma/client";

function paiseToRupees(paise: number): number {
  return paise / 100;
}

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  category_breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthly_trend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  recent_activity: Array<{
    id: string;
    amount: number;
    type: string;
    category: string;
    date: Date;
    notes: string | null;
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const where: Prisma.RecordWhereInput = { isDeleted: false };

  const [
    totalIncomeResult,
    totalExpensesResult,
    categoryBreakdownResult,
    monthlyTrendResult,
    recentActivity,
  ] = await Promise.all([
    prisma.record.aggregate({
      where: { ...where, type: "income" },
      _sum: { amount: true },
    }),
    prisma.record.aggregate({
      where: { ...where, type: "expense" },
      _sum: { amount: true },
    }),
    prisma.record.groupBy({
      by: ["category", "type"],
      where,
      _sum: { amount: true },
    }),
    prisma.$queryRaw<Array<{ month: string; income_total: bigint; expense_total: bigint }>>`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income_total,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense_total
      FROM "Record"
      WHERE is_deleted = false
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `,
    prisma.record.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        date: true,
        notes: true,
      },
    }),
  ]);

  const totalIncome = totalIncomeResult._sum.amount || 0;
  const totalExpenses = totalExpensesResult._sum.amount || 0;

  const totalByCategory = categoryBreakdownResult.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = { income: 0, expenses: 0 };
    }
    if (item.type === "income") {
      acc[category].income = item._sum.amount || 0;
    } else {
      acc[category].expenses = item._sum.amount || 0;
    }
    return acc;
  }, {} as Record<string, { income: number; expenses: number }>);

  const totalAmount = totalIncome + totalExpenses;
  const category_breakdown = Object.entries(totalByCategory)
    .map(([category, data]) => ({
      category,
      amount: data.income + data.expenses,
      percentage: totalAmount > 0 ? ((data.income + data.expenses) / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthly_trend = monthlyTrendResult.map((row) => ({
    month: row.month,
    income: paiseToRupees(Number(row.income_total)),
    expenses: paiseToRupees(Number(row.expense_total)),
  }));

  const recent_activity = recentActivity.map((r) => ({
    ...r,
    amount: paiseToRupees(r.amount),
  }));

  return {
    total_income: paiseToRupees(totalIncome),
    total_expenses: paiseToRupees(totalExpenses),
    net_balance: paiseToRupees(totalIncome - totalExpenses),
    category_breakdown: category_breakdown.map((item) => ({
      ...item,
      amount: paiseToRupees(item.amount),
    })),
    monthly_trend,
    recent_activity,
  };
}