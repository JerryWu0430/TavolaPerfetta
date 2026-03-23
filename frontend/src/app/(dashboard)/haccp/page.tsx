"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"

import { PageHeader } from "@/components/page-header"
import { HACCPStatusBadge } from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations, useI18n } from "@/lib/i18n"
import {
  haccp,
  type HACCPTemplate,
  type HACCPChecklist,
  type HACCPItem,
} from "@/lib/api"
import { ThermometerIcon, SparklesIcon, ClipboardCheckIcon, CheckCircle2Icon, XCircleIcon, SettingsIcon, Loader2Icon } from "lucide-react"

type ChecklistItemType = "temperature" | "cleaning" | "inspection"

interface ChecklistItemUI {
  id: string
  name: string
  type: ChecklistItemType
  description?: string
  minValue?: number
  maxValue?: number
  unit?: string
  required: boolean
}

interface HACCPEntryUI {
  id: string
  date: string
  operator: string
  status: "pass" | "partial" | "fail"
  items: {
    itemId: string
    value: number | boolean
    passed: boolean
    timestamp: string
  }[]
  notes?: string
}

function mapTemplateToUI(t: HACCPTemplate): ChecklistItemUI {
  return {
    id: String(t.id),
    name: t.name,
    type: (t.category as ChecklistItemType) || "inspection",
    description: t.name,
    minValue: t.min_value ?? undefined,
    maxValue: t.max_value ?? undefined,
    unit: t.unit ?? undefined,
    required: t.is_active,
  }
}

function mapChecklistToUI(c: HACCPChecklist): HACCPEntryUI {
  return {
    id: String(c.id),
    date: c.date,
    operator: c.operator || "Unknown",
    status: c.status === "passed" ? "pass" : c.status === "failed" ? "fail" : "partial",
    items: c.items.map((item) => ({
      itemId: String(item.template_id || item.id),
      value: item.value === "true" ? true : item.value === "false" ? false : parseFloat(item.value || "0"),
      passed: item.passed ?? false,
      timestamp: c.created_at,
    })),
    notes: c.notes ?? undefined,
  }
}

function ChecklistItemIcon({ type }: { type: ChecklistItemType }) {
  switch (type) {
    case "temperature":
      return <ThermometerIcon className="size-4 text-blue-500" />
    case "cleaning":
      return <SparklesIcon className="size-4 text-green-500" />
    case "inspection":
      return <ClipboardCheckIcon className="size-4 text-purple-500" />
    default:
      return <ClipboardCheckIcon className="size-4 text-muted-foreground" />
  }
}

