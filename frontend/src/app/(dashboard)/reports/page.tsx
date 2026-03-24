"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
} from "recharts"

import { PageHeader } from "@/components/page-header"
import { KPICard } from "@/components/kpi-card"
import type { KPI } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslations, useI18n } from "@/lib/i18n"
import {
  orders as ordersApi,
  inventory as inventoryApi,
  recipes as recipesApi,
  suppliers as suppliersApi,
  deliveries as deliveriesApi,
  products as productsApi,
  priceHistory as priceHistoryApi,
} from "@/lib/api"
import { formatEUR } from "@/types"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  Loader2Icon,
  AlertTriangleIcon,
  ChefHatIcon,
  TruckIcon,
  PackageIcon,
} from "lucide-react"

interface TopDish {
  id: number
  name: string
  category: string | null
  revenue: number
  quantity: number
  margin: number
  cost: number
  price: number
}

interface SupplierPerf {
  id: number
  name: string
  onTimeRate: number
  lateCount: number
  totalDeliveries: number
  priceChange: number
}

interface SlowMover {
  id: number
  name: string
  quantity: number
  unit: string | null
  minStock: number
  daysOverstock: number
  value: number
}

interface PriceChange {
  productId: number
  productName: string
  oldPrice: number
  newPrice: number
  changePct: number
  date: string
}

