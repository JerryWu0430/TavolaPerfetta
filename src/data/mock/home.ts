import type { KPI, Alert, RevenueData } from "@/types"

export const homeKPIs: KPI[] = [
  {
    label: "Ricavi Oggi",
    value: "4.850",
    change: 12.5,
    trend: "up",
    description: "vs stesso giorno settimana scorsa",
  },
  {
    label: "Coperti",
    value: "127",
    change: 8.2,
    trend: "up",
    description: "Prenotazioni + walk-in",
  },
  {
    label: "Food Cost %",
    value: "28.5",
    change: -2.1,
    trend: "down",
    description: "Target: 30%",
  },
  {
    label: "Scontrino Medio",
    value: "38.19",
    change: 4.3,
    trend: "up",
    description: "Incl. bevande",
  },
]

export const homeAlerts: Alert[] = [
  {
    id: "alert-1",
    title: "Scorte critiche: Olio EVO",
    description: "Rimanenti 2 giorni di copertura",
    severity: "critical",
    timestamp: "2026-03-22T09:30:00",
    category: "stock",
  },
  {
    id: "alert-2",
    title: "HACCP: Temperatura frigo #2",
    description: "Registrata 6.8°C alle 08:00 (limite 5°C)",
    severity: "critical",
    timestamp: "2026-03-22T08:15:00",
    category: "haccp",
  },
  {
    id: "alert-3",
    title: "Scorte basse: Parmigiano",
    description: "Rimanenti 5 giorni di copertura",
    severity: "warning",
    timestamp: "2026-03-22T07:00:00",
    category: "stock",
  },
  {
    id: "alert-4",
    title: "Fornitore: Consegna in ritardo",
    description: "Verdure Srl - prevista ieri",
    severity: "warning",
    timestamp: "2026-03-21T18:00:00",
    category: "supplier",
  },
]

export const revenueChartData: RevenueData[] = [
  { date: "2026-03-01", revenue: 4200, costs: 1260, profit: 2940 },
  { date: "2026-03-02", revenue: 5100, costs: 1530, profit: 3570 },
  { date: "2026-03-03", revenue: 4800, costs: 1440, profit: 3360 },
  { date: "2026-03-04", revenue: 3900, costs: 1170, profit: 2730 },
  { date: "2026-03-05", revenue: 4600, costs: 1380, profit: 3220 },
  { date: "2026-03-06", revenue: 6200, costs: 1860, profit: 4340 },
  { date: "2026-03-07", revenue: 7100, costs: 2130, profit: 4970 },
  { date: "2026-03-08", revenue: 4400, costs: 1320, profit: 3080 },
  { date: "2026-03-09", revenue: 4900, costs: 1470, profit: 3430 },
  { date: "2026-03-10", revenue: 5200, costs: 1560, profit: 3640 },
  { date: "2026-03-11", revenue: 4100, costs: 1230, profit: 2870 },
  { date: "2026-03-12", revenue: 4700, costs: 1410, profit: 3290 },
  { date: "2026-03-13", revenue: 6800, costs: 2040, profit: 4760 },
  { date: "2026-03-14", revenue: 7500, costs: 2250, profit: 5250 },
  { date: "2026-03-15", revenue: 4300, costs: 1290, profit: 3010 },
  { date: "2026-03-16", revenue: 5000, costs: 1500, profit: 3500 },
  { date: "2026-03-17", revenue: 5400, costs: 1620, profit: 3780 },
  { date: "2026-03-18", revenue: 4000, costs: 1200, profit: 2800 },
  { date: "2026-03-19", revenue: 4500, costs: 1350, profit: 3150 },
  { date: "2026-03-20", revenue: 6500, costs: 1950, profit: 4550 },
  { date: "2026-03-21", revenue: 7200, costs: 2160, profit: 5040 },
  { date: "2026-03-22", revenue: 4850, costs: 1455, profit: 3395 },
]

export const haccpDailyStatus = {
  date: "2026-03-22",
  completedChecks: 8,
  totalChecks: 10,
  status: "partial" as const,
  issues: ["Temperatura frigo #2 fuori range"],
}
