"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react"
import { useTranslations } from "@/lib/i18n"
import type { KPI } from "@/types"

interface KPICardProps {
  kpi: KPI
  prefix?: string
  suffix?: string
}

export function KPICard({ kpi, prefix = "", suffix = "" }: KPICardProps) {
  const t = useTranslations()

  // Treat 0% change as neutral regardless of trend prop
  const effectiveChange = kpi.change ?? 0
  const isNeutral = effectiveChange === 0
  const effectiveTrend = isNeutral ? "neutral" : kpi.trend

  const TrendIcon =
    effectiveTrend === "up"
      ? TrendingUpIcon
      : effectiveTrend === "down"
        ? TrendingDownIcon
        : MinusIcon

  const trendColor =
    effectiveTrend === "up"
      ? "text-green-600 dark:text-green-400"
      : effectiveTrend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"

  const badgeColor =
    effectiveTrend === "up"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
      : effectiveTrend === "down"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        : ""

  const trendText = effectiveTrend === "up"
    ? t.home.trending.up
    : effectiveTrend === "down"
      ? t.home.trending.down
      : t.home.trending.neutral

  const hasChangeData = kpi.change !== undefined && kpi.trend !== undefined

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{kpi.label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {prefix}
          {kpi.value}
          {suffix}
        </CardTitle>
        {hasChangeData && (
          <CardAction>
            <Badge variant="outline" className={badgeColor}>
              <TrendIcon className="size-3" />
              {effectiveChange >= 0 ? "+" : ""}
              {effectiveChange}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {kpi.description && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {hasChangeData && (
            <div className={`line-clamp-1 flex gap-2 font-medium ${trendColor}`}>
              {trendText}
              <TrendIcon className="size-4" />
            </div>
          )}
          <div className="text-muted-foreground">{kpi.description}</div>
        </CardFooter>
      )}
    </Card>
  )
}

interface KPIGridProps {
  kpis: KPI[]
  prefix?: string
  suffix?: string
}

export function KPIGrid({ kpis, prefix, suffix }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {kpis.map((kpi, idx) => (
        <KPICard
          key={idx}
          kpi={kpi}
          prefix={idx === 0 ? "€" : prefix}
          suffix={idx === 2 ? "%" : suffix}
        />
      ))}
    </div>
  )
}
