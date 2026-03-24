"use client"

import * as React from "react"
import { PageHeader } from "@/components/page-header"
import { KPIGrid, KPICard } from "@/components/kpi-card"
import { AlertPanel } from "@/components/alert-panel"
import { HACCPWidget } from "@/components/haccp-widget"
import { RevenueChart } from "@/components/revenue-chart"
import { LocationComparisonChart } from "@/components/location-comparison-chart"
import { LocationSelector } from "@/components/location-selector"
import { useTranslations } from "@/lib/i18n"
import {
  locations as locationsApi,
  orders as ordersApi,
  inventory as inventoryApi,
  haccp,
  suppliers as suppliersApi,
  deliveries as deliveriesApi,
  recipes as recipesApi,
  priceHistory as priceHistoryApi,
  products as productsApi,
  type Location as APILocation,
  type Order,
  type InventoryItem,
  type HACCPChecklist,
  type SupplierListItem,
  type Delivery,
  type RecipeListItem,
  type PriceHistoryRecord,
  type Product,
} from "@/lib/api"
import type { KPI, Alert, RevenueData, Location, LocationComparison } from "@/types"
import { Loader2Icon, TruckIcon, ChefHatIcon, TrendingUpIcon, PackageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatEUR } from "@/types"

function mapLocationToUI(l: APILocation): Location {
  return {
    id: String(l.id),
    name: l.name,
    address: l.address || "",
  }
}

function getStockLevel(quantity: number, minStock: number): "critical" | "low" | "normal" {
  if (quantity <= minStock * 0.5) return "critical"
  if (quantity <= minStock) return "low"
  return "normal"
}

