"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import type { RevenueData } from "@/types"

const chartConfig = {
  revenue: {
    label: "Ricavi",
    color: "var(--chart-1)",
  },
  costs: {
    label: "Costi",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface RevenueChartProps {
  data: RevenueData[]
  title?: string
  description?: string
}

export function RevenueChart({
  data,
  title = "Andamento Ricavi",
  description = "Ricavi e costi giornalieri",
}: RevenueChartProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    const daysToShow = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30
    return data.slice(-daysToShow)
  }, [data, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{description}</span>
          <span className="@[540px]/card:hidden">Ultimi {timeRange === "7d" ? "7" : timeRange === "14d" ? "14" : "30"} giorni</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => setTimeRange(value[0] ?? "30d")}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="30d">30 giorni</ToggleGroupItem>
            <ToggleGroupItem value="14d">14 giorni</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 giorni</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={(val) => val && setTimeRange(val)}>
            <SelectTrigger className="flex w-32 @[767px]/card:hidden" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">30 giorni</SelectItem>
              <SelectItem value="14d">14 giorni</SelectItem>
              <SelectItem value="7d">7 giorni</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-costs)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-costs)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              width={50}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })
                  }
                  formatter={(value, name) => (
                    <span>
                      {name === "revenue" ? "Ricavi" : "Costi"}: €{Number(value).toLocaleString("it-IT")}
                    </span>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="costs"
              type="natural"
              fill="url(#fillCosts)"
              stroke="var(--color-costs)"
              stackId="a"
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
