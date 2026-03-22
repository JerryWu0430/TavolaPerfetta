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
  monthlyRevenueData,
  wasteData,
  underusedIngredients,
  costTrendData,
  reportSummary,
} from "@/data/mock/reports"
import { inflationData } from "@/data/mock/suppliers"
import { formatEUR } from "@/types"
import { TrendingUpIcon, TrendingDownIcon, EuroIcon, UsersIcon, PercentIcon, TrashIcon } from "lucide-react"

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

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Cost Trend */}
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

        {/* Waste Breakdown */}
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
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Supplier Inflation */}
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.supplierInflation}</CardTitle>
            <CardDescription>{t.reports.priceChangeYoY}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                "Carni Pregiate": { label: "Meat", color: "var(--chart-1)" },
                "Ortofrutticola": { label: "Vegetables", color: "var(--chart-2)" },
                "Oleificio": { label: "Oil", color: "var(--chart-3)" },
              }}
              className="aspect-auto h-[250px] w-full"
            >
              <LineChart data={inflationData.slice(-6)}>
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
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `+${Number(v).toFixed(1)}%`} />} />
                <Line type="monotone" dataKey="Carni Pregiate" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Ortofrutticola" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Oleificio" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Underused Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.underused}</CardTitle>
            <CardDescription>{t.reports.underusedDesc}</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
