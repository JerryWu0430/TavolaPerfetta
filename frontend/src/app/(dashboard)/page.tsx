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
import { revenueChartData, haccpDailyStatus } from "@/data/mock/home"
import { locations, locationComparisons } from "@/data/mock/locations"
import type { KPI, Alert } from "@/types"

export default function HomePage() {
  const t = useTranslations()
  const [selectedLocation, setSelectedLocation] = React.useState("all")

  const homeKPIs: KPI[] = [
    {
      label: t.home.revenueToday,
      value: "4.850",
      change: 12.5,
      trend: "up",
      description: t.home.vsSameDay,
    },
    {
      label: t.home.covers,
      value: "127",
      change: 8.2,
      trend: "up",
      description: t.home.reservationsWalkin,
    },
    {
      label: t.home.foodCost,
      value: "28.5",
      change: -2.1,
      trend: "down",
      description: t.home.target,
    },
    {
      label: t.home.avgTicket,
      value: "38.19",
      change: 4.3,
      trend: "up",
      description: t.home.inclDrinks,
    },
  ]

  const homeAlerts: Alert[] = [
    {
      id: "alert-1",
      title: `${t.home.alerts.criticalStock}: Olio EVO`,
      description: `2 ${t.home.alerts.daysRemaining}`,
      severity: "critical",
      timestamp: "2026-03-22T09:30:00",
      category: "stock",
    },
    {
      id: "alert-2",
      title: t.home.alerts.haccpTemp,
      description: t.home.alerts.tempRecorded,
      severity: "critical",
      timestamp: "2026-03-22T08:15:00",
      category: "haccp",
    },
    {
      id: "alert-3",
      title: `${t.home.alerts.lowStock}: Parmigiano`,
      description: `5 ${t.home.alerts.daysRemaining}`,
      severity: "warning",
      timestamp: "2026-03-22T07:00:00",
      category: "stock",
    },
    {
      id: "alert-4",
      title: t.home.alerts.supplierDelay,
      description: t.home.alerts.expectedYesterday,
      severity: "warning",
      timestamp: "2026-03-21T18:00:00",
      category: "supplier",
    },
  ]

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

      <KPIGrid kpis={homeKPIs} />

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <AlertPanel
          alerts={homeAlerts}
          title={t.home.alerts.title}
          description={t.home.alerts.description}
        />
        <HACCPWidget
          date={haccpDailyStatus.date}
          completedChecks={haccpDailyStatus.completedChecks}
          totalChecks={haccpDailyStatus.totalChecks}
          status={haccpDailyStatus.status}
          issues={haccpDailyStatus.issues}
        />
      </div>

      <div className="px-4 lg:px-6">
        <RevenueChart
          data={revenueChartData}
          title={t.home.chart.title}
          description={t.home.chart.description}
        />
      </div>

      <div className="px-4 lg:px-6">
        <LocationComparisonChart
          data={locationComparisons}
          title={t.home.locationComparison.title}
          description={t.home.locationComparison.description}
        />
      </div>
    </div>
  )
}
