"use client"

import * as React from "react"
import Link from "next/link"
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
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"

import { PageHeader } from "@/components/page-header"
import { KPICard } from "@/components/kpi-card"
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useTranslations } from "@/lib/i18n"
import {
  recipes as recipesApi,
  products as productsApi,
  type RecipeListItem,
  type Product,
} from "@/lib/api"
import { formatEUR } from "@/types"
import type { KPI } from "@/types"
import {
  ArrowUpDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Loader2Icon,
  UtensilsCrossedIcon,
  Trash2Icon,
} from "lucide-react"

interface DishUI {
  id: string
  name: string
  category: string
  price: number
  cost: number
  margin: number
  salesTrend: number
  ingredients: {
    id: string
    product_id: number
    name: string
    quantity: number
    unit: string
    cost: number
  }[]
}

function mapRecipeToUI(r: RecipeListItem): DishUI {
  return {
    id: String(r.id),
    name: r.name,
    category: r.category || "General",
    price: r.price,
    cost: r.cost,
    margin: Math.max(0, r.margin),
    salesTrend: r.sales_per_week,
    ingredients: [],
  }
}

const categoryColors: Record<string, string> = {
  antipasti: "#f97316", // orange
  primi: "#eab308", // yellow
  secondi: "#ef4444", // red
  dolci: "#ec4899", // pink
}

const chartConfig = {
  margin: { label: "Margin %" },
  antipasti: { label: "Antipasti", color: "#f97316" },
  primi: { label: "Primi", color: "#eab308" },
  secondi: { label: "Secondi", color: "#ef4444" },
  dolci: { label: "Dolci", color: "#ec4899" },
} satisfies ChartConfig

interface IngredientInput {
  product_id: number
  quantity: number
  unit: string
  product_name?: string
}

