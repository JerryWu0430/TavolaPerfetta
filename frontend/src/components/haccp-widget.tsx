"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HACCPStatusBadge } from "@/components/status-badge"
import { useTranslations, useI18n } from "@/lib/i18n"
import { CheckCircle2Icon, AlertTriangleIcon } from "lucide-react"

interface HACCPWidgetProps {
  date: string
  completedChecks: number
  totalChecks: number
  status: "pass" | "fail" | "partial"
  issues?: string[]
}

export function HACCPWidget({
  date,
  completedChecks,
  totalChecks,
  status,
  issues = [],
}: HACCPWidgetProps) {
  const t = useTranslations()
  const { locale } = useI18n()
  const percentage = Math.round((completedChecks / totalChecks) * 100)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t.home.haccp.title}</CardTitle>
            <CardDescription>
              {new Date(date).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </CardDescription>
          </div>
          <HACCPStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.home.haccp.completion}</span>
            <span className="font-medium">
              {completedChecks}/{totalChecks} {t.home.haccp.checks}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {status === "pass" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2Icon className="size-4" />
            <span>{t.home.haccp.allPassed}</span>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t.home.haccp.issuesFound}</p>
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400"
              >
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
