// KPIs
export interface KPI {
  label: string
  value: string
  change?: number
  trend?: "up" | "down" | "neutral"
  description?: string
}

// Alerts
export type AlertSeverity = "critical" | "warning" | "info"

export interface Alert {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  timestamp: string
  category: "stock" | "haccp" | "supplier" | "general"
}

// Products/Dishes
export interface Dish {
  id: string
  name: string
  category: string
  price: number
  cost: number
  margin: number
  salesTrend: number
  ingredients: Ingredient[]
}

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  cost: number
}

// Suppliers
export interface Supplier {
  id: string
  name: string
  category: string
  reliability: number
  avgDeliveryDays: number
  priceChange: number
  lastOrder: string
  contact: string
}

export interface PriceHistory {
  date: string
  price: number
  supplier: string
  item: string
}

// Inventory
export type StockLevel = "critical" | "low" | "normal" | "excess"

export interface InventoryItem {
  id: string
  name: string
  category: string
  unit: string
  theoretical: number
  actual: number
  variance: number
  stockLevel: StockLevel
  minStock: number
  maxStock: number
  lastUpdated: string
}

// HACCP
export type ChecklistItemType = "temperature" | "cleaning" | "inspection" | "custom"

export interface ChecklistItem {
  id: string
  name: string
  type: ChecklistItemType
  description?: string
  minValue?: number
  maxValue?: number
  unit?: string
  required: boolean
}

export interface HACCPEntry {
  id: string
  date: string
  operator: string
  items: HACCPItemResult[]
  status: "pass" | "fail" | "partial"
  notes?: string
}

export interface HACCPItemResult {
  itemId: string
  value: number | boolean
  passed: boolean
  timestamp: string
}

// Planning
export interface CoverageItem {
  id: string
  ingredient: string
  currentStock: number
  unit: string
  dailyUsage: number
  coverageDays: number
  reorderPoint: number
}

export interface ScenarioEvent {
  id: string
  name: string
  date: string
  expectedCovers: number
  menuItems: string[]
  calculatedNeeds: { ingredient: string; quantity: number; unit: string }[]
}

// Reports
export interface RevenueData {
  date: string
  revenue: number
  costs: number
  profit: number
}

export interface WasteData {
  category: string
  amount: number
  cost: number
  percentage: number
}

export interface InflationData {
  date: string
  [supplier: string]: string | number
}

// Locations
export interface Location {
  id: string
  name: string
  address: string
}

export interface LocationComparison {
  location: string
  revenue: number
  covers: number
  foodCost: number
  avgTicket: number
}

// Invoice/Bolla
export type InvoiceStatus = "pending" | "review" | "confirmed" | "rejected"
export type AnomalyType = "price_increase" | "quantity_mismatch" | "new_item" | "missing_item"

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  // Anomaly detection
  anomaly?: {
    type: AnomalyType
    message: string
    expectedValue?: number
    severity: "warning" | "error"
  }
  // Match to inventory
  matchedIngredientId?: string
  confidence?: number
}

export interface Invoice {
  id: string
  supplierName: string
  supplierVAT?: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  subtotal: number
  vat: number
  total: number
  lines: InvoiceLine[]
  status: InvoiceStatus
  uploadedAt: string
  confirmedAt?: string
  confirmedBy?: string
  rawOCRData?: string
}

// Format helpers
export const formatEUR = (value: number): string => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}
