"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2Icon, XCircleIcon, AlertCircleIcon, MinusCircleIcon } from "lucide-react"
import { useTranslations } from "@/lib/i18n"
import type { StockLevel } from "@/types"

// HACCP Status Badge
interface HACCPStatusBadgeProps {
  status: "pass" | "fail" | "partial"
}

export function HACCPStatusBadge({ status }: HACCPStatusBadgeProps) {
  const t = useTranslations()

  const config = {
    pass: {
      icon: CheckCircle2Icon,
      label: t.haccp.pass,
      className: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    },
    fail: {
      icon: XCircleIcon,
      label: t.haccp.fail,
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    },
    partial: {
      icon: AlertCircleIcon,
      label: t.haccp.partial,
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
    },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3.5 mr-1" />
      {label}
    </Badge>
  )
}

// Stock Level Badge
interface StockLevelBadgeProps {
  level: StockLevel
  showLabel?: boolean
}

export function StockLevelBadge({ level, showLabel = true }: StockLevelBadgeProps) {
  const t = useTranslations()

  const config = {
    critical: {
      icon: XCircleIcon,
      label: t.inventory.critical,
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
    },
    low: {
      icon: AlertCircleIcon,
      label: t.inventory.low,
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
    },
    normal: {
      icon: CheckCircle2Icon,
      label: t.inventory.normal,
      className: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
    },
    excess: {
      icon: MinusCircleIcon,
      label: t.inventory.excess,
      className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
    },
  }

  const { icon: Icon, label, className } = config[level]

  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3.5" />
      {showLabel && <span className="ml-1">{label}</span>}
    </Badge>
  )
}

// Variance Badge (for inventory)
interface VarianceBadgeProps {
  variance: number
}

export function VarianceBadge({ variance }: VarianceBadgeProps) {
  const absVariance = Math.abs(variance)
  let className = "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"

  if (absVariance > 20) {
    className = "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
  } else if (absVariance > 10) {
    className = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
  }

  return (
    <Badge variant="outline" className={className}>
      {variance >= 0 ? "+" : ""}{variance.toFixed(1)}%
    </Badge>
  )
}

// Reliability Badge (for suppliers)
interface ReliabilityBadgeProps {
  percentage: number
}

export function ReliabilityBadge({ percentage }: ReliabilityBadgeProps) {
  let className = "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"

  if (percentage < 85) {
    className = "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
  } else if (percentage < 95) {
    className = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
  }

  return (
    <Badge variant="outline" className={className}>
      {percentage}%
    </Badge>
  )
}

// Price Change Badge
interface PriceChangeBadgeProps {
  change: number
}

export function PriceChangeBadge({ change }: PriceChangeBadgeProps) {
  let className = "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"

  if (change > 10) {
    className = "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
  } else if (change > 5) {
    className = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
  } else if (change < 0) {
    className = "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
  }

  return (
    <Badge variant="outline" className={className}>
      {change >= 0 ? "+" : ""}{change.toFixed(1)}%
    </Badge>
  )
}
