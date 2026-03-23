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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations } from "@/lib/i18n"
import {
  recipes as recipesApi,
  type Recipe,
  type RecipeListItem,
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
    margin: r.margin,
    salesTrend: r.sales_per_week,
    ingredients: [],
  }
}

function mapFullRecipeToUI(r: Recipe): DishUI {
  return {
    id: String(r.id),
    name: r.name,
    category: r.category || "General",
    price: r.price,
    cost: r.cost,
    margin: r.margin,
    salesTrend: 0,
    ingredients: r.ingredients.map((ing) => ({
      id: String(ing.id),
      name: ing.product_name || `Product ${ing.product_id}`,
      quantity: ing.quantity,
      unit: ing.unit || "",
      cost: (ing.product_unit_price || 0) * ing.quantity,
    })),
  }
}

const chartConfig = {
  margin: {
    label: "Margin %",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function RecipeDrawer({ dish, onLoadDetails }: { dish: DishUI; onLoadDetails: (id: string) => Promise<DishUI> }) {
  const t = useTranslations()
  const isMobile = useIsMobile()
  const [fullDish, setFullDish] = React.useState<DishUI | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleOpen = async (open: boolean) => {
    if (open && !fullDish) {
      setLoading(true)
      try {
        const details = await onLoadDetails(dish.id)
        setFullDish(details)
      } catch (err) {
        console.error("Failed to load recipe details:", err)
      } finally {
        setLoading(false)
      }
    }
  }

  const displayDish = fullDish || dish
  const totalCost = displayDish.ingredients.reduce((sum, ing) => sum + ing.cost, 0)

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} onOpenChange={handleOpen}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">{dish.name}</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{displayDish.name}</DrawerTitle>
          <DrawerDescription>{t.products.recipeDetail}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{t.products.price}</p>
              <p className="text-xl font-semibold">{formatEUR(displayDish.price)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{t.products.cost}</p>
              <p className="text-xl font-semibold">{formatEUR(displayDish.cost)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{t.products.margin}</p>
              <p className="text-xl font-semibold">{displayDish.margin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">{t.products.ingredients}</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayDish.ingredients.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.products.ingredient}</TableHead>
                      <TableHead className="text-right">{t.products.quantity}</TableHead>
                      <TableHead className="text-right">{t.products.cost}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayDish.ingredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell>{ing.name}</TableCell>
                        <TableCell className="text-right">
                          {ing.quantity} {ing.unit}
                        </TableCell>
                        <TableCell className="text-right">{formatEUR(ing.cost)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={2} className="font-medium">
                        {t.products.total}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEUR(totalCost)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No ingredients defined</p>
            )}
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

function AddRecipeDialog({ onAdd }: { onAdd: (recipe: DishUI) => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const created = await recipesApi.create({
        name,
        category,
        price: parseFloat(price) || 0,
        is_active: true,
      })
      onAdd(mapFullRecipeToUI(created))
      setOpen(false)
      setName("")
      setCategory("")
      setPrice("")
    } catch (err) {
      console.error("Failed to create recipe:", err)
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
            {t.products.addRecipe}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.products.newRecipe}</DialogTitle>
          <DialogDescription>{t.products.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchRecipes() {
      try {
        setLoading(true)
        const data = await recipesApi.list()
        setDishList(data.map(mapRecipeToUI))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipes")
      } finally {
        setLoading(false)
      }
    }
    fetchRecipes()
  }, [])

  const loadRecipeDetails = async (id: string): Promise<DishUI> => {
    const recipe = await recipesApi.get(parseInt(id))
    return mapFullRecipeToUI(recipe)
  }

  // Calculate KPIs
  const totalDishes = dishList.length
  const avgMargin = totalDishes > 0 ? dishList.reduce((sum, d) => sum + d.margin, 0) / totalDishes : 0
  const bestSellers = dishList.filter((d) => d.salesTrend > 10).length
  const declining = dishList.filter((d) => d.salesTrend < -15).length

  const kpis: KPI[] = [
    {
      label: t.products.totalDishes,
      value: String(totalDishes),
      change: 2,
      trend: "up",
    },
    {
      label: t.products.avgMargin,
      value: avgMargin.toFixed(1),
      change: 1.5,
      trend: "up",
    },
    {
      label: t.products.bestSellers,
      value: String(bestSellers),
      change: 8,
      trend: "up",
      description: t.products.dishesAbove50,
    },
    {
      label: t.products.declining,
      value: String(declining),
      change: -2,
      trend: declining > 0 ? "down" : "neutral",
      description: t.products.dishesDown20,
    },
  ]

  const handleAddRecipe = (recipe: DishUI) => {
    setDishList((prev) => [...prev, recipe])
  }

  const topMarginDishes = [...dishList]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10)
    .map((d) => ({
      name: d.name,
      margin: d.margin,
    }))

  const columns: ColumnDef<DishUI>[] = [
    {
      accessorKey: "name",
      header: t.products.dish,
      cell: ({ row }) => <RecipeDrawer dish={row.original} onLoadDetails={loadRecipeDetails} />,
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

  const table = useReactTable({
    data: dishList,
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
        actions={<AddRecipeDialog onAdd={handleAddRecipe} />}
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
            <CardHeader>
              <CardTitle>{t.products.topMargin}</CardTitle>
              <CardDescription>{t.products.topMarginDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                <BarChart data={topMarginDishes} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />}
                  />
                  <Bar dataKey="margin" fill="var(--color-margin)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t.products.menu}</CardTitle>
                <CardDescription>{t.products.menuDesc}</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder={t.products.searchDish}
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
