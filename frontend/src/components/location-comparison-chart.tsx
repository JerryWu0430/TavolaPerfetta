"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
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
import type { LocationComparison } from "@/types"

const chartConfig = {
  revenue: {
    label: "Ricavi",
    color: "var(--chart-1)",
  },
  covers: {
    label: "Coperti",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface LocationComparisonChartProps {
  data: LocationComparison[]
  title?: string
  description?: string
}

export function LocationComparisonChart({
  data,
  title = "Confronto Sedi",
  description = "Performance mensile per sede",
}: LocationComparisonChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={data} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              dataKey="location"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === "revenue") {
                      return <span>Ricavi: €{Number(value).toLocaleString("it-IT")}</span>
                    }
                    return <span>Coperti: {Number(value).toLocaleString("it-IT")}</span>
                  }}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
