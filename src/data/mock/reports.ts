import type { RevenueData, WasteData } from "@/types"

export const monthlyRevenueData: RevenueData[] = [
  { date: "2025-04", revenue: 125000, costs: 37500, profit: 87500 },
  { date: "2025-05", revenue: 132000, costs: 39600, profit: 92400 },
  { date: "2025-06", revenue: 145000, costs: 43500, profit: 101500 },
  { date: "2025-07", revenue: 128000, costs: 38400, profit: 89600 },
  { date: "2025-08", revenue: 95000, costs: 28500, profit: 66500 },
  { date: "2025-09", revenue: 138000, costs: 41400, profit: 96600 },
  { date: "2025-10", revenue: 142000, costs: 42600, profit: 99400 },
  { date: "2025-11", revenue: 155000, costs: 46500, profit: 108500 },
  { date: "2025-12", revenue: 185000, costs: 55500, profit: 129500 },
  { date: "2026-01", revenue: 148000, costs: 44400, profit: 103600 },
  { date: "2026-02", revenue: 152000, costs: 45600, profit: 106400 },
  { date: "2026-03", revenue: 136100, costs: 38788, profit: 97312 },
]

export const wasteData: WasteData[] = [
  { category: "Verdure", amount: 45, cost: 180, percentage: 32.1 },
  { category: "Latticini", amount: 28, cost: 224, percentage: 20.0 },
  { category: "Carni", amount: 18, cost: 396, percentage: 12.9 },
  { category: "Pane/Pasta", amount: 22, cost: 44, percentage: 15.7 },
  { category: "Pesce", amount: 12, cost: 216, percentage: 8.6 },
  { category: "Altro", amount: 15, cost: 60, percentage: 10.7 },
]

export const underusedIngredients = [
  { name: "Funghi Porcini secchi", lastUsed: "2026-03-05", quantity: 500, unit: "g", value: 75 },
  { name: "Aceto Balsamico 12 anni", lastUsed: "2026-03-10", quantity: 200, unit: "ml", value: 45 },
  { name: "Tartufo nero", lastUsed: "2026-02-28", quantity: 50, unit: "g", value: 120 },
  { name: "Gamberi rossi", lastUsed: "2026-03-12", quantity: 800, unit: "g", value: 64 },
  { name: "Caviale", lastUsed: "2026-02-14", quantity: 30, unit: "g", value: 180 },
]

export const costTrendData = [
  { date: "2025-04", foodCost: 30.0, laborCost: 28.5, overhead: 12.0 },
  { date: "2025-05", foodCost: 30.0, laborCost: 28.2, overhead: 11.8 },
  { date: "2025-06", foodCost: 30.0, laborCost: 27.8, overhead: 11.5 },
  { date: "2025-07", foodCost: 30.0, laborCost: 28.0, overhead: 11.8 },
  { date: "2025-08", foodCost: 30.0, laborCost: 29.5, overhead: 13.2 },
  { date: "2025-09", foodCost: 30.0, laborCost: 28.5, overhead: 12.0 },
  { date: "2025-10", foodCost: 30.0, laborCost: 28.2, overhead: 11.8 },
  { date: "2025-11", foodCost: 30.0, laborCost: 27.5, overhead: 11.2 },
  { date: "2025-12", foodCost: 30.0, laborCost: 26.8, overhead: 10.5 },
  { date: "2026-01", foodCost: 30.0, laborCost: 27.2, overhead: 11.0 },
  { date: "2026-02", foodCost: 30.0, laborCost: 27.5, overhead: 11.2 },
  { date: "2026-03", foodCost: 28.5, laborCost: 27.8, overhead: 11.5 },
]

export const reportSummary = {
  ytdRevenue: 436100,
  ytdCosts: 128788,
  ytdProfit: 307312,
  avgFoodCost: 29.5,
  avgTicket: 37.50,
  totalCovers: 11628,
  wastePercentage: 2.8,
}
