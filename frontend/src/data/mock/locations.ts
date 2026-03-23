import type { Location, LocationComparison } from "@/types"

export const locations: Location[] = [
  { id: "loc-1", name: "Centro", address: "Via Roma 123, Milano" },
  { id: "loc-2", name: "Navigli", address: "Ripa di Porta Ticinese 45, Milano" },
  { id: "loc-3", name: "Brera", address: "Via Brera 28, Milano" },
]

export const locationComparisons: LocationComparison[] = [
  { location: "Centro", revenue: 45800, covers: 1240, foodCost: 28.5, avgTicket: 36.94 },
  { location: "Navigli", revenue: 38200, covers: 980, foodCost: 31.2, avgTicket: 38.98 },
  { location: "Brera", revenue: 52100, covers: 1380, foodCost: 26.8, avgTicket: 37.75 },
]
