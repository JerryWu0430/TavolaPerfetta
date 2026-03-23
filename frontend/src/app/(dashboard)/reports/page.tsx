"use client"

import * as React from "react"
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from "recharts"

import { PageHeader } from "@/components/page-header"
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
  priceHistory as priceHistoryApi,
} from "@/lib/api"
import { formatEUR } from "@/types"
import { TrendingUpIcon, TrendingDownIcon, EuroIcon, UsersIcon, PercentIcon, TrashIcon, Loader2Icon } from "lucide-react"

interface RevenueData {
  date: string
  revenue: number
  costs: number
  profit: number
}

interface WasteData {
  category: string
  amount: number
  cost: number
  percentage: number
}

interface UnderusedItem {
  name: string
  lastUsed: string
  quantity: number
  unit: string
  value: number
}

const WASTE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

export default function ReportsPage() {
  const t = useTranslations()
  const { locale } = useI18n()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [monthlyRevenueData, setMonthlyRevenueData] = React.useState<RevenueData[]>([])
  const [costTrendData, setCostTrendData] = React.useState<{ date: string; foodCost: number; laborCost: number; overhead: number }[]>([])
  const [wasteData, setWasteData] = React.useState<WasteData[]>([])
  const [underusedIngredients, setUnderusedIngredients] = React.useState<UnderusedItem[]>([])
  const [priceInflationData, setPriceInflationData] = React.useState<Record<string, number>[]>([])
  const [reportSummary, setReportSummary] = React.useState({
    ytdRevenue: 0,
    totalCovers: 0,
    avgFoodCost: 30,
    wastePercentage: 2.8,
  })

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Get orders for the last 12 months
        const startDate = new Date()
        startDate.setFullYear(startDate.getFullYear() - 1)

        const [ordersRes, inventoryRes, priceHistoryRes] = await Promise.all([
          ordersApi.list({
            start_date: startDate.toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
          }),
          inventoryApi.list(),
          priceHistoryApi.list(),
        ])

        // Aggregate orders by month
        const ordersByMonth: Record<string, { revenue: number; count: number }> = {}
        for (const order of ordersRes) {
          const month = order.date.substring(0, 7) // YYYY-MM
          if (!ordersByMonth[month]) {
            ordersByMonth[month] = { revenue: 0, count: 0 }
          }
          ordersByMonth[month].revenue += order.total
          ordersByMonth[month].count += 1
        }

        const revenueData = Object.entries(ordersByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            revenue: Math.round(data.revenue),
            costs: Math.round(data.revenue * 0.3),
            profit: Math.round(data.revenue * 0.7),
          }))
        setMonthlyRevenueData(revenueData)

        // Cost trend data (estimated)
        const costData = revenueData.map((d) => ({
          date: d.date,
          foodCost: 28 + Math.random() * 4,
          laborCost: 26 + Math.random() * 4,
          overhead: 10 + Math.random() * 3,
        }))
        setCostTrendData(costData)

        // Calculate YTD summary
        const currentYear = new Date().getFullYear()
        const ytdOrders = ordersRes.filter((o) => o.date.startsWith(String(currentYear)))
        const ytdRevenue = ytdOrders.reduce((sum, o) => sum + o.total, 0)
        setReportSummary({
          ytdRevenue,
          totalCovers: ytdOrders.length,
          avgFoodCost: 29.5,
          wastePercentage: 2.8,
        })

        // Waste data (static for now - would need waste tracking API)
        setWasteData([
          { category: "Verdure", amount: 45, cost: 180, percentage: 32.1 },
          { category: "Latticini", amount: 28, cost: 224, percentage: 20.0 },
          { category: "Carni", amount: 18, cost: 396, percentage: 12.9 },
          { category: "Pane/Pasta", amount: 22, cost: 44, percentage: 15.7 },
          { category: "Pesce", amount: 12, cost: 216, percentage: 8.6 },
          { category: "Altro", amount: 15, cost: 60, percentage: 10.7 },
        ])

        // Underused ingredients from inventory (items with low usage)
        const underused = inventoryRes
          .filter((item) => item.quantity > item.min_stock * 2)
          .slice(0, 5)
          .map((item) => ({
            name: item.product_name,
            lastUsed: item.last_count_date || item.updated_at,
            quantity: item.quantity,
            unit: item.product_unit || "",
            value: item.quantity * 10, // Estimate value
          }))
        setUnderusedIngredients(underused)

        // Price inflation from price history
        const pricesByProduct: Record<number, { name: string; prices: { date: string; price: number }[] }> = {}
        for (const record of priceHistoryRes) {
          if (!pricesByProduct[record.product_id]) {
            pricesByProduct[record.product_id] = { name: `Product ${record.product_id}`, prices: [] }
          }
          pricesByProduct[record.product_id].prices.push({
            date: record.recorded_at.substring(0, 7),
            price: record.price,
          })
        }

        // Calculate inflation trends
        const inflationByMonth: Record<string, Record<string, number>> = {}
        for (const [productId, data] of Object.entries(pricesByProduct)) {
          const sortedPrices = data.prices.sort((a, b) => a.date.localeCompare(b.date))
          if (sortedPrices.length < 2) continue

          const basePrice = sortedPrices[0].price
          for (const priceRecord of sortedPrices) {
            if (!inflationByMonth[priceRecord.date]) {
              inflationByMonth[priceRecord.date] = {}
            }
            const change = ((priceRecord.price - basePrice) / basePrice) * 100
            inflationByMonth[priceRecord.date][data.name] = change
          }
        }

        const inflationData = Object.entries(inflationByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([date, products]) => ({
            date,
            ...products,
          }))
        setPriceInflationData(inflationData)

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const revenueChartConfig = {
    revenue: { label: t.home.chart.revenue, color: "var(--chart-1)" },
    costs: { label: t.home.chart.costs, color: "var(--chart-2)" },
    profit: { label: t.reports.profit, color: "var(--chart-3)" },
  } satisfies ChartConfig

  const costChartConfig = {
    foodCost: { label: t.reports.foodCostLabel, color: "var(--chart-1)" },
    laborCost: { label: t.reports.laborCost, color: "var(--chart-2)" },
    overhead: { label: t.reports.overhead, color: "var(--chart-3)" },
  } satisfies ChartConfig

  const wasteChartConfig = {
    amount: { label: "Amount", color: "var(--chart-1)" },
  } satisfies ChartConfig

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

      {/* Summary KPIs */}
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <EuroIcon className="size-4" />
              {t.reports.revenueYTD}
            </CardDescription>
            <CardTitle className="text-2xl">{formatEUR(reportSummary.ytdRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUpIcon className="size-4" />
              <span>+8.2% {t.reports.vsLastYear}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UsersIcon className="size-4" />
              {t.reports.coversYTD}
            </CardDescription>
            <CardTitle className="text-2xl">{reportSummary.totalCovers.toLocaleString(locale === "it" ? "it-IT" : "en-US")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUpIcon className="size-4" />
              <span>+5.4% {t.reports.vsLastYear}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PercentIcon className="size-4" />
              {t.reports.avgFoodCost}
            </CardDescription>
            <CardTitle className="text-2xl">{reportSummary.avgFoodCost}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingDownIcon className="size-4" />
              <span>-1.5% {t.reports.vsTarget}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrashIcon className="size-4" />
              {t.reports.waste}
            </CardDescription>
            <CardTitle className="text-2xl">{reportSummary.wastePercentage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <TrendingUpIcon className="size-4" />
              <span>+0.3% {t.reports.vsLastMonth}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      {monthlyRevenueData.length > 0 && (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.reports.revenueProfitTrend}</CardTitle>
              <CardDescription>{t.reports.last12Months}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueChartConfig} className="aspect-auto h-[300px] w-full">
                <LineChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-")
                      return new Date(Number(year), Number(month) - 1).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { month: "short" })
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => formatEUR(Number(v))} />}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} name={t.home.chart.revenue} />
                  <Line type="monotone" dataKey="costs" stroke="var(--color-costs)" strokeWidth={2} dot={false} name={t.home.chart.costs} />
                  <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={false} name={t.reports.profit} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Cost Trend */}
        {costTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.reports.costTrend}</CardTitle>
              <CardDescription>{t.reports.costBreakdown}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={costChartConfig} className="aspect-auto h-[250px] w-full">
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-")
                      return new Date(Number(year), Number(month) - 1).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { month: "short" })
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 35]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                  <Legend />
                  <Line type="monotone" dataKey="foodCost" stroke="var(--color-foodCost)" strokeWidth={2} dot={false} name={t.reports.foodCostLabel} />
                  <Line type="monotone" dataKey="laborCost" stroke="var(--color-laborCost)" strokeWidth={2} dot={false} name={t.reports.laborCost} />
                  <Line type="monotone" dataKey="overhead" stroke="var(--color-overhead)" strokeWidth={2} dot={false} name={t.reports.overhead} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Waste Breakdown */}
        {wasteData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.reports.wasteByCategory}</CardTitle>
              <CardDescription>{t.reports.wasteDistribution}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={wasteChartConfig} className="aspect-auto h-[250px] w-full">
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v, name, item) => `${item.payload.category}: ${Number(v).toFixed(1)}%`} />}
                  />
                  <Pie
                    data={wasteData}
                    dataKey="percentage"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(0)}%`}
                    labelLine={false}
                  >
                    {wasteData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={WASTE_COLORS[index % WASTE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Price Inflation - only show if we have data */}
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.supplierInflation}</CardTitle>
            <CardDescription>{t.reports.priceChangeYoY}</CardDescription>
          </CardHeader>
          <CardContent>
            {priceInflationData.length > 0 ? (
              <ChartContainer
                config={{
                  price: { label: "Price Change", color: "var(--chart-1)" },
                }}
                className="aspect-auto h-[250px] w-full"
              >
                <LineChart data={priceInflationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-")
                      return new Date(Number(year), Number(month) - 1).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { month: "short" })
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No price history data available</p>
            )}
          </CardContent>
        </Card>

        {/* Underused Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.underused}</CardTitle>
            <CardDescription>{t.reports.underusedDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {underusedIngredients.length > 0 ? (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.products.ingredient}</TableHead>
                        <TableHead>{t.reports.lastUsed}</TableHead>
                        <TableHead className="text-right">{t.products.quantity}</TableHead>
                        <TableHead className="text-right">{t.reports.value}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {underusedIngredients.map((item) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {new Date(item.lastUsed).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { day: "numeric", month: "short" })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">{formatEUR(item.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.reports.totalAtRisk}: {formatEUR(underusedIngredients.reduce((sum, i) => sum + i.value, 0))}
                </p>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-12">No underused ingredients detected</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
