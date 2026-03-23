"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { recipes as recipesApi, type Recipe } from "@/lib/api"
import { formatEUR } from "@/types"
import { useTranslations } from "@/lib/i18n"
import {
  ArrowLeftIcon,
  Loader2Icon,
  TrendingUpIcon,
  CakeIcon,
} from "lucide-react"

const costChartConfig = {
  cost: { label: "Cost" },
} satisfies ChartConfig

const salesChartConfig = {
  quantity: { label: "Sales" },
} satisfies ChartConfig

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [recipe, setRecipe] = React.useState<Recipe | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const id = params.id as string

  React.useEffect(() => {
    async function loadRecipe() {
      try {
        setLoading(true)
        const data = await recipesApi.get(parseInt(id))
        setRecipe(data)
      } catch (err) {
        console.error("Failed to load recipe:", err)
        setError("Failed to load recipe")
      } finally {
        setLoading(false)
      }
    }
    if (id) {
      loadRecipe()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">{error || "Recipe not found"}</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeftIcon className="size-4 mr-2" />
          Back to products
        </Button>
      </div>
    )
  }

  const costData = recipe.ingredients.map((ing) => ({
    name: ing.product_name?.split(" ")[0] || "Unknown",
    cost: ing.cost,
  }))

  const salesData = recipe.weekly_sales.map((ws) => ({
    week: ws.week,
    quantity: ws.quantity,
  }))

  const maxSales = Math.max(...salesData.map((d) => d.quantity), 1)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back button */}
      <Link href="/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeftIcon className="size-4" />
        Back to products
      </Link>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Recipe Icon */}
            <div className="size-14 rounded-lg bg-amber-100 flex items-center justify-center">
              <CakeIcon className="size-7 text-amber-600" />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{recipe.name}</h1>
                  <p className="text-muted-foreground capitalize">{recipe.category}</p>
                </div>
                {recipe.is_best_seller && (
                  <Badge variant="outline" className="text-orange-500 border-orange-300 bg-orange-50">
                    <TrendingUpIcon className="size-3 mr-1" />
                    Best Seller
                  </Badge>
                )}
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-xl font-semibold">{formatEUR(recipe.price)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Recipe Cost</p>
                  <p className="text-xl font-semibold">{formatEUR(recipe.cost)}</p>
                </div>
                <div className="rounded-lg bg-green-100 p-3 text-center">
                  <p className="text-sm text-green-700">Margin</p>
                  <p className="text-xl font-semibold text-green-700">{formatEUR(recipe.margin_value)}</p>
                </div>
                <div className="rounded-lg bg-green-100 p-3 text-center">
                  <p className="text-sm text-green-700">Margin %</p>
                  <p className="text-xl font-semibold text-green-700">{recipe.margin.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {recipe.description && (
            <p className="text-muted-foreground mt-4 italic">{recipe.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingredients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients & Recipe</CardTitle>
            <CardDescription>Cost per serving</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase text-muted-foreground">Ingredient</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground text-right">Quantity</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground text-right">Cost</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground text-right">Waste%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipe.ingredients.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ing.product_name}</p>
                        {ing.supplier_name && (
                          <p className="text-xs text-muted-foreground">{ing.supplier_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {ing.quantity} {ing.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatEUR(ing.cost)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ing.waste_pct}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={2} className="font-semibold">
                    Total recipe cost
                  </TableCell>
                  <TableCell className="text-right font-semibold text-orange-600">
                    {formatEUR(recipe.cost)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Charts Column */}
        <div className="flex flex-col gap-6">
          {/* Cost by Ingredient Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Ingredient</CardTitle>
            </CardHeader>
            <CardContent>
              {costData.length > 0 ? (
                <ChartContainer config={costChartConfig} className="h-[200px] w-full">
                  <BarChart data={costData} layout="horizontal">
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => formatEUR(Number(value))} />}
                    />
                    <Bar dataKey="cost" radius={4}>
                      {costData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#f97316" : "#e5e7eb"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No ingredients</p>
              )}
            </CardContent>
          </Card>

          {/* Sales Last 4 Weeks Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales — Last 4 Weeks</CardTitle>
            </CardHeader>
            <CardContent>
              {salesData.length > 0 ? (
                <ChartContainer config={salesChartConfig} className="h-[200px] w-full">
                  <BarChart data={salesData} layout="horizontal">
                    <XAxis dataKey="week" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, maxSales * 1.2]} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="quantity" radius={4}>
                      {salesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === salesData.length - 1 ? "#f97316" : "#e5e7eb"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No sales data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
