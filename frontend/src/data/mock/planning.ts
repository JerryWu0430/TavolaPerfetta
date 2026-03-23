import type { CoverageItem, ScenarioEvent } from "@/types"

export const coverageItems: CoverageItem[] = [
  {
    id: "cov-1",
    ingredient: "Olio EVO",
    currentStock: 4,
    unit: "L",
    dailyUsage: 1.5,
    coverageDays: 2.7,
    reorderPoint: 10,
  },
  {
    id: "cov-2",
    ingredient: "Parmigiano Reggiano",
    currentStock: 5,
    unit: "kg",
    dailyUsage: 0.8,
    coverageDays: 6.3,
    reorderPoint: 5,
  },
  {
    id: "cov-3",
    ingredient: "Riso Carnaroli",
    currentStock: 18,
    unit: "kg",
    dailyUsage: 2.5,
    coverageDays: 7.2,
    reorderPoint: 10,
  },
  {
    id: "cov-4",
    ingredient: "Filetto di Manzo",
    currentStock: 11,
    unit: "kg",
    dailyUsage: 3.2,
    coverageDays: 3.4,
    reorderPoint: 8,
  },
  {
    id: "cov-5",
    ingredient: "Mozzarella di Bufala",
    currentStock: 5.5,
    unit: "kg",
    dailyUsage: 1.8,
    coverageDays: 3.1,
    reorderPoint: 4,
  },
  {
    id: "cov-6",
    ingredient: "Mascarpone",
    currentStock: 3.8,
    unit: "kg",
    dailyUsage: 0.6,
    coverageDays: 6.3,
    reorderPoint: 3,
  },
  {
    id: "cov-7",
    ingredient: "Burro",
    currentStock: 4.5,
    unit: "kg",
    dailyUsage: 1.2,
    coverageDays: 3.8,
    reorderPoint: 3,
  },
  {
    id: "cov-8",
    ingredient: "Zafferano",
    currentStock: 22,
    unit: "g",
    dailyUsage: 2,
    coverageDays: 11,
    reorderPoint: 15,
  },
]

export const upcomingEvents: ScenarioEvent[] = [
  {
    id: "event-1",
    name: "Cena Aziendale TechCorp",
    date: "2026-03-25",
    expectedCovers: 45,
    menuItems: ["Risotto alla Milanese", "Cotoletta alla Milanese", "Tiramisù"],
    calculatedNeeds: [
      { ingredient: "Riso Carnaroli", quantity: 4.5, unit: "kg" },
      { ingredient: "Zafferano", quantity: 22.5, unit: "g" },
      { ingredient: "Costata di vitello", quantity: 11.25, unit: "kg" },
      { ingredient: "Mascarpone", quantity: 3.6, unit: "kg" },
    ],
  },
  {
    id: "event-2",
    name: "Pranzo di Matrimonio",
    date: "2026-03-28",
    expectedCovers: 80,
    menuItems: ["Carpaccio di Manzo", "Ossobuco con Gremolata", "Panna Cotta"],
    calculatedNeeds: [
      { ingredient: "Filetto di manzo", quantity: 8, unit: "kg" },
      { ingredient: "Ossobuco di vitello", quantity: 28, unit: "kg" },
      { ingredient: "Panna fresca", quantity: 8, unit: "L" },
    ],
  },
  {
    id: "event-3",
    name: "Degustazione Vini",
    date: "2026-03-30",
    expectedCovers: 25,
    menuItems: ["Insalata Caprese", "Tagliatelle al Ragù", "Tiramisù"],
    calculatedNeeds: [
      { ingredient: "Mozzarella di Bufala", quantity: 3.125, unit: "kg" },
      { ingredient: "Tagliatelle fresche", quantity: 3, unit: "kg" },
      { ingredient: "Ragù bolognese", quantity: 2.5, unit: "kg" },
    ],
  },
]

export const scenarioDefaults = {
  avgCoversPerDay: 85,
  peakDayMultiplier: 1.4,
  safetyStockDays: 2,
}
