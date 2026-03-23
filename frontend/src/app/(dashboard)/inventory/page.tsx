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
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTranslations } from "@/lib/i18n"
import { inventory, products, type InventoryItem as APIInventoryItem } from "@/lib/api"
import type { Alert } from "@/types"
import {
  ArrowUpDownIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  MoreHorizontalIcon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react"

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

function AddItemDialog({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [unit, setUnit] = React.useState("")
  const [unitPrice, setUnitPrice] = React.useState("")
  const [minStock, setMinStock] = React.useState("")
  const [initialQty, setInitialQty] = React.useState("")

  const handleSubmit = async () => {
    try {
      setLoading(true)
      // Create product first
      const product = await products.create({
        name,
        category: category || undefined,
        unit: unit || undefined,
        unit_price: parseFloat(unitPrice) || 0,
        min_stock: parseFloat(minStock) || 0,
      })
      // Then create inventory entry with initial quantity
      if (initialQty) {
        await inventory.recordCount(product.id, parseFloat(initialQty) || 0)
      }
      setOpen(false)
      setName("")
      setCategory("")
      setUnit("")
      setUnitPrice("")
      setMinStock("")
      setInitialQty("")
      onAdd()
    } catch (err) {
      console.error("Failed to add item:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="size-4 mr-2" />
            {t.inventory.addItem}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.inventory.addItem}</DialogTitle>
          <DialogDescription>{t.inventory.addItemDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t.inventory.itemName}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pomodoro San Marzano"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">{t.products.category}</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={t.products.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vegetable">{t.inventory.categories.vegetable}</SelectItem>
                  <SelectItem value="meat">{t.inventory.categories.meat}</SelectItem>
                  <SelectItem value="dairy">{t.inventory.categories.dairy}</SelectItem>
                  <SelectItem value="seafood">{t.inventory.categories.seafood}</SelectItem>
                  <SelectItem value="grain">{t.inventory.categories.grain}</SelectItem>
                  <SelectItem value="spice">{t.inventory.categories.spice}</SelectItem>
                  <SelectItem value="other">{t.inventory.categories.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">{t.inventory.unit}</Label>
              <Select value={unit} onValueChange={(v) => v && setUnit(v)}>
                <SelectTrigger id="unit">
                  <SelectValue placeholder={t.inventory.selectUnit} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="pcs">{t.inventory.pieces}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="unitPrice">{t.inventory.unitPrice}</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minStock">{t.inventory.minStock}</Label>
              <Input
                id="minStock"
                type="number"
                step="0.1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="initialQty">{t.inventory.initialQty}</Label>
            <Input
              id="initialQty"
              type="number"
              step="0.1"
              value={initialQty}
              onChange={(e) => setInitialQty(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.products.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : t.products.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UpdateStockDialog({
  item,
  onUpdate,
}: {
  item: InventoryItemUI
  onUpdate: (newQty: number) => void
}) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [quantity, setQuantity] = React.useState(String(item.quantity))

  React.useEffect(() => {
    if (open) setQuantity(String(item.quantity))
  }, [open, item.quantity])

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const newQty = parseFloat(quantity) || 0
      await inventory.update(item.id, { quantity: newQty })
      onUpdate(newQty)
      setOpen(false)
    } catch (err) {
      console.error("Failed to update stock:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <PackageIcon className="size-4 mr-2" />
            {t.inventory.updateStock}
          </DropdownMenuItem>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.inventory.updateStock}</DialogTitle>
          <DialogDescription>{item.product_name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="currentQty">{t.inventory.currentQty}</Label>
            <p className="text-sm text-muted-foreground">
              {item.quantity} {item.product_unit}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newQty">{t.inventory.newQty}</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="newQty"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">{item.product_unit}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.products.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : t.products.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WasteDialog({
  item,
  onWaste,
}: {
  item: InventoryItemUI
  onWaste: (newQty: number) => void
}) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [wasteAmount, setWasteAmount] = React.useState("")
  const [reason, setReason] = React.useState("")

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const waste = parseFloat(wasteAmount) || 0
      const newQty = Math.max(0, item.quantity - waste)
      await inventory.update(item.id, { quantity: newQty })
      onWaste(newQty)
      setOpen(false)
      setWasteAmount("")
      setReason("")
    } catch (err) {
      console.error("Failed to log waste:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
            <Trash2Icon className="size-4 mr-2" />
            {t.inventory.logWaste}
          </DropdownMenuItem>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.inventory.logWaste}</DialogTitle>
          <DialogDescription>{item.product_name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t.inventory.currentQty}</Label>
            <p className="text-sm text-muted-foreground">
              {item.quantity} {item.product_unit}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wasteAmount">{t.inventory.wasteAmount}</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="wasteAmount"
                type="number"
                step="0.1"
                min="0"
                max={item.quantity}
                value={wasteAmount}
                onChange={(e) => setWasteAmount(e.target.value)}
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">{item.product_unit}</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">{t.inventory.wasteReason}</Label>
            <Select value={reason} onValueChange={(v) => v && setReason(v)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder={t.inventory.selectReason} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expired">{t.inventory.reasons.expired}</SelectItem>
                <SelectItem value="damaged">{t.inventory.reasons.damaged}</SelectItem>
                <SelectItem value="spoiled">{t.inventory.reasons.spoiled}</SelectItem>
                <SelectItem value="overproduction">{t.inventory.reasons.overproduction}</SelectItem>
                <SelectItem value="other">{t.inventory.reasons.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {wasteAmount && (
            <p className="text-sm">
              {t.inventory.newQtyAfterWaste}: <span className="font-medium">{Math.max(0, item.quantity - (parseFloat(wasteAmount) || 0))} {item.product_unit}</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.products.cancel}
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!wasteAmount || loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : t.inventory.confirmWaste}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function InventoryPage() {
  const t = useTranslations()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItemUI[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchInventory = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await inventory.list()
      setInventoryItems(data.map(mapToUI))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleUpdateQuantity = (itemId: number, newQty: number) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQty, stockLevel: getStockLevel(newQty, item.min_stock) }
          : item
      )
    )
  }

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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <UpdateStockDialog
              item={row.original}
              onUpdate={(newQty) => handleUpdateQuantity(row.original.id, newQty)}
            />
            <WasteDialog
              item={row.original}
              onWaste={(newQty) => handleUpdateQuantity(row.original.id, newQty)}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
        actions={<AddItemDialog onAdd={fetchInventory} />}
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
