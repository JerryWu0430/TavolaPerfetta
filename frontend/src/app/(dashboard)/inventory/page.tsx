"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart } from "recharts"

import { PageHeader } from "@/components/page-header"
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useTranslations } from "@/lib/i18n"
import { inventory, products, type InventoryItem as APIInventoryItem } from "@/lib/api"
import { formatEUR } from "@/types"
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
import {
  SearchIcon,
  Loader2Icon,
  PlusIcon,
  PackageIcon,
  Trash2Icon,
  AlertTriangleIcon,
  ClipboardCheckIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"

const PHYSICAL_COUNT_STORAGE_KEY = "physical_count_draft"

const CATEGORY_COLORS: Record<string, string> = {
  meat: "#f97316",
  vegetables: "#22c55e",
  dairy: "#a855f7",
  beverages: "#3b82f6",
  pantry: "#06b6d4",
  seafood: "#ec4899",
  grain: "#eab308",
  spice: "#ef4444",
  other: "#6b7280",
}

const chartConfig = {
  variance: { label: "Variance", color: "#f97316" },
  value: { label: "Value", color: "#f97316" },
} satisfies ChartConfig

type StockLevel = "critical" | "low" | "normal" | "excess"

interface InventoryItemUI extends APIInventoryItem {
  stockLevel: StockLevel
  maxStock: number
  stockValue: number
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
    maxStock: item.min_stock * 3,
    stockValue: item.quantity * item.product_unit_price,
  }
}

