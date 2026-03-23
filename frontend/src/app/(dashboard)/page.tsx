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
    status: "complete" | "partial" | "incomplete"
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
        const [locationsRes, ordersRes, inventoryRes, haccpTodayRes] = await Promise.all([
          locationsApi.list(),
          ordersApi.list({
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
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

        // Calculate KPIs
        const today = new Date().toISOString().split("T")[0]
        const todayOrders = ordersRes.filter((o) => o.date === today)
        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
        const todayCovers = todayOrders.length
        const totalRevenue = ordersRes.reduce((sum, o) => sum + o.total, 0)
        const avgTicket = ordersRes.length > 0 ? totalRevenue / ordersRes.length : 0

        setKpis([
          {
            label: t.home.revenueToday,
            value: todayRevenue.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
            change: 12.5,
            trend: "up" as const,
            description: t.home.vsSameDay,
          },
          {
            label: t.home.covers,
            value: String(todayCovers),
            change: 8.2,
            trend: "up" as const,
            description: t.home.reservationsWalkin,
          },
          {
            label: t.home.foodCost,
            value: "28.5",
            change: -2.1,
            trend: "down" as const,
            description: t.home.target,
          },
          {
            label: t.home.avgTicket,
            value: avgTicket.toFixed(2),
            change: 4.3,
            trend: "up" as const,
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
            status: haccpTodayRes.status === "passed" ? "complete" : haccpTodayRes.status === "failed" ? "incomplete" : "partial",
            issues: failedItems.map((i) => i.name),
          })
        } else {
          setHaccpStatus({
            date: new Date().toISOString().split("T")[0],
            completedChecks: 0,
            totalChecks: 0,
            status: "incomplete",
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
