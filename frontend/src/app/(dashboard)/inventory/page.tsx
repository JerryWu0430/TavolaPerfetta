"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { PageHeader } from "@/components/page-header"
import { AlertPanel } from "@/components/alert-panel"
import { StockLevelBadge, VarianceBadge } from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslations } from "@/lib/i18n"
import { inventory, type InventoryItem as APIInventoryItem } from "@/lib/api"
import type { Alert } from "@/types"
import { ArrowUpDownIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react"

type StockLevel = "critical" | "low" | "normal" | "excess"

interface InventoryItemUI extends APIInventoryItem {
  stockLevel: StockLevel
  maxStock: number
}

function getStockLevel(quantity: number, minStock: number): StockLevel {
  if (quantity <= minStock * 0.5) return "critical"
  if (quantity <= minStock) return "low"
  if (quantity >= minStock * 3) return "excess"
  return "normal"
}

function mapToUI(item: APIInventoryItem): InventoryItemUI {
  return {
    ...item,
    stockLevel: getStockLevel(item.quantity, item.min_stock),
    maxStock: item.min_stock * 3, // Estimate max as 3x min
  }
}

function StockProgress({ item }: { item: InventoryItemUI }) {
  const percentage = Math.min(100, (item.quantity / item.maxStock) * 100)
  const minPercentage = (item.min_stock / item.maxStock) * 100

  return (
    <div className="relative w-24">
      <Progress value={percentage} className="h-2" />
      <div
        className="absolute top-0 h-2 w-0.5 bg-amber-500"
        style={{ left: `${minPercentage}%` }}
      />
    </div>
  )
}

export default function InventoryPage() {
  const t = useTranslations()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItemUI[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchInventory() {
      try {
        setLoading(true)
        const data = await inventory.list()
        setInventoryItems(data.map(mapToUI))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inventory")
      } finally {
        setLoading(false)
      }
    }
    fetchInventory()
  }, [])

  const columns: ColumnDef<InventoryItemUI>[] = [
    {
      accessorKey: "product_name",
      header: t.inventory.product,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.product_name}</p>
        </div>
      ),
    },
    {
      accessorKey: "theoretical_quantity",
      header: t.inventory.theoretical,
      cell: ({ row }) => (
        <span>{row.original.theoretical_quantity} {row.original.product_unit}</span>
      ),
    },
    {
      accessorKey: "quantity",
      header: t.inventory.actual,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.quantity} {row.original.product_unit}</span>
      ),
    },
    {
      accessorKey: "variance_pct",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.inventory.variance}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => <VarianceBadge variance={row.original.variance_pct || 0} />,
    },
    {
      accessorKey: "stockLevel",
      header: t.inventory.level,
      cell: ({ row }) => <StockLevelBadge level={row.original.stockLevel} />,
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: "progress",
      header: t.inventory.stock,
      cell: ({ row }) => <StockProgress item={row.original} />,
    },
  ]

  const table = useReactTable({
    data: inventoryItems,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const criticalStockItems = inventoryItems.filter(
    (item) => item.stockLevel === "critical" || item.stockLevel === "low"
  )

  const stockAlerts: Alert[] = criticalStockItems.map((item) => ({
    id: String(item.id),
    title: `${item.stockLevel === "critical" ? t.home.alerts.criticalStock : t.home.alerts.lowStock}: ${item.product_name}`,
    description: `${item.quantity} ${item.product_unit} ${t.inventory.remaining} (${t.inventory.min}: ${item.min_stock} ${item.product_unit})`,
    severity: item.stockLevel === "critical" ? "critical" : "warning",
    timestamp: item.updated_at,
    category: "stock" as const,
  }))

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
        title={t.inventory.title}
        description={t.inventory.description}
      />

      <div className="px-4 lg:px-6">
        <AlertPanel
          alerts={stockAlerts}
          title={t.inventory.reorder}
          description={t.inventory.reorderDesc}
        />
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t.inventory.full}</CardTitle>
                <CardDescription>{t.inventory.fullDesc}</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder={t.inventory.searchProduct}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
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
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={
                          row.original.stockLevel === "critical"
                            ? "bg-red-50/50 dark:bg-red-950/20"
                            : row.original.stockLevel === "low"
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
                        {t.common.noResults}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                  {inventoryItems.filter((i) => i.stockLevel === "critical").length} {t.inventory.critical}
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  {inventoryItems.filter((i) => i.stockLevel === "low").length} {t.inventory.low}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-sm">
                  {t.common.page} {table.getState().pagination.pageIndex + 1} {t.common.of} {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