function AddRecipeDialog({ onAdd, availableProducts }: { onAdd: () => void; availableProducts: Product[] }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [ingredients, setIngredients] = React.useState<IngredientInput[]>([])
  const [loading, setLoading] = React.useState(false)

  // For adding new ingredient
  const [selectedProductId, setSelectedProductId] = React.useState<string>("")
  const [ingredientQty, setIngredientQty] = React.useState("")
  const [ingredientSearch, setIngredientSearch] = React.useState("")

  const filteredProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  )

  const handleAddIngredient = () => {
    if (!selectedProductId || !ingredientQty) return
    const product = availableProducts.find((p) => p.id === parseInt(selectedProductId))
    if (!product) return

    setIngredients((prev) => [
      ...prev,
      {
        product_id: product.id,
        quantity: parseFloat(ingredientQty),
        unit: product.unit || "",
        product_name: product.name,
      },
    ])
    setSelectedProductId("")
    setIngredientQty("")
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const created = await recipesApi.create({
        name,
        category,
        price: parseFloat(price) || 0,
        is_active: true,
        ingredients: ingredients.map((ing) => ({
          product_id: ing.product_id,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      })
      setOpen(false)
      onAdd()
      setName("")
      setCategory("")
      setPrice("")
      setIngredients([])
    } catch (err) {
      console.error("Failed to create recipe:", err)
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = selectedProductId ? availableProducts.find((p) => p.id === parseInt(selectedProductId)) : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="size-4 mr-2" />
            {t.products.addRecipe}
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.products.newRecipe}</DialogTitle>
          <DialogDescription>{t.products.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t.products.recipeName}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Risotto alla Milanese"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">{t.products.category}</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={t.products.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="antipasti">{t.products.antipasti}</SelectItem>
                  <SelectItem value="primi">{t.products.primi}</SelectItem>
                  <SelectItem value="secondi">{t.products.secondi}</SelectItem>
                  <SelectItem value="dolci">{t.products.dolci}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">{t.products.sellingPrice}</Label>
            <Input
              id="price"
              type="number"
              step="0.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Ingredients Section */}
          <div className="space-y-3">
            <Label>{t.products.ingredients}</Label>

            {/* Table-like ingredient input */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">{t.products.ingredient}</TableHead>
                    <TableHead className="w-28 text-right">{t.products.quantity}</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Existing ingredients */}
                  {ingredients.map((ing, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{ing.product_name}</TableCell>
                      <TableCell className="text-right">{ing.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{ing.unit}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleRemoveIngredient(idx)}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Add new row */}
                  <TableRow className="bg-muted/30">
                    <TableCell className="p-2">
                      <Select value={selectedProductId} onValueChange={(v) => v && setSelectedProductId(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select ingredient..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              placeholder="Search..."
                              value={ingredientSearch}
                              onChange={(e) => setIngredientSearch(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {filteredProducts.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                            {filteredProducts.length === 0 && (
                              <p className="p-2 text-sm text-muted-foreground text-center">No results</p>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={ingredientQty}
                        onChange={(e) => setIngredientQty(e.target.value)}
                        className="w-full text-right"
                      />
                    </TableCell>
                    <TableCell className="p-2 text-muted-foreground text-sm">
                      {selectedProduct?.unit || "-"}
                    </TableCell>
                    <TableCell className="p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={handleAddIngredient}
                        disabled={!selectedProductId || !ingredientQty}
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.products.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !category || loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : t.products.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProductsPage() {
  const t = useTranslations()
  const [dishList, setDishList] = React.useState<DishUI[]>([])
  const [availableProducts, setAvailableProducts] = React.useState<Product[]>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<string>("sales")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [recipes, products] = await Promise.all([
          recipesApi.list(),
          productsApi.list(),
        ])
        setDishList(recipes.map(mapRecipeToUI))
        setAvailableProducts(products)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate KPIs
  const totalDishes = dishList.length
  const avgMargin = totalDishes > 0 ? dishList.reduce((sum, d) => sum + d.margin, 0) / totalDishes : 0
  const bestSellers = dishList.filter((d) => d.salesTrend > 10).length
  const declining = dishList.filter((d) => d.salesTrend < -15).length

  const kpis: KPI[] = [
    { label: t.products.totalDishes, value: String(totalDishes) },
    { label: t.products.avgMargin, value: avgMargin.toFixed(1), trend: avgMargin > 60 ? "up" : avgMargin < 40 ? "down" : "neutral" },
    { label: t.products.bestSellers, value: String(bestSellers) },
    { label: t.products.declining, value: String(declining), trend: declining > 0 ? "down" : "neutral" },
  ]

  const refetchRecipes = async () => {
    try {
      const recipes = await recipesApi.list()
      setDishList(recipes.map(mapRecipeToUI))
    } catch (err) {
      console.error("Failed to refetch recipes:", err)
    }
  }

  const handleAddRecipe = async () => {
    await refetchRecipes()
  }

  const topMarginDishes = [...dishList]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10)
    .map((d) => ({
      name: d.name,
      margin: d.margin,
      category: d.category.toLowerCase(),
      fill: categoryColors[d.category.toLowerCase()] || "#94a3b8",
    }))

  const columns: ColumnDef<DishUI>[] = [
    {
      accessorKey: "name",
      header: t.products.dish,
      cell: ({ row }) => (
        <Link href={`/products/${row.original.id}`} className="font-medium text-foreground hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "category",
      header: t.products.category,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground capitalize">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.products.price}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => formatEUR(row.original.price),
    },
    {
      accessorKey: "cost",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.products.cost}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => formatEUR(row.original.cost),
    },
    {
      accessorKey: "margin",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.products.margin}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const margin = row.original.margin
        return (
          <span className={margin > 70 ? "text-green-600 dark:text-green-400 font-medium" : ""}>
            {margin.toFixed(1)}%
          </span>
        )
      },
    },
    {
      accessorKey: "salesTrend",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.products.salesWeek}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const trend = row.original.salesTrend
        const isPositive = trend >= 0
        return (
          <div className={`flex items-center gap-1 ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
            {trend}
          </div>
        )
      },
    },
  ]

  // Apply category filter and custom sorting
  const filteredAndSortedDishes = React.useMemo(() => {
    let result = [...dishList]
    if (categoryFilter !== "all") {
      result = result.filter((d) => d.category.toLowerCase() === categoryFilter)
    }
    switch (sortBy) {
      case "sales": result.sort((a, b) => b.salesTrend - a.salesTrend); break
      case "margin": result.sort((a, b) => b.margin - a.margin); break
      case "price": result.sort((a, b) => b.price - a.price); break
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break
    }
    return result
  }, [dishList, categoryFilter, sortBy])

  const table = useReactTable({
    data: filteredAndSortedDishes,
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
        title={t.products.title}
        description={t.products.description}
        actions={<AddRecipeDialog onAdd={handleAddRecipe} availableProducts={availableProducts} />}
      />

      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {kpis.map((kpi, idx) => (
          <KPICard
            key={idx}
            kpi={kpi}
            suffix={idx === 1 ? "%" : undefined}
          />
        ))}
      </div>

      {topMarginDishes.length > 0 && (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t.products.topMargin}</CardTitle>
              <div className="flex gap-4">
                {Object.entries(categoryColors).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="size-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-sm text-muted-foreground capitalize">{cat}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} style={{ height: Math.max(200, topMarginDishes.length * 40) }} className="w-full">
                <BarChart data={topMarginDishes} layout="vertical" barSize={24}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 13 }} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />}
                  />
                  <Bar dataKey="margin" radius={4}>
                    {topMarginDishes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder={t.products.searchDish}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={categoryFilter === "all" ? "default" : "outline"}
                    onClick={() => setCategoryFilter("all")}
                    className="h-9"
                  >
                    All
                  </Button>
                  {["antipasti", "primi", "secondi", "dolci"].map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={categoryFilter === cat ? "default" : "outline"}
                      onClick={() => setCategoryFilter(cat)}
                      className="h-9 gap-1.5"
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: categoryColors[cat] }}
                      />
                      <span className="capitalize">{cat}</span>
                    </Button>
                  ))}
                </div>
                <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Most sold</SelectItem>
                    <SelectItem value="margin">Highest margin</SelectItem>
                    <SelectItem value="price">Highest price</SelectItem>
                    <SelectItem value="name">A-Z</SelectItem>
                  </SelectContent>
                </Select>
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
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        {t.common.noResults}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} {t.products.dishes}
              </p>
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

      {dishList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <UtensilsCrossedIcon className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t.common.noResults}</h3>
          <p className="text-muted-foreground">Add your first recipe to get started</p>
        </div>
      )}
    </div>
  )
}
