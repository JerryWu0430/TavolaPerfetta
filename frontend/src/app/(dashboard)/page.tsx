"use client"

import * as React from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { KPIGrid } from "@/components/kpi-card"
import { AlertPanel } from "@/components/alert-panel"
import { HACCPWidget } from "@/components/haccp-widget"
import { LocationSelector } from "@/components/location-selector"
import { useTranslations } from "@/lib/i18n"
import {
  locations as locationsApi,
  orders as ordersApi,
  inventory as inventoryApi,
  haccp,
  suppliers as suppliersApi,
  deliveries as deliveriesApi,
  type Location as APILocation,
  type InventoryItem,
} from "@/lib/api"
import type { KPI, Alert, Location } from "@/types"
import {
  Loader2Icon,
  AlertTriangleIcon,
  PackageIcon,
  TruckIcon,
  ShoppingCartIcon,
  ClipboardCheckIcon,
  ArrowRightIcon,
  PhoneIcon,
} from "lucide-react"
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

interface RestockItem {
  id: number
  name: string
  quantity: number
  minStock: number
  unit: string | null
  supplierName: string | null
  level: "critical" | "low"
}

interface DeliveryToday {
  id: number
  supplierName: string
  status: string
  itemCount: number
}

export default function HomePage() {
  const t = useTranslations()
  const [selectedLocation, setSelectedLocation] = React.useState("all")
  const [locations, setLocations] = React.useState<Location[]>([])
  const [haccpStatus, setHaccpStatus] = React.useState<{
    date: string
    completedChecks: number
    totalChecks: number
    status: "pass" | "fail" | "partial"
    issues: string[]
  } | null>(null)
  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [kpis, setKpis] = React.useState<KPI[]>([])
  const [restockItems, setRestockItems] = React.useState<RestockItem[]>([])
  const [deliveriesToday, setDeliveriesToday] = React.useState<DeliveryToday[]>([])
  const [pendingDeliveryCount, setPendingDeliveryCount] = React.useState(0)
  const [lateDeliveryCount, setLateDeliveryCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const today = new Date()
        const todayStr = today.toISOString().split("T")[0]
        const lastWeekSameDay = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        const [locationsRes, ordersRes, lastWeekOrdersRes, inventoryRes, haccpTodayRes, suppliersRes, deliveriesRes] = await Promise.all([
          locationsApi.list(),
          ordersApi.list({ start_date: sevenDaysAgo, end_date: todayStr }),
          ordersApi.list({
            start_date: lastWeekSameDay.toISOString().split("T")[0],
            end_date: lastWeekSameDay.toISOString().split("T")[0],
          }),
          inventoryApi.list(),
          haccp.checklists.today().catch(() => null),
          suppliersApi.list(),
          deliveriesApi.list(),
        ])

        setLocations(locationsRes.map(mapLocationToUI))

        // === TODAY's KPIs ===
        const todayOrders = ordersRes.filter((o) => o.date === todayStr)
        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
        const todayOrderCount = todayOrders.length

        const lastWeekRevenue = lastWeekOrdersRes.reduce((sum, o) => sum + o.total, 0)
        const lastWeekOrderCount = lastWeekOrdersRes.length

        const revenueChange = lastWeekRevenue > 0
          ? ((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
          : 0
        const orderChange = lastWeekOrderCount > 0
          ? ((todayOrderCount - lastWeekOrderCount) / lastWeekOrderCount) * 100
          : 0

        // Count critical issues
        const criticalStockCount = inventoryRes.filter(i => i.quantity <= i.min_stock * 0.5).length
        const lowStockCount = inventoryRes.filter(i => i.quantity <= i.min_stock).length
        const haccpIssues = haccpTodayRes?.items.filter(i => i.passed === false).length || 0
        const lateDeliveries = deliveriesRes.filter(d => d.status === "late").length
        const totalAlerts = criticalStockCount + haccpIssues + lateDeliveries

        // Simple KPIs - clean design without trend badges
        setKpis([
          {
            label: t.home.revenueToday,
            value: `€${todayRevenue.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          },
          {
            label: t.home.ordersToday || "Orders Today",
            value: String(todayOrderCount),
          },
          {
            label: t.home.lowStockItems || "Low Stock",
            value: String(lowStockCount),
          },
          {
            label: t.home.activeAlerts || "Active Alerts",
            value: String(totalAlerts),
          },
        ])

        // === RESTOCK NOW ===
        const supplierMap = new Map(suppliersRes.items.map(s => [s.id, s]))
        const productSupplierMap = new Map<number, string>()
        // Build product -> supplier mapping from inventory
        for (const item of inventoryRes) {
          if (item.supplier_name) {
            productSupplierMap.set(item.product_id, item.supplier_name)
          }
        }

        const restock: RestockItem[] = inventoryRes
          .filter(i => i.quantity <= i.min_stock)
          .map(i => ({
            id: i.id,
            name: i.product_name,
            quantity: i.quantity,
            minStock: i.min_stock,
            unit: i.product_unit,
            supplierName: i.supplier_name,
            level: i.quantity <= i.min_stock * 0.5 ? "critical" as const : "low" as const,
          }))
          .sort((a, b) => {
            if (a.level === "critical" && b.level !== "critical") return -1
            if (a.level !== "critical" && b.level === "critical") return 1
            return (a.quantity / a.minStock) - (b.quantity / b.minStock)
          })
          .slice(0, 8)
        setRestockItems(restock)

        // === DELIVERIES TODAY ===
        const todayDeliveries = deliveriesRes.filter(d => d.date === todayStr)
        const delToday: DeliveryToday[] = todayDeliveries.map(d => ({
          id: d.id,
          supplierName: suppliersRes.items.find(s => s.id === d.supplier_id)?.name || `Supplier #${d.supplier_id}`,
          status: d.status,
          itemCount: d.items.length,
        }))
        setDeliveriesToday(delToday)

        // Pending & Late counts
        setPendingDeliveryCount(deliveriesRes.filter(d => d.status === "pending").length)
        setLateDeliveryCount(deliveriesRes.filter(d => d.status === "late").length)

        // === HACCP STATUS ===
        if (haccpTodayRes) {
          const failedItems = haccpTodayRes.items.filter((i) => i.passed === false)
          setHaccpStatus({
            date: haccpTodayRes.date,
            completedChecks: haccpTodayRes.items.length,
            totalChecks: haccpTodayRes.items.length,
            status: haccpTodayRes.status === "passed" ? "pass" : haccpTodayRes.status === "failed" ? "fail" : "partial",
            issues: failedItems.map((i) => i.name),
          })
        } else {
          setHaccpStatus({
            date: todayStr,
            completedChecks: 0,
            totalChecks: 0,
            status: "partial",
            issues: [],
          })
        }

        // === ALERTS (actionable items) ===
        const alertList: Alert[] = []

        // Critical stock alerts
        inventoryRes
          .filter(i => getStockLevel(i.quantity, i.min_stock) === "critical")
          .slice(0, 3)
          .forEach(item => {
            alertList.push({
              id: `inv-${item.id}`,
              title: `${t.home.alerts.criticalStock}: ${item.product_name}`,
              description: `${item.quantity} ${item.product_unit} left (min: ${item.min_stock})`,
              severity: "critical",
              timestamp: item.updated_at,
              category: "stock",
            })
          })

        // HACCP failures
        if (haccpTodayRes) {
          haccpTodayRes.items.filter(i => i.passed === false).slice(0, 2).forEach(item => {
            alertList.push({
              id: `haccp-${item.id}`,
              title: `HACCP Failed: ${item.name}`,
              description: `Value: ${item.value}`,
              severity: "critical",
              timestamp: haccpTodayRes.created_at,
              category: "haccp",
            })
          })
        }

        // Late deliveries
        deliveriesRes.filter(d => d.status === "late").slice(0, 2).forEach(d => {
          const supplier = suppliersRes.items.find(s => s.id === d.supplier_id)
          alertList.push({
            id: `del-${d.id}`,
            title: `${t.home.alerts.supplierDelay || "Late Delivery"}: ${supplier?.name || "Unknown"}`,
            description: `Expected: ${d.date}`,
            severity: "warning",
            timestamp: d.created_at,
            category: "supplier",
          })
        })

        setAlerts(alertList.slice(0, 5))

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

      {/* Today's Pulse - Simple KPI cards */}
      <KPIGrid kpis={kpis} simple />

      {/* Alerts + HACCP */}
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

      {/* Action Cards */}
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Restock Now */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="size-4 text-red-500" />
                <CardTitle className="text-base">{t.home.restockNow || "Restock Now"}</CardTitle>
              </div>
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="text-xs">
                  {t.home.viewAll || "View All"} <ArrowRightIcon className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>{t.home.restockDesc || "Items below minimum stock level"}</CardDescription>
          </CardHeader>
          <CardContent>
            {restockItems.length > 0 ? (
              <div className="space-y-2">
                {restockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={item.level === "critical"
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                            : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
                          }
                        >
                          {item.level === "critical" ? "Critical" : "Low"}
                        </Badge>
                        <span className="font-medium text-sm truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {item.quantity}/{item.minStock} {item.unit}
                        </span>
                        {item.supplierName && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground truncate">{item.supplierName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PackageIcon className="size-8 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">{t.home.stockOk || "All stock levels OK"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliveries */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="size-4 text-blue-500" />
                <CardTitle className="text-base">{t.home.deliveries || "Deliveries"}</CardTitle>
              </div>
              <Link href="/suppliers">
                <Button variant="ghost" size="sm" className="text-xs">
                  {t.home.viewAll || "View All"} <ArrowRightIcon className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              {pendingDeliveryCount > 0 || lateDeliveryCount > 0
                ? `${pendingDeliveryCount} pending${lateDeliveryCount > 0 ? `, ${lateDeliveryCount} late` : ""}`
                : t.home.noDeliveries || "No pending deliveries"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deliveriesToday.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t.home.expectedToday || "Expected Today"}
                </p>
                {deliveriesToday.map((del) => (
                  <div key={del.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{del.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{del.itemCount} items</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        del.status === "on_time" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400" :
                        del.status === "late" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400" :
                        del.status === "partial" ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400" :
                        ""
                      }
                    >
                      {del.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TruckIcon className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t.home.noDeliveriesToday || "No deliveries expected today"}</p>
              </div>
            )}

            {lateDeliveryCount > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    {lateDeliveryCount} {t.home.lateDeliveries || "late deliveries"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.home.quickActions || "Quick Actions"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 @lg:grid-cols-4 gap-3">
              <Link href="/haccp">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <ClipboardCheckIcon className="size-5" />
                  <span className="text-xs">{t.home.startHaccp || "HACCP Check"}</span>
                </Button>
              </Link>
              <Link href="/bolla">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <PackageIcon className="size-5" />
                  <span className="text-xs">{t.home.addInvoice || "Add Invoice"}</span>
                </Button>
              </Link>
              <Link href="/inventory">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <ShoppingCartIcon className="size-5" />
                  <span className="text-xs">{t.home.inventory || "Inventory"}</span>
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <AlertTriangleIcon className="size-5" />
                  <span className="text-xs">{t.home.reports || "Reports"}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