export default function HomePage() {
  const t = useTranslations()
  const [selectedLocation, setSelectedLocation] = React.useState("all")
  const [locations, setLocations] = React.useState<Location[]>([])
  const [revenueData, setRevenueData] = React.useState<RevenueData[]>([])
  const [locationComparisons, setLocationComparisons] = React.useState<LocationComparison[]>([])
  const [haccpStatus, setHaccpStatus] = React.useState<{
    date: string
    completedChecks: number
    totalChecks: number
    status: "pass" | "fail" | "partial"
    issues: string[]
  } | null>(null)
  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [kpis, setKpis] = React.useState<KPI[]>([])
  const [secondaryKpis, setSecondaryKpis] = React.useState<KPI[]>([])
  const [topDishes, setTopDishes] = React.useState<{ name: string; category: string | null; margin: number; sales: number }[]>([])
  const [supplierIssues, setSupplierIssues] = React.useState<{ name: string; anomalies: number; priceChange: number }[]>([])
  const [recentDeliveries, setRecentDeliveries] = React.useState<{ supplier: string; status: string; date: string }[]>([])
  const [priceChanges, setPriceChanges] = React.useState<{ product: string; change: number }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch all data in parallel
        // Fetch last 30 days + same day last week for comparison
        const today = new Date()
        const lastWeekSameDay = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        const [locationsRes, ordersRes, lastWeekOrdersRes, inventoryRes, haccpTodayRes, suppliersRes, deliveriesRes, recipesRes, productsRes, priceHistoryRes] = await Promise.all([
          locationsApi.list(),
          ordersApi.list({
            start_date: thirtyDaysAgo,
            end_date: today.toISOString().split("T")[0],
          }),
          ordersApi.list({
            start_date: lastWeekSameDay.toISOString().split("T")[0],
            end_date: lastWeekSameDay.toISOString().split("T")[0],
          }),
          inventoryApi.list(),
          haccp.checklists.today().catch(() => null),
          suppliersApi.list(),
          deliveriesApi.list(),
          recipesApi.list(),
          productsApi.list(),
          priceHistoryApi.list({ start_date: thirtyDaysAgo }),
        ])

        // Map locations
        setLocations(locationsRes.map(mapLocationToUI))

        // Process orders for revenue data
        const ordersByDate: Record<string, { revenue: number; costs: number }> = {}
        const ordersByLocation: Record<string, { revenue: number; covers: number }> = {}

        for (const order of ordersRes) {
          const date = order.date
          if (!ordersByDate[date]) {
            ordersByDate[date] = { revenue: 0, costs: 0 }
          }
          ordersByDate[date].revenue += order.total
          ordersByDate[date].costs += order.total * 0.3 // Estimate 30% costs

          const locId = order.location_id ? String(order.location_id) : "unknown"
          if (!ordersByLocation[locId]) {
            ordersByLocation[locId] = { revenue: 0, covers: 0 }
          }
          ordersByLocation[locId].revenue += order.total
          ordersByLocation[locId].covers += 1
        }

        const revenueChartData = Object.entries(ordersByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            revenue: data.revenue,
            costs: data.costs,
            profit: data.revenue - data.costs,
          }))
        setRevenueData(revenueChartData)

        // Location comparisons
        const comparisons = locationsRes.map((loc) => {
          const data = ordersByLocation[String(loc.id)] || { revenue: 0, covers: 0 }
          return {
            location: loc.name,
            revenue: data.revenue,
            covers: data.covers,
            foodCost: 30, // Estimate
            avgTicket: data.covers > 0 ? data.revenue / data.covers : 0,
          }
        })
        setLocationComparisons(comparisons)

        // Calculate KPIs with real comparisons
        const todayStr = today.toISOString().split("T")[0]
        const lastWeekStr = lastWeekSameDay.toISOString().split("T")[0]

        // Today's data
        const todayOrders = ordersRes.filter((o) => o.date === todayStr)
        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
        const todayCovers = todayOrders.length

        // Last week same day data
        const lastWeekRevenue = lastWeekOrdersRes.reduce((sum, o) => sum + o.total, 0)
        const lastWeekCovers = lastWeekOrdersRes.length

        // Calculate change percentages
        const revenueChange = lastWeekRevenue > 0
          ? ((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
          : 0
        const coversChange = lastWeekCovers > 0
          ? ((todayCovers - lastWeekCovers) / lastWeekCovers) * 100
          : 0

        // Calculate avg ticket
        const totalRevenue = ordersRes.reduce((sum, o) => sum + o.total, 0)
        const avgTicket = ordersRes.length > 0 ? totalRevenue / ordersRes.length : 0
        const lastWeekAvgTicket = lastWeekCovers > 0 ? lastWeekRevenue / lastWeekCovers : 0
        const avgTicketChange = lastWeekAvgTicket > 0
          ? ((avgTicket - lastWeekAvgTicket) / lastWeekAvgTicket) * 100
          : 0

        // Estimate food cost from costs data (revenue * 0.3 is estimated cost)
        const totalCosts = ordersRes.reduce((sum, o) => sum + o.total * 0.3, 0)
        const foodCostPercentage = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0
        const lastWeekCosts = lastWeekOrdersRes.reduce((sum, o) => sum + o.total * 0.3, 0)
        const lastWeekFoodCost = lastWeekRevenue > 0 ? (lastWeekCosts / lastWeekRevenue) * 100 : 0
        const foodCostChange = lastWeekFoodCost > 0
          ? ((foodCostPercentage - lastWeekFoodCost) / lastWeekFoodCost) * 100
          : 0

        // Helper to determine trend (0 = neutral)
        const getTrend = (change: number, invertGood = false): "up" | "down" | "neutral" => {
          if (change === 0) return "neutral"
          if (invertGood) return change < 0 ? "up" : "down" // For food cost, lower is better
          return change > 0 ? "up" : "down"
        }

        setKpis([
          {
            label: t.home.revenueToday,
            value: todayRevenue.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
            change: parseFloat(revenueChange.toFixed(1)),
            trend: getTrend(parseFloat(revenueChange.toFixed(1))),
            description: t.home.vsSameDay,
          },
          {
            label: t.home.covers,
            value: String(todayCovers),
            change: parseFloat(coversChange.toFixed(1)),
            trend: getTrend(parseFloat(coversChange.toFixed(1))),
            description: t.home.reservationsWalkin,
          },
          {
            label: t.home.foodCost,
            value: foodCostPercentage.toFixed(1),
            change: parseFloat(foodCostChange.toFixed(1)),
            trend: getTrend(parseFloat(foodCostChange.toFixed(1)), true), // Lower food cost is better
            description: t.home.target,
          },
          {
            label: t.home.avgTicket,
            value: avgTicket.toFixed(2),
            change: parseFloat(avgTicketChange.toFixed(1)),
            trend: getTrend(parseFloat(avgTicketChange.toFixed(1))),
            description: t.home.inclDrinks,
          },
        ])

        // === Secondary KPIs (Suppliers, Inventory, Recipes) ===
        const totalSuppliers = suppliersRes.items.length
        const suppliersWithAnomalies = suppliersRes.items.filter(s => s.open_anomalies > 0).length
        const avgPriceChange = totalSuppliers > 0
          ? suppliersRes.items.reduce((sum, s) => sum + s.price_change_pct, 0) / totalSuppliers
          : 0

        const lowStockCount = inventoryRes.filter(i => i.quantity <= i.min_stock).length
        const totalInventoryValue = inventoryRes.reduce((sum, i) => sum + i.quantity * i.product_unit_price, 0)

        const activeRecipes = recipesRes.filter(r => r.is_active)
        const avgMargin = activeRecipes.length > 0
          ? activeRecipes.reduce((sum, r) => sum + r.margin, 0) / activeRecipes.length
          : 0

        const pendingDeliveries = deliveriesRes.filter(d => d.status === "pending").length
        const lateDeliveries = deliveriesRes.filter(d => d.status === "late").length

        setSecondaryKpis([
          {
            label: t.home.lowStock || "Low Stock Items",
            value: String(lowStockCount),
            trend: lowStockCount > 5 ? "down" : lowStockCount > 0 ? "neutral" : "up",
            description: t.home.itemsBelowMin || "Items below minimum",
          },
          {
            label: t.home.supplierAnomalies || "Supplier Issues",
            value: String(suppliersWithAnomalies),
            trend: suppliersWithAnomalies > 0 ? "down" : "up",
            description: t.home.openAnomalies || "Open anomalies",
          },
          {
            label: t.home.avgMargin || "Avg Margin",
            value: avgMargin.toFixed(1),
            change: avgPriceChange ? parseFloat((-avgPriceChange).toFixed(1)) : undefined,
            trend: avgMargin >= 60 ? "up" : avgMargin >= 40 ? "neutral" : "down",
            description: t.home.acrossRecipes || "Across active recipes",
          },
          {
            label: t.home.pendingDeliveries || "Pending Deliveries",
            value: String(pendingDeliveries),
            trend: lateDeliveries > 0 ? "down" : "neutral",
            description: lateDeliveries > 0 ? `${lateDeliveries} late` : t.home.onTrack || "On track",
          },
        ])

        // === Top Dishes by Margin ===
        const topByMargin = [...recipesRes]
          .filter(r => r.is_active && r.margin > 0)
          .sort((a, b) => b.margin - a.margin)
          .slice(0, 5)
          .map(r => ({ name: r.name, category: r.category, margin: r.margin, sales: r.sales_per_week }))
        setTopDishes(topByMargin)

        // === Supplier Issues ===
        const suppliersWithIssues = suppliersRes.items
          .filter(s => s.open_anomalies > 0 || s.price_change_pct > 5)
          .sort((a, b) => b.open_anomalies - a.open_anomalies)
          .slice(0, 5)
          .map(s => ({ name: s.name, anomalies: s.open_anomalies, priceChange: s.price_change_pct }))
        setSupplierIssues(suppliersWithIssues)

        // === Recent Deliveries ===
        const supplierMap = new Map(suppliersRes.items.map(s => [s.id, s.name]))
        const recentDels = [...deliveriesRes]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map(d => ({
            supplier: supplierMap.get(d.supplier_id) || `Supplier #${d.supplier_id}`,
            status: d.status,
            date: d.date,
          }))
        setRecentDeliveries(recentDels)

        // === Price Changes ===
        const productMap = new Map(productsRes.map(p => [p.id, p.name]))
        const pricesByProduct: Record<number, number[]> = {}
        for (const ph of priceHistoryRes) {
          if (!pricesByProduct[ph.product_id]) pricesByProduct[ph.product_id] = []
          pricesByProduct[ph.product_id].push(ph.price)
        }
        const changes: { product: string; change: number }[] = []
        for (const [pid, prices] of Object.entries(pricesByProduct)) {
          if (prices.length >= 2) {
            const oldest = prices[0]
            const newest = prices[prices.length - 1]
            if (oldest > 0) {
              const changePct = ((newest - oldest) / oldest) * 100
              if (Math.abs(changePct) > 3) {
                changes.push({ product: productMap.get(Number(pid)) || `Product #${pid}`, change: Math.round(changePct * 10) / 10 })
              }
            }
          }
        }
        setPriceChanges(changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5))

        // Process HACCP status
        if (haccpTodayRes) {
          const failedItems = haccpTodayRes.items.filter((i) => i.passed === false)
          setHaccpStatus({
            date: haccpTodayRes.date,
            completedChecks: haccpTodayRes.items.length,
            totalChecks: haccpTodayRes.items.length, // Would need templates count
            status: haccpTodayRes.status === "passed" ? "pass" : haccpTodayRes.status === "failed" ? "fail" : "partial",
            issues: failedItems.map((i) => i.name),
          })
        } else {
          setHaccpStatus({
            date: new Date().toISOString().split("T")[0],
            completedChecks: 0,
            totalChecks: 0,
            status: "partial",
            issues: [],
          })
        }

        // Process alerts from inventory
        const stockAlerts: Alert[] = inventoryRes
          .filter((item) => {
            const level = getStockLevel(item.quantity, item.min_stock)
            return level === "critical" || level === "low"
          })
          .map((item) => {
            const level = getStockLevel(item.quantity, item.min_stock)
            return {
              id: `inv-${item.id}`,
              title: `${level === "critical" ? t.home.alerts.criticalStock : t.home.alerts.lowStock}: ${item.product_name}`,
              description: `${item.quantity} ${item.product_unit} remaining`,
              severity: level === "critical" ? "critical" : "warning",
              timestamp: item.updated_at,
              category: "stock" as const,
            }
          })

        // Add HACCP alerts
        if (haccpTodayRes) {
          const failedItems = haccpTodayRes.items.filter((i) => i.passed === false)
          for (const item of failedItems) {
            stockAlerts.push({
              id: `haccp-${item.id}`,
              title: `HACCP: ${item.name}`,
              description: `Value: ${item.value}`,
              severity: "critical",
              timestamp: haccpTodayRes.created_at,
              category: "haccp",
            })
          }
        }

        setAlerts(stockAlerts.slice(0, 5))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [t])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageHeader
        title={t.home.title}
        description={t.home.description}
        actions={
          <LocationSelector
            locations={locations}
            value={selectedLocation}
            onChange={setSelectedLocation}
          />
        }
      />

      <KPIGrid kpis={kpis} />

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {secondaryKpis.map((kpi, idx) => (
          <KPICard
            key={`secondary-${idx}`}
            kpi={kpi}
            suffix={idx === 2 ? "%" : undefined}
          />
        ))}
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <AlertPanel
          alerts={alerts}
          title={t.home.alerts.title}
          description={t.home.alerts.description}
        />
        {haccpStatus && (
          <HACCPWidget
            date={haccpStatus.date}
            completedChecks={haccpStatus.completedChecks}
            totalChecks={haccpStatus.totalChecks}
            status={haccpStatus.status}
            issues={haccpStatus.issues}
          />
        )}
      </div>

      {revenueData.length > 0 && (
        <div className="px-4 lg:px-6">
          <RevenueChart
            data={revenueData}
            title={t.home.chart.title}
            description={t.home.chart.description}
          />
        </div>
      )}

      {locationComparisons.length > 0 && (
        <div className="px-4 lg:px-6">
          <LocationComparisonChart
            data={locationComparisons}
            title={t.home.locationComparison.title}
            description={t.home.locationComparison.description}
          />
        </div>
      )}

      {/* Operational Insights Grid */}
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Top Margin Dishes */}
        {topDishes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ChefHatIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">{t.home.topDishes || "Top Margin Dishes"}</CardTitle>
              </div>
              <CardDescription>{t.home.topDishesDesc || "Best performing recipes by margin"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topDishes.map((dish, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{dish.name}</p>
                    <p className="text-xs text-muted-foreground">{dish.category || "General"} · {dish.sales}/wk</p>
                  </div>
                  <Badge variant="outline" className={dish.margin >= 60 ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400" : ""}>
                    {dish.margin.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Supplier Issues */}
        {supplierIssues.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TruckIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">{t.home.supplierIssuesTitle || "Supplier Alerts"}</CardTitle>
              </div>
              <CardDescription>{t.home.supplierIssuesDesc || "Suppliers needing attention"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {supplierIssues.map((sup, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{sup.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sup.anomalies > 0 && `${sup.anomalies} anomalies`}
                      {sup.anomalies > 0 && sup.priceChange > 5 && " · "}
                      {sup.priceChange > 5 && `+${sup.priceChange.toFixed(1)}% prices`}
                    </p>
                  </div>
                  {sup.anomalies > 0 && (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                      {sup.anomalies} issues
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Deliveries */}
        {recentDeliveries.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PackageIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">{t.home.recentDeliveries || "Recent Deliveries"}</CardTitle>
              </div>
              <CardDescription>{t.home.recentDeliveriesDesc || "Latest delivery status"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDeliveries.map((del, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{del.supplier}</p>
                    <p className="text-xs text-muted-foreground">{del.date}</p>
                  </div>
                  <Badge variant="outline" className={
                    del.status === "on_time" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400" :
                    del.status === "late" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400" :
                    del.status === "partial" ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400" :
                    ""
                  }>
                    {del.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Price Changes */}
        {priceChanges.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">{t.home.priceChanges || "Price Changes"}</CardTitle>
              </div>
              <CardDescription>{t.home.priceChangesDesc || "Significant price movements (30d)"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {priceChanges.map((pc, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <p className="font-medium text-sm">{pc.product}</p>
                  <Badge variant="outline" className={
                    pc.change > 0
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                      : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                  }>
                    {pc.change > 0 ? "+" : ""}{pc.change}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
