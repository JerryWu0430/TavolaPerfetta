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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations } from "@/lib/i18n"
import { dishes, topMarginDishes } from "@/data/mock/products"
import { formatEUR } from "@/types"
import type { Dish } from "@/types"
import { ArrowUpDownIcon, TrendingUpIcon, TrendingDownIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const chartConfig = {
  margin: {
    label: "Margin %",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function RecipeDrawer({ dish }: { dish: Dish }) {
  const t = useTranslations()
  const isMobile = useIsMobile()
  const totalCost = dish.ingredients.reduce((sum, ing) => sum + ing.cost, 0)

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">{dish.name}</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{dish.name}</DrawerTitle>
          <DrawerDescription>{t.products.recipeDetail}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{t.products.price}</p>
              <p className="text-xl font-semibold">{formatEUR(dish.price)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{t.products.cost}</p>
              <p className="text-xl font-semibold">{formatEUR(dish.cost)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{t.products.margin}</p>
              <p className="text-xl font-semibold">{dish.margin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">{t.products.ingredients}</h4>
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
                  {dish.ingredients.map((ing) => (
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

export default function ProductsPage() {
  const t = useTranslations()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<Dish>[] = [
    {
      accessorKey: "name",
      header: t.products.dish,
      cell: ({ row }) => <RecipeDrawer dish={row.original} />,
    },
    {
      accessorKey: "category",
      header: t.products.category,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground">
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
      header: t.products.cost,
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
          <span className={margin > 70 ? "text-green-600 dark:text-green-400" : ""}>
            {margin.toFixed(1)}%
          </span>
        )
      },
    },
    {
      accessorKey: "salesTrend",
      header: t.products.salesTrend,
      cell: ({ row }) => {
        const trend = row.original.salesTrend
        const isPositive = trend >= 0
        return (
          <div className={`flex items-center gap-1 ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
            {isPositive ? "+" : ""}{trend.toFixed(1)}%
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: dishes,
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

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageHeader
        title={t.products.title}
        description={t.products.description}
      />

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
    </div>
  )
}
