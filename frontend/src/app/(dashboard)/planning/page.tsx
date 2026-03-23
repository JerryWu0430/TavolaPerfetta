"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslations } from "@/lib/i18n"
import {
  inventory as inventoryApi,
  recipes as recipesApi,
  orders as ordersApi,
} from "@/lib/api"
import { ArrowUpDownIcon, AlertTriangleIcon, Loader2Icon, CalendarIcon, UsersIcon } from "lucide-react"

interface CoverageItem {
  id: string
  ingredient: string
  currentStock: number
  unit: string
  dailyUsage: number
  coverageDays: number
  reorderPoint: number
}

interface ScenarioEvent {
  id: string
  name: string
  date: string
  expectedCovers: number
  menuItems: string[]
  calculatedNeeds: { ingredient: string; quantity: number; unit: string }[]
}

function CoverageIndicator({ days }: { days: number }) {
  const percentage = Math.min(100, (days / 14) * 100)
  let color = "bg-green-500"
  if (days <= 3) color = "bg-red-500"
  else if (days <= 7) color = "bg-amber-500"

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-16 h-2 bg-secondary rounded-full">
        <div
          className={`absolute h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={days <= 3 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
        {days.toFixed(1)}d
      </span>
    </div>
  )
}

function EventCard({ event }: { event: ScenarioEvent }) {
  const t = useTranslations()
  const daysUntil = Math.ceil(
    (new Date(event.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const daysLabel = daysUntil === 0
    ? t.planning.today
    : daysUntil === 1
      ? t.planning.tomorrow
      : t.planning.inDays.replace("{days}", String(daysUntil))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{event.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <CalendarIcon className="size-4" />
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </CardDescription>
          </div>
          <Badge variant={daysUntil <= 3 ? "destructive" : "outline"}>
            {daysLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <UsersIcon className="size-4 text-muted-foreground" />
          <span className="font-medium">{event.expectedCovers} {t.planning.expectedCovers}</span>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">{t.planning.menuItems}</p>
          <div className="flex flex-wrap gap-1">
            {event.menuItems.map((item) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {event.calculatedNeeds.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t.planning.estimatedNeeds}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {event.calculatedNeeds.map((need, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{need.ingredient}</span>
                  <span className="font-medium">{need.quantity} {need.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PlanningPage() {
  const t = useTranslations()
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "coverageDays", desc: false },
  ])
  const [coverageItems, setCoverageItems] = React.useState<CoverageItem[]>([])
  const [upcomingEvents, setUpcomingEvents] = React.useState<ScenarioEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [scenarioDefaults, setScenarioDefaults] = React.useState({
    avgCoversPerDay: 85,
    peakDayMultiplier: 1.4,
    safetyStockDays: 2,
  })

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const [inventoryRes, recipesRes, ordersRes] = await Promise.all([
          inventoryApi.list(),
          recipesApi.list(),
          ordersApi.list({
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
          }),
        ])

        // Calculate average daily usage from orders and recipes
        const totalDays = 30
        const avgOrdersPerDay = ordersRes.length / totalDays

        // Estimate daily usage based on inventory turnover
        const coverage = inventoryRes.map((item) => {
          // Estimate daily usage as a fraction of min_stock
          const estimatedDailyUsage = item.min_stock / 7 // Assume min_stock is ~1 week supply
          const coverageDays = estimatedDailyUsage > 0 ? item.quantity / estimatedDailyUsage : 999

          return {
            id: String(item.id),
            ingredient: item.product_name,
            currentStock: item.quantity,
            unit: item.product_unit || "",
            dailyUsage: parseFloat(estimatedDailyUsage.toFixed(2)),
            coverageDays: parseFloat(coverageDays.toFixed(1)),
            reorderPoint: item.min_stock,
          }
        })

        setCoverageItems(coverage)

        // Create simulated upcoming events based on recipes
        const events: ScenarioEvent[] = []
        const topRecipes = recipesRes.slice(0, 3)

        if (topRecipes.length >= 2) {
          events.push({
            id: "event-1",
            name: "Business Dinner",
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            expectedCovers: 25,
            menuItems: topRecipes.slice(0, 2).map((r) => r.name),
            calculatedNeeds: [],
          })
        }

        if (topRecipes.length >= 3) {
          events.push({
            id: "event-2",
            name: "Weekend Special",
            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            expectedCovers: 60,
            menuItems: topRecipes.map((r) => r.name),
            calculatedNeeds: [],
          })
        }

        setUpcomingEvents(events)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load planning data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const columns: ColumnDef<CoverageItem>[] = [
    {
      accessorKey: "ingredient",
      header: t.products.ingredient,
      cell: ({ row }) => <span className="font-medium">{row.original.ingredient}</span>,
    },
    {
      accessorKey: "currentStock",
      header: t.planning.currentStock,
      cell: ({ row }) => (
        <span>{row.original.currentStock} {row.original.unit}</span>
      ),
    },
    {
      accessorKey: "dailyUsage",
      header: t.planning.dailyUsage,
      cell: ({ row }) => (
        <span>{row.original.dailyUsage} {row.original.unit}/d</span>
      ),
    },
    {
      accessorKey: "coverageDays",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.planning.coverageDays}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => <CoverageIndicator days={row.original.coverageDays} />,
    },
    {
      accessorKey: "reorderPoint",
      header: t.planning.reorderPoint,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.reorderPoint} {row.original.unit}</span>
          {row.original.currentStock <= row.original.reorderPoint && (
            <AlertTriangleIcon className="size-4 text-amber-500" />
          )}
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: coverageItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const lowCoverageCount = coverageItems.filter((i) => i.coverageDays <= 3).length

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
        title={t.planning.title}
        description={t.planning.description}
      />

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
        <Card className="@3xl/main:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t.planning.coverage}</CardTitle>
                <CardDescription>{t.planning.coverageDesc}</CardDescription>
              </div>
              {lowCoverageCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangleIcon className="size-3 mr-1" />
                  {lowCoverageCount} {t.planning.criticalItems}
                </Badge>
              )}
            </div>
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
                      <TableRow
                        key={row.id}
                        className={
                          row.original.coverageDays <= 3
                            ? "bg-red-50/50 dark:bg-red-950/20"
                            : row.original.coverageDays <= 7
                              ? "bg-amber-50/50 dark:bg-amber-950/20"
                              : ""
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No inventory data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.planning.parameters}</CardTitle>
            <CardDescription>{t.planning.parametersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="avgCovers">{t.planning.avgCovers}</Label>
              <Input
                id="avgCovers"
                type="number"
                value={scenarioDefaults.avgCoversPerDay}
                onChange={(e) => setScenarioDefaults((prev) => ({
                  ...prev,
                  avgCoversPerDay: parseInt(e.target.value) || 0,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="peakMultiplier">{t.planning.peakMultiplier}</Label>
              <Input
                id="peakMultiplier"
                type="number"
                step="0.1"
                value={scenarioDefaults.peakDayMultiplier}
                onChange={(e) => setScenarioDefaults((prev) => ({
                  ...prev,
                  peakDayMultiplier: parseFloat(e.target.value) || 1,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safetyStock">{t.planning.safetyStock}</Label>
              <Input
                id="safetyStock"
                type="number"
                value={scenarioDefaults.safetyStockDays}
                onChange={(e) => setScenarioDefaults((prev) => ({
                  ...prev,
                  safetyStockDays: parseInt(e.target.value) || 0,
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {upcomingEvents.length > 0 && (
        <div className="px-4 lg:px-6">
          <h2 className="text-lg font-semibold mb-4">{t.planning.upcomingEvents}</h2>
          <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