function StockLevelProgress({ item }: { item: InventoryItemUI }) {
  const percentage = Math.min(100, (item.quantity / item.maxStock) * 100)
  const colorClass = item.stockLevel === "critical" || item.stockLevel === "low"
    ? "bg-red-500"
    : "bg-green-500"

  return (
    <div className="w-24 flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ level }: { level: StockLevel }) {
  if (level === "critical" || level === "low") {
    return <Badge variant="outline" className="text-red-600 border-red-300">Low</Badge>
  }
  return <Badge variant="outline" className="text-green-600 border-green-300">OK</Badge>
}

function PhysicalCountDrawer({
  items,
  onComplete,
}: {
  items: InventoryItemUI[]
  onComplete: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [counts, setCounts] = React.useState<Record<number, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Load saved draft from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(PHYSICAL_COUNT_STORAGE_KEY)
    if (saved) {
      try {
        setCounts(JSON.parse(saved))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  // Save to localStorage whenever counts change
  React.useEffect(() => {
    if (Object.keys(counts).length > 0) {
      localStorage.setItem(PHYSICAL_COUNT_STORAGE_KEY, JSON.stringify(counts))
    }
  }, [counts])

  const handleCountChange = (itemId: number, value: string) => {
    setCounts((prev) => ({ ...prev, [itemId]: value }))
  }

  const handleClearItem = (itemId: number) => {
    setCounts((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      // Update all items that have been counted
      const updates = Object.entries(counts)
        .filter(([_, value]) => value !== "")
        .map(([id, value]) => {
          const itemId = parseInt(id)
          const newQty = parseFloat(value) || 0
          return inventory.update(itemId, { quantity: newQty })
        })

      await Promise.all(updates)

      // Clear localStorage and counts
      localStorage.removeItem(PHYSICAL_COUNT_STORAGE_KEY)
      setCounts({})
      setOpen(false)
      onComplete()
    } catch (err) {
      console.error("Failed to save counts:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    localStorage.removeItem(PHYSICAL_COUNT_STORAGE_KEY)
    setCounts({})
  }

  const countedItems = Object.keys(counts).filter((k) => counts[parseInt(k)] !== "").length
  const totalItems = items.length

  const filteredItems = items.filter((item) =>
    !search || item.product_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline">
          <ClipboardCheckIcon className="size-4 mr-2" />
          Physical Count
          {countedItems > 0 && (
            <Badge className="ml-2 bg-orange-500">{countedItems}</Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-full sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Physical Count</DrawerTitle>
          <DrawerDescription>
            Enter actual quantities for each item. Progress is saved automatically.
          </DrawerDescription>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {countedItems} / {totalItems} counted
            </Badge>
            {countedItems > 0 && (
              <Button variant="ghost" size="sm" onClick={handleDiscard} className="text-red-600">
                <XIcon className="size-4 mr-1" />
                Discard All
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-3 pb-4">
            {filteredItems.map((item) => {
              const counted = counts[item.id] !== undefined && counts[item.id] !== ""
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${counted ? "border-green-300 bg-green-50/50" : "border-gray-200"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {item.quantity} {item.product_unit}
                      </p>
                    </div>
                    {counted && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => handleClearItem(item.id)}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Enter counted qty"
                      value={counts[item.id] || ""}
                      onChange={(e) => handleCountChange(item.id, e.target.value)}
                      className={counted ? "border-green-300" : ""}
                    />
                    <span className="text-sm text-muted-foreground w-12">{item.product_unit}</span>
                    {counted && <CheckIcon className="size-5 text-green-500" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DrawerFooter className="border-t">
          <Button
            onClick={handleSaveAll}
            disabled={countedItems === 0 || saving}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {saving ? (
              <Loader2Icon className="size-4 animate-spin mr-2" />
            ) : (
              <CheckIcon className="size-4 mr-2" />
            )}
            Save All ({countedItems} items)
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
      const product = await products.create({
        name,
        category: category || undefined,
        unit: unit || undefined,
        unit_price: parseFloat(unitPrice) || 0,
        min_stock: parseFloat(minStock) || 0,
      })
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
          <Button className="bg-orange-500 hover:bg-orange-600">
            <PlusIcon className="size-4 mr-2" />
            Add Product
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
                  <SelectItem value="meat">Meat</SelectItem>
                  <SelectItem value="vegetables">Vegetables</SelectItem>
                  <SelectItem value="dairy">Dairy</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                  <SelectItem value="pantry">Pantry</SelectItem>
                  <SelectItem value="seafood">Seafood</SelectItem>
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
                  <SelectItem value="pcs">pcs</SelectItem>
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
          <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
            Update
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>{item.product_name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Current Quantity</Label>
            <p className="text-sm text-muted-foreground">
              {item.quantity} {item.product_unit}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newQty">New Quantity</Label>
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
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : "Save"}
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
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [wasteAmount, setWasteAmount] = React.useState("")

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const waste = parseFloat(wasteAmount) || 0
      const newQty = Math.max(0, item.quantity - waste)
      await inventory.update(item.id, { quantity: newQty })
      onWaste(newQty)
      setOpen(false)
      setWasteAmount("")
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
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Waste
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Waste</DialogTitle>
          <DialogDescription>{item.product_name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Current Quantity</Label>
            <p className="text-sm text-muted-foreground">
              {item.quantity} {item.product_unit}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wasteAmount">Waste Amount</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!wasteAmount || loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function InventoryPage() {
  const t = useTranslations()
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItemUI[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

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
          ? { ...item, quantity: newQty, stockLevel: getStockLevel(newQty, item.min_stock), stockValue: newQty * item.product_unit_price }
          : item
      )
    )
  }

  // Filter items
  const filteredItems = React.useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch = !search || item.product_name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === "all" || item.product_category === categoryFilter
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "low" && (item.stockLevel === "critical" || item.stockLevel === "low")) ||
        (statusFilter === "ok" && (item.stockLevel === "normal" || item.stockLevel === "excess"))
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [inventoryItems, search, categoryFilter, statusFilter])

  // KPIs
  const totalProducts = inventoryItems.length
  const belowThreshold = inventoryItems.filter((i) => i.stockLevel === "critical" || i.stockLevel === "low").length
  const needsAttention = belowThreshold
  const totalValue = inventoryItems.reduce((sum, i) => sum + i.stockValue, 0)

  // Variance chart data (top 5 by absolute variance)
  const varianceData = React.useMemo(() => {
    return [...inventoryItems]
      .filter((i) => i.variance_pct !== null)
      .sort((a, b) => Math.abs(b.variance_pct || 0) - Math.abs(a.variance_pct || 0))
      .slice(0, 5)
      .map((i) => ({
        name: i.product_name.length > 15 ? i.product_name.slice(0, 15) + "..." : i.product_name,
        variance: Math.abs(i.quantity - i.theoretical_quantity),
        fill: (i.variance_pct || 0) < 0 ? "#ef4444" : "#22c55e",
      }))
  }, [inventoryItems])

  // Category pie chart data
  const categoryData = React.useMemo(() => {
    const byCategory: Record<string, number> = {}
    for (const item of inventoryItems) {
      const cat = item.product_category || "other"
      byCategory[cat] = (byCategory[cat] || 0) + item.stockValue
    }
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
    return Object.entries(byCategory)
      .filter(([_, value]) => value > 0)
      .map(([category, value]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        fill: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
      }))
  }, [inventoryItems])

  // Get unique categories for filter
  const categories = React.useMemo(() => {
    const cats = new Set(inventoryItems.map((i) => i.product_category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [inventoryItems])

  // Items below threshold for alert
  const lowStockItems = inventoryItems.filter((i) => i.stockLevel === "critical" || i.stockLevel === "low")

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
        actions={
          <div className="flex gap-2">
            <PhysicalCountDrawer items={inventoryItems} onComplete={fetchInventory} />
            <AddItemDialog onAdd={fetchInventory} />
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Products</p>
            <p className="text-3xl font-bold mt-1">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Below Threshold</p>
            <p className="text-3xl font-bold mt-1 text-orange-500">{belowThreshold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Needs Attention</p>
            <p className="text-3xl font-bold mt-1 text-red-500">{needsAttention}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Est. Total Value</p>
            <p className="text-3xl font-bold mt-1">{formatEUR(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6">
        {/* Variance Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Theoretical vs Actual Variance</CardTitle>
            <CardDescription>Products with highest difference</CardDescription>
          </CardHeader>
          <CardContent>
            {varianceData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full" style={{ height: `${Math.max(150, varianceData.length * 40)}px` }}>
                <BarChart data={varianceData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="variance" radius={4}>
                    {varianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No variance data</p>
            )}
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-[250px]">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    labelLine={true}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatEUR(Number(value))} />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No category data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="px-4 lg:px-6">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangleIcon className="size-5" />
                <span className="font-medium">{lowStockItems.length} products below threshold — action required</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map((item) => (
                  <Badge key={item.id} className="bg-orange-500 text-white hover:bg-orange-600">
                    {item.product_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("all")}
              className={categoryFilter === "all" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className={categoryFilter === cat ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Theoretical</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const variance = item.quantity - item.theoretical_quantity
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.product_category ? item.product_category.charAt(0).toUpperCase() + item.product_category.slice(1) : ""}
                              {item.supplier_name && ` · ${item.supplier_name}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.theoretical_quantity} {item.product_unit}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantity} {item.product_unit}
                        </TableCell>
                        <TableCell className={`text-right ${variance < 0 ? "text-red-600" : "text-green-600"}`}>
                          {variance > 0 ? "+" : ""}{variance.toFixed(1)} {item.product_unit}
                        </TableCell>
                        <TableCell>
                          <StockLevelProgress item={item} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge level={item.stockLevel} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <UpdateStockDialog
                              item={item}
                              onUpdate={(newQty) => handleUpdateQuantity(item.id, newQty)}
                            />
                            <WasteDialog
                              item={item}
                              onWaste={(newQty) => handleUpdateQuantity(item.id, newQty)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t.common.noResults}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