export default function ReportsPage() {
  const t = useTranslations()
  const { locale } = useI18n()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Data state
  const [revenueData, setRevenueData] = React.useState<{ date: string; revenue: number; orders: number }[]>([])
  const [topDishes, setTopDishes] = React.useState<TopDish[]>([])
  const [worstMarginDishes, setWorstMarginDishes] = React.useState<TopDish[]>([])
  const [supplierPerf, setSupplierPerf] = React.useState<SupplierPerf[]>([])
  const [slowMovers, setSlowMovers] = React.useState<SlowMover[]>([])
  const [priceChanges, setPriceChanges] = React.useState<PriceChange[]>([])

  // KPI state
  const [kpis, setKpis] = React.useState({
    revenue30d: 0,
    revenueChange: 0,
    avgTicket: 0,
    ticketChange: 0,
    avgFoodCost: 0,
    totalOrders: 0,
    ordersChange: 0,
    lowStockItems: 0,
  })

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const now = new Date()
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sixtyDaysAgo = new Date(now)
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        const ninetyDaysAgo = new Date(now)
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const [ordersRes, recipesRes, inventoryRes, suppliersRes, deliveriesRes, productsRes, priceHistoryRes] = await Promise.all([
          ordersApi.list({ start_date: ninetyDaysAgo.toISOString().split("T")[0], end_date: now.toISOString().split("T")[0] }),
          recipesApi.list(),
          inventoryApi.list(),
          suppliersApi.list(),
          deliveriesApi.list(),
          productsApi.list(),
          priceHistoryApi.list({ start_date: sixtyDaysAgo.toISOString().split("T")[0] }),
        ])

        // Build recipe lookup
        const recipeMap = new Map(recipesRes.map(r => [r.id, r]))

        // === Revenue by day (last 30 days) ===
        const revenueByDay: Record<string, { revenue: number; orders: number }> = {}
        const last30Orders = ordersRes.filter(o => new Date(o.date) >= thirtyDaysAgo)
        const prev30Orders = ordersRes.filter(o => {
          const d = new Date(o.date)
          return d >= sixtyDaysAgo && d < thirtyDaysAgo
        })

        for (const order of last30Orders) {
          const day = order.date.substring(0, 10)
          if (!revenueByDay[day]) revenueByDay[day] = { revenue: 0, orders: 0 }
          revenueByDay[day].revenue += order.total
          revenueByDay[day].orders += 1
        }

        const chartData = Object.entries(revenueByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({ date, ...data }))
        setRevenueData(chartData)

        // === KPIs ===
        const revenue30d = last30Orders.reduce((sum, o) => sum + o.total, 0)
        const revenuePrev30d = prev30Orders.reduce((sum, o) => sum + o.total, 0)
        const revenueChange = revenuePrev30d > 0 ? ((revenue30d - revenuePrev30d) / revenuePrev30d) * 100 : 0

        const totalOrders30d = last30Orders.length
        const totalOrdersPrev30d = prev30Orders.length
        const ordersChange = totalOrdersPrev30d > 0 ? ((totalOrders30d - totalOrdersPrev30d) / totalOrdersPrev30d) * 100 : 0

        const avgTicket = totalOrders30d > 0 ? revenue30d / totalOrders30d : 0
        const avgTicketPrev = totalOrdersPrev30d > 0 ? revenuePrev30d / totalOrdersPrev30d : 0
        const ticketChange = avgTicketPrev > 0 ? ((avgTicket - avgTicketPrev) / avgTicketPrev) * 100 : 0

        // Avg food cost from recipes
        const recipesWithMargin = recipesRes.filter(r => r.price > 0 && r.cost > 0)
        const avgFoodCost = recipesWithMargin.length > 0
          ? recipesWithMargin.reduce((sum, r) => sum + (r.cost / r.price) * 100, 0) / recipesWithMargin.length
          : 0

        const lowStockItems = inventoryRes.filter(i => i.quantity <= i.min_stock).length

        setKpis({
          revenue30d,
          revenueChange: Math.round(revenueChange * 10) / 10,
          avgTicket: Math.round(avgTicket * 100) / 100,
          ticketChange: Math.round(ticketChange * 10) / 10,
          avgFoodCost: Math.round(avgFoodCost * 10) / 10,
          totalOrders: totalOrders30d,
          ordersChange: Math.round(ordersChange * 10) / 10,
          lowStockItems,
        })

        // === Top Dishes by Revenue ===
        const dishSales: Record<number, { quantity: number; revenue: number }> = {}
        for (const order of last30Orders) {
          for (const item of order.items) {
            if (!dishSales[item.recipe_id]) dishSales[item.recipe_id] = { quantity: 0, revenue: 0 }
            dishSales[item.recipe_id].quantity += item.quantity
            dishSales[item.recipe_id].revenue += item.quantity * item.unit_price
          }
        }

        const topDishesArr: TopDish[] = Object.entries(dishSales)
          .map(([id, data]) => {
            const recipe = recipeMap.get(Number(id))
            return {
              id: Number(id),
              name: recipe?.name || `Recipe #${id}`,
              category: recipe?.category || null,
              revenue: data.revenue,
              quantity: data.quantity,
              margin: recipe?.margin || 0,
              cost: recipe?.cost || 0,
              price: recipe?.price || 0,
            }
          })
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
        setTopDishes(topDishesArr)

        // === Worst Margin Dishes (candidates for repricing) ===
        const worstMargin = recipesRes
          .filter(r => r.price > 0 && r.cost > 0 && r.sales_per_week > 0)
          .map(r => ({
            id: r.id,
            name: r.name,
            category: r.category,
            revenue: 0,
            quantity: r.sales_per_week,
            margin: r.margin,
            cost: r.cost,
            price: r.price,
          }))
          .sort((a, b) => a.margin - b.margin)
          .slice(0, 5)
        setWorstMarginDishes(worstMargin)

        // === Supplier Performance ===
        const supplierDeliveries: Record<number, { onTime: number; late: number; total: number }> = {}
        for (const d of deliveriesRes) {
          if (!supplierDeliveries[d.supplier_id]) {
            supplierDeliveries[d.supplier_id] = { onTime: 0, late: 0, total: 0 }
          }
          supplierDeliveries[d.supplier_id].total += 1
          if (d.status === "on_time") supplierDeliveries[d.supplier_id].onTime += 1
          if (d.status === "late" || d.status === "partial") supplierDeliveries[d.supplier_id].late += 1
        }

        const supplierPerfArr: SupplierPerf[] = suppliersRes.items
          .map(s => {
            const stats = supplierDeliveries[s.id] || { onTime: 0, late: 0, total: 0 }
            return {
              id: s.id,
              name: s.name,
              onTimeRate: stats.total > 0 ? (stats.onTime / stats.total) * 100 : 100,
              lateCount: stats.late,
              totalDeliveries: stats.total,
              priceChange: s.price_change_pct,
            }
          })
          .filter(s => s.totalDeliveries > 0)
          .sort((a, b) => a.onTimeRate - b.onTimeRate)
          .slice(0, 5)
        setSupplierPerf(supplierPerfArr)

        // === Slow Movers (excess inventory) ===
        const slowMoversArr: SlowMover[] = inventoryRes
          .filter(i => i.quantity > i.min_stock * 2)
          .map(i => ({
            id: i.id,
            name: i.product_name,
            quantity: i.quantity,
            unit: i.product_unit,
            minStock: i.min_stock,
            daysOverstock: Math.round((i.quantity - i.min_stock) / Math.max(i.min_stock / 7, 1)),
            value: i.quantity * i.product_unit_price,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
        setSlowMovers(slowMoversArr)

        // === Price Changes (biggest increases) ===
        const productMap = new Map(productsRes.map(p => [p.id, p]))
        const pricesByProduct: Record<number, { prices: { date: string; price: number }[] }> = {}

        for (const record of priceHistoryRes) {
          if (!pricesByProduct[record.product_id]) {
            pricesByProduct[record.product_id] = { prices: [] }
          }
          pricesByProduct[record.product_id].prices.push({
            date: record.recorded_at,
            price: record.price,
          })
        }

        const priceChangesArr: PriceChange[] = []
        for (const [productId, data] of Object.entries(pricesByProduct)) {
          const sorted = data.prices.sort((a, b) => a.date.localeCompare(b.date))
          if (sorted.length >= 2) {
            const oldPrice = sorted[0].price
            const newPrice = sorted[sorted.length - 1].price
            const changePct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0
            const product = productMap.get(Number(productId))
            if (Math.abs(changePct) > 1) {
              priceChangesArr.push({
                productId: Number(productId),
                productName: product?.name || `Product #${productId}`,
                oldPrice,
                newPrice,
                changePct,
                date: sorted[sorted.length - 1].date.substring(0, 10),
              })
            }
          }
        }
        setPriceChanges(priceChangesArr.sort((a, b) => b.changePct - a.changePct).slice(0, 5))

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const revenueChartConfig = {
    revenue: { label: t.home.chart.revenue, color: "var(--chart-1)" },
  } satisfies ChartConfig

  const kpiCards: KPI[] = [
    {
      label: t.reports.revenueYTD.replace("YTD", "30D"),
      value: formatEUR(kpis.revenue30d),
      change: kpis.revenueChange,
      trend: kpis.revenueChange > 0 ? "up" : kpis.revenueChange < 0 ? "down" : "neutral",
    },
    {
      label: t.home.avgTicket,
      value: formatEUR(kpis.avgTicket),
      change: kpis.ticketChange,
      trend: kpis.ticketChange > 0 ? "up" : kpis.ticketChange < 0 ? "down" : "neutral",
    },
    {
      label: t.reports.avgFoodCost,
      value: `${kpis.avgFoodCost}%`,
      trend: kpis.avgFoodCost > 35 ? "down" : kpis.avgFoodCost < 25 ? "up" : "neutral",
    },
    {
      label: t.inventory.belowThreshold,
      value: String(kpis.lowStockItems),
      trend: kpis.lowStockItems > 0 ? "down" : "neutral",
    },
  ]

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
        title={t.reports.title}
        description={t.reports.description}
      />

      {/* KPIs */}
      <div className="grid gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Revenue Trend */}
      {revenueData.length > 0 && (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.reports.revenueProfitTrend.replace("Profit", "").replace("& ", "").trim()}</CardTitle>
              <CardDescription>{t.reports.last12Months.replace("12", "30").replace("months", "days")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueChartConfig} className="aspect-auto h-[250px] w-full">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const d = new Date(value)
                      return d.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { day: "numeric", month: "short" })
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => formatEUR(Number(v))} />}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Dishes & Worst Margins */}
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ChefHatIcon className="size-5 text-green-600" />
            <div>
              <CardTitle>Top Sellers</CardTitle>
              <CardDescription>Best performing dishes (30 days)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {topDishes.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dish</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topDishes.map((dish, i) => (
                      <TableRow key={dish.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <span className="font-medium">{dish.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{dish.quantity}</TableCell>
                        <TableCell className="text-right">{formatEUR(dish.revenue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={dish.margin >= 65 ? "default" : dish.margin >= 50 ? "secondary" : "destructive"}>
                            {dish.margin.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No sales data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangleIcon className="size-5 text-amber-500" />
            <div>
              <CardTitle>Low Margin Dishes</CardTitle>
              <CardDescription>Consider repricing or removing</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {worstMarginDishes.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dish</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worstMarginDishes.map((dish) => (
                      <TableRow key={dish.id}>
                        <TableCell className="font-medium">{dish.name}</TableCell>
                        <TableCell className="text-right">{formatEUR(dish.cost)}</TableCell>
                        <TableCell className="text-right">{formatEUR(dish.price)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{dish.margin.toFixed(0)}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">All dishes have good margins</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Performance & Price Changes */}
      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TruckIcon className="size-5 text-blue-600" />
            <div>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>Delivery reliability issues</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {supplierPerf.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">On-Time</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                      <TableHead className="text-right">Price Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPerf.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.onTimeRate >= 90 ? "default" : s.onTimeRate >= 70 ? "secondary" : "destructive"}>
                            {s.onTimeRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.lateCount}</TableCell>
                        <TableCell className="text-right">
                          <span className={s.priceChange > 5 ? "text-red-600" : s.priceChange < -5 ? "text-green-600" : ""}>
                            {s.priceChange >= 0 ? "+" : ""}{s.priceChange.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No delivery data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUpIcon className="size-5 text-red-500" />
            <div>
              <CardTitle>{t.reports.supplierInflation}</CardTitle>
              <CardDescription>Biggest price increases (60 days)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {priceChanges.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Was</TableHead>
                      <TableHead className="text-right">Now</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceChanges.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell className="font-medium">{p.productName}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatEUR(p.oldPrice)}</TableCell>
                        <TableCell className="text-right">{formatEUR(p.newPrice)}</TableCell>
                        <TableCell className="text-right">
                          <span className={p.changePct > 0 ? "text-red-600" : "text-green-600"}>
                            {p.changePct >= 0 ? "+" : ""}{p.changePct.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No price changes detected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow Movers */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <PackageIcon className="size-5 text-orange-500" />
            <div>
              <CardTitle>{t.reports.underused}</CardTitle>
              <CardDescription>Excess inventory tying up capital</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {slowMovers.length > 0 ? (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Min Stock</TableHead>
                        <TableHead className="text-right">Excess</TableHead>
                        <TableHead className="text-right">{t.reports.value}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slowMovers.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{item.minStock}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">+{Math.round(item.quantity - item.minStock)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatEUR(item.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  {t.reports.totalAtRisk}: <span className="font-medium">{formatEUR(slowMovers.reduce((sum, i) => sum + i.value, 0))}</span>
                </p>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">No excess inventory detected</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
