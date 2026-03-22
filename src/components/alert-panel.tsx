"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangleIcon, AlertCircleIcon, InfoIcon } from "lucide-react"
import { useTranslations } from "@/lib/i18n"
import type { Alert, AlertSeverity } from "@/types"

const severityConfig: Record<
  AlertSeverity,
  { icon: typeof AlertTriangleIcon; color: string; bg: string }
> = {
  critical: {
    icon: AlertTriangleIcon,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
  },
  warning: {
    icon: AlertCircleIcon,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
  },
  info: {
    icon: InfoIcon,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  },
}

interface AlertItemProps {
  alert: Alert
}

function AlertItem({ alert }: AlertItemProps) {
  const t = useTranslations()
  const config = severityConfig[alert.severity]
  const Icon = config.icon

  const categoryLabel = t.alertCategories[alert.category as keyof typeof t.alertCategories] || alert.category

  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${config.bg}`}>
      <Icon className={`size-5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-sm ${config.color}`}>{alert.title}</p>
          <Badge variant="outline" className="shrink-0 text-xs">
            {categoryLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(alert.timestamp).toLocaleString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}

interface AlertPanelProps {
  alerts: Alert[]
  title?: string
  description?: string
  maxItems?: number
}

export function AlertPanel({
  alerts,
  title,
  description,
  maxItems = 5,
}: AlertPanelProps) {
  const t = useTranslations()
  const displayTitle = title || t.home.alerts.title

  const sortedAlerts = [...alerts]
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
    .slice(0, maxItems)

  const criticalCount = alerts.filter((a) => a.severity === "critical").length
  const warningCount = alerts.filter((a) => a.severity === "warning").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{displayTitle}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} {t.home.alerts.critical}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                {warningCount} {t.home.alerts.warnings}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {sortedAlerts.length > 0 ? (
            sortedAlerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.common.noResults}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