function DailyChecklist({ templates, onSave }: { templates: ChecklistItemUI[]; onSave: (items: { template_id: number; name: string; category: string; value: string; passed: boolean }[]) => Promise<void> }) {
  const t = useTranslations()
  const { locale } = useI18n()
  const [values, setValues] = React.useState<Record<string, number | boolean>>({})
  const [saving, setSaving] = React.useState(false)

  const handleValueChange = (id: string, value: number | boolean) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const isValueValid = (item: ChecklistItemUI, value: number | boolean | undefined): boolean | null => {
    if (value === undefined) return null
    if (typeof value === "boolean") return value
    if (item.minValue !== undefined && item.maxValue !== undefined) {
      return value >= item.minValue && value <= item.maxValue
    }
    return true
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = templates.map((template) => {
        const value = values[template.id]
        const passed = isValueValid(template, value) ?? false
        return {
          template_id: parseInt(template.id),
          name: template.name,
          category: template.type,
          value: String(value ?? ""),
          passed,
        }
      }).filter((item) => item.value !== "undefined" && item.value !== "")

      await onSave(items)
    } catch (err) {
      console.error("Failed to save checklist:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t.haccp.dailyChecklist}</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <SettingsIcon className="size-4 mr-2" />
            {t.haccp.manageItems}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No checklist templates configured</p>
        ) : (
          templates.map((item) => {
            const currentValue = values[item.id]
            const isValid = isValueValid(item, currentValue)

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  isValid === false
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : isValid === true
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      : ""
                }`}
              >
                <ChecklistItemIcon type={item.type} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {item.required && (
                      <Badge variant="outline" className="text-xs">
                        {t.haccp.required}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.type === "temperature" && item.minValue !== undefined && item.maxValue !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.haccp.range}: {item.minValue}{item.unit} - {item.maxValue}{item.unit}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.type === "temperature" ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        className="w-20"
                        placeholder={item.unit}
                        onChange={(e) => handleValueChange(item.id, parseFloat(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">{item.unit}</span>
                    </div>
                  ) : (
                    <Checkbox
                      checked={currentValue as boolean || false}
                      onCheckedChange={(checked) => handleValueChange(item.id, !!checked)}
                    />
                  )}
                  {isValid !== null && (
                    isValid ? (
                      <CheckCircle2Icon className="size-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-5 text-red-500" />
                    )
                  )}
                </div>
              </div>
            )
          })
        )}
        <Button className="w-full" onClick={handleSave} disabled={saving || templates.length === 0}>
          {saving ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
          {t.haccp.saveChecks}
        </Button>
      </CardContent>
    </Card>
  )
}

function HistoryDrawer({ entry, templates }: { entry: HACCPEntryUI; templates: ChecklistItemUI[] }) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm">{t.haccp.details}</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {t.haccp.checksOn} {new Date(entry.date).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")}
          </DrawerTitle>
          <DrawerDescription>
            {t.haccp.operator}: {entry.operator}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          <div className="flex items-center gap-4">
            <HACCPStatusBadge status={entry.status} />
            {entry.notes && (
              <p className="text-sm text-muted-foreground">{entry.notes}</p>
            )}
          </div>

          <div className="space-y-2">
            {entry.items.map((result) => {
              const item = templates.find((i) => i.id === result.itemId)
              if (!item) return null

              return (
                <div
                  key={result.itemId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    result.passed
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChecklistItemIcon type={item.type} />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {typeof result.value === "boolean"
                        ? result.value ? "OK" : "NO"
                        : `${result.value}${item.unit || ""}`}
                    </span>
                    {result.passed ? (
                      <CheckCircle2Icon className="size-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-4 text-red-500" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{t.products.close}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default function HACCPPage() {
  const t = useTranslations()
  const { locale } = useI18n()
  const [templates, setTemplates] = React.useState<ChecklistItemUI[]>([])
  const [history, setHistory] = React.useState<HACCPEntryUI[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [templatesRes, checklistsRes] = await Promise.all([
          haccp.templates.list(true),
          haccp.checklists.list(),
        ])
        setTemplates(templatesRes.map(mapTemplateToUI))
        setHistory(checklistsRes.map(mapChecklistToUI))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load HACCP data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSaveChecklist = async (items: { template_id: number; name: string; category: string; value: string; passed: boolean }[]) => {
    const result = await haccp.checklists.create({
      date: new Date().toISOString().split("T")[0],
      operator: "Current User",
      shift: "morning",
      items: items.map((item) => ({
        template_id: item.template_id,
        name: item.name,
        category: item.category,
        value: item.value,
        passed: item.passed,
      })),
    })
    setHistory((prev) => [mapChecklistToUI(result), ...prev])
  }

  // Calculate compliance stats from history
  const last7Days = history.filter((h) => {
    const date = new Date(h.date)
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const last30Days = history.filter((h) => {
    const date = new Date(h.date)
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 30
  })

  const complianceStats = {
    last7Days: last7Days.length > 0
      ? (last7Days.filter((h) => h.status === "pass").length / last7Days.length) * 100
      : 0,
    last30Days: last30Days.length > 0
      ? (last30Days.filter((h) => h.status === "pass").length / last30Days.length) * 100
      : 0,
    totalChecks: history.reduce((sum, h) => sum + h.items.length, 0),
    passedChecks: history.reduce((sum, h) => sum + h.items.filter((i) => i.passed).length, 0),
    failedChecks: history.reduce((sum, h) => sum + h.items.filter((i) => !i.passed).length, 0),
  }

  const historyColumns: ColumnDef<HACCPEntryUI>[] = [
    {
      accessorKey: "date",
      header: t.haccp.date,
      cell: ({ row }) =>
        new Date(row.original.date).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
    },
    {
      accessorKey: "operator",
      header: t.haccp.operator,
    },
    {
      accessorKey: "status",
      header: t.haccp.status,
      cell: ({ row }) => <HACCPStatusBadge status={row.original.status} />,
    },
    {
      id: "completion",
      header: t.haccp.completion,
      cell: ({ row }) => {
        const total = templates.filter((i) => i.required).length || 1
        const completed = row.original.items.length
        return (
          <div className="flex items-center gap-2">
            <Progress value={(completed / total) * 100} className="w-16 h-2" />
            <span className="text-sm text-muted-foreground">{completed}/{total}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "notes",
      header: t.haccp.notes,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.notes || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <HistoryDrawer entry={row.original} templates={templates} />,
    },
  ]

  const table = useReactTable({
    data: history,
    columns: historyColumns,
    getCoreRowModel: getCoreRowModel(),
  })

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
        title={t.haccp.title}
        description={t.haccp.description}
      />

      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.compliance7}</CardDescription>
            <CardTitle className="text-3xl">{complianceStats.last7Days.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceStats.last7Days} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.compliance30}</CardDescription>
            <CardTitle className="text-3xl">{complianceStats.last30Days.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceStats.last30Days} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.passed}</CardDescription>
            <CardTitle className="text-3xl text-green-600">{complianceStats.passedChecks}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.haccp.of} {complianceStats.totalChecks} {t.haccp.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.failed}</CardDescription>
            <CardTitle className="text-3xl text-red-600">{complianceStats.failedChecks}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.haccp.toVerify}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <DailyChecklist templates={templates} onSave={handleSaveChecklist} />

        <Card>
          <CardHeader>
            <CardTitle>{t.haccp.history}</CardTitle>
            <CardDescription>{t.haccp.historyDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={historyColumns.length} className="h-24 text-center">
                        No history records yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
