"use client"

import * as React from "react"
import { PageHeader } from "@/components/page-header"
import { KPIGrid } from "@/components/kpi-card"
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
  type Location as APILocation,
  type Order,
  type InventoryItem,
  type HACCPChecklist,
} from "@/lib/api"
import type { KPI, Alert, RevenueData, Location, LocationComparison } from "@/types"
import { Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"

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

        const [locationsRes, ordersRes, lastWeekOrdersRes, inventoryRes, haccpTodayRes] = await Promise.all([
          locationsApi.list(),
          ordersApi.list({
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end_date: today.toISOString().split("T")[0],
          }),
          ordersApi.list({
            start_date: lastWeekSameDay.toISOString().split("T")[0],
            end_date: lastWeekSameDay.toISOString().split("T")[0],
          }),
          inventoryApi.list(),
          haccp.checklists.today().catch(() => null),
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
    </div>
  )
}
