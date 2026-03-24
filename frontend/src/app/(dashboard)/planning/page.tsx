"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"

import { PageHeader } from "@/components/page-header"
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useTranslations } from "@/lib/i18n"
import {
  inventory as inventoryApi,
  recipes as recipesApi,
  orders as ordersApi,
  type InventoryItem,
  type RecipeListItem,
  type Recipe,
  type Order,
} from "@/lib/api"
import { formatEUR } from "@/types"
import {
  Loader2Icon,
  AlertTriangleIcon,
  MinusIcon,
  PlusIcon,
  PackageIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  SearchIcon,
  ChefHatIcon,
  ShoppingCartIcon,
  WarehouseIcon,
} from "lucide-react"

type MenuType = "tasting" | "alacarte"

interface IngredientNeed {
  productId: number
  productName: string
  unit: string | null
  neededQty: number
  currentQty: number
  afterEvent: number
  shortage: number
}

interface AtRiskRecipe {
  id: number
  name: string
  missingIngredients: { name: string; needed: number; have: number; unit: string | null }[]
}

const chartConfig = {
  shortage: { label: "Shortage", color: "#ef4444" },
  afterEvent: { label: "After Event", color: "#22c55e" },
} satisfies ChartConfig

const MENU_TYPES: { value: MenuType; label: string; desc: string }[] = [
  { value: "tasting", label: "Tasting Menu", desc: "Fixed courses per guest" },
  { value: "alacarte", label: "À la Carte", desc: "Estimated from history" },
]

export default function PlanningPage() {
  const t = useTranslations()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Data
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>([])
  const [recipeList, setRecipeList] = React.useState<RecipeListItem[]>([])
  const [fullRecipes, setFullRecipes] = React.useState<Map<number, Recipe>>(new Map())
  const [orders, setOrders] = React.useState<Order[]>([])

  // Inputs
  const [covers, setCovers] = React.useState<number>(50)
  const [menuType, setMenuType] = React.useState<MenuType>("tasting")
  const [selectedRecipes, setSelectedRecipes] = React.useState<Set<number>>(new Set())
  const [manualDishesPerCover, setManualDishesPerCover] = React.useState<number | null>(null)
  const [recipeSearch, setRecipeSearch] = React.useState("")

  // Load initial data
  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [inv, recipes, ordersData] = await Promise.all([
          inventoryApi.list(),
          recipesApi.list({ is_active: true }),
          ordersApi.list({
            start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
          }),
        ])
        setInventoryItems(inv)
        setRecipeList(recipes)
        setOrders(ordersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Load full recipe details when recipes are selected
  React.useEffect(() => {
    async function loadRecipeDetails() {
      const toLoad = Array.from(selectedRecipes).filter((id) => !fullRecipes.has(id))
      if (toLoad.length === 0) return

      try {
        const loaded = await Promise.all(toLoad.map((id) => recipesApi.get(id)))
        setFullRecipes((prev) => {
          const next = new Map(prev)
          for (const recipe of loaded) {
            next.set(recipe.id, recipe)
          }
          return next
        })
      } catch (err) {
        console.error("Failed to load recipe details:", err)
      }
    }
    loadRecipeDetails()
  }, [selectedRecipes, fullRecipes])

  // Calculate avg dishes per cover from historical data
  const avgDishesPerCover = React.useMemo(() => {
    if (orders.length === 0) return null
    let totalDishes = 0
    let totalCovers = 0
    for (const order of orders) {
      const dishCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
      totalDishes += dishCount
      totalCovers += Math.ceil(dishCount / 2.5)
    }
    if (totalCovers === 0) return null
    return totalDishes / totalCovers
  }, [orders])

  const hasEnoughData = avgDishesPerCover !== null && orders.length >= 10

  // Effective dishes per cover
  const effectiveDishesPerCover = React.useMemo(() => {
    if (menuType === "tasting") return selectedRecipes.size
    if (manualDishesPerCover !== null) return manualDishesPerCover
    return avgDishesPerCover || 2.5
  }, [menuType, manualDishesPerCover, avgDishesPerCover, selectedRecipes.size])

  // Calculate ingredient needs
  const ingredientNeeds = React.useMemo(() => {
    const needs = new Map<number, IngredientNeed>()

    if (menuType === "tasting") {
      for (const recipeId of selectedRecipes) {
        const recipe = fullRecipes.get(recipeId)
        if (!recipe) continue
        for (const ing of recipe.ingredients) {
          const existing = needs.get(ing.product_id)
          const wasteFactor = 1 + (ing.waste_pct || 0) / 100
          const neededForRecipe = ing.quantity * covers * wasteFactor
          if (existing) {
            existing.neededQty += neededForRecipe
          } else {
            const invItem = inventoryItems.find((i) => i.product_id === ing.product_id)
            needs.set(ing.product_id, {
              productId: ing.product_id,
              productName: ing.product_name || `Product ${ing.product_id}`,
              unit: ing.unit,
              neededQty: neededForRecipe,
              currentQty: invItem?.quantity || 0,
              afterEvent: 0,
              shortage: 0,
            })
          }
        }
      }
    } else {
      const recipesToUse = selectedRecipes.size > 0
        ? Array.from(selectedRecipes).map((id) => fullRecipes.get(id)).filter(Boolean) as Recipe[]
        : []
      if (recipesToUse.length === 0) return []
      const totalDishes = covers * effectiveDishesPerCover
      const dishesPerRecipe = totalDishes / recipesToUse.length
      for (const recipe of recipesToUse) {
        for (const ing of recipe.ingredients) {
          const existing = needs.get(ing.product_id)
          const wasteFactor = 1 + (ing.waste_pct || 0) / 100
          const neededForRecipe = ing.quantity * dishesPerRecipe * wasteFactor
          if (existing) {
            existing.neededQty += neededForRecipe
          } else {
            const invItem = inventoryItems.find((i) => i.product_id === ing.product_id)
            needs.set(ing.product_id, {
              productId: ing.product_id,
              productName: ing.product_name || `Product ${ing.product_id}`,
              unit: ing.unit,
              neededQty: neededForRecipe,
              currentQty: invItem?.quantity || 0,
              afterEvent: 0,
              shortage: 0,
            })
          }
        }
      }
    }

    const result: IngredientNeed[] = []
    for (const need of needs.values()) {
      need.afterEvent = need.currentQty - need.neededQty
      need.shortage = Math.max(0, -need.afterEvent)
      result.push(need)
    }
    return result.sort((a, b) => b.shortage - a.shortage)
  }, [covers, menuType, selectedRecipes, fullRecipes, inventoryItems, effectiveDishesPerCover])

  const replenishmentList = React.useMemo(() => ingredientNeeds.filter((n) => n.shortage > 0), [ingredientNeeds])

  const atRiskRecipes = React.useMemo(() => {
    const risks: AtRiskRecipe[] = []
    const recipesToCheck = selectedRecipes.size > 0
      ? Array.from(selectedRecipes).map((id) => fullRecipes.get(id)).filter(Boolean) as Recipe[]
      : []
    for (const recipe of recipesToCheck) {
      const missing: AtRiskRecipe["missingIngredients"] = []
      for (const ing of recipe.ingredients) {
        const need = ingredientNeeds.find((n) => n.productId === ing.product_id)
        if (need && need.shortage > 0) {
          const invItem = inventoryItems.find((i) => i.product_id === ing.product_id)
          const have = invItem?.quantity || 0
          const perServing = ing.quantity * (1 + (ing.waste_pct || 0) / 100)
          const neededForThisRecipe = perServing * (menuType === "tasting" ? covers : covers * effectiveDishesPerCover / recipesToCheck.length)
          if (have < neededForThisRecipe) {
            missing.push({ name: ing.product_name || `Product ${ing.product_id}`, needed: neededForThisRecipe, have, unit: ing.unit })
          }
        }
      }
      if (missing.length > 0) risks.push({ id: recipe.id, name: recipe.name, missingIngredients: missing })
    }
    return risks
  }, [selectedRecipes, fullRecipes, ingredientNeeds, inventoryItems, covers, menuType, effectiveDishesPerCover])

  const shortageChartData = React.useMemo(() => {
    return replenishmentList.slice(0, 6).map((item) => ({
      name: item.productName.length > 10 ? item.productName.slice(0, 10) + "…" : item.productName,
      shortage: item.shortage,
      fill: "#ef4444",
    }))
  }, [replenishmentList])

  const toggleRecipe = (id: number) => {
    setSelectedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredRecipes = React.useMemo(() => {
    if (!recipeSearch) return recipeList
    return recipeList.filter((r) => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
  }, [recipeList, recipeSearch])

  // Group recipes by category
  const recipesByCategory = React.useMemo(() => {
    const grouped = new Map<string, RecipeListItem[]>()
    for (const recipe of filteredRecipes) {
      const cat = recipe.category || "Other"
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push(recipe)
    }
    return grouped
  }, [filteredRecipes])

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

  const totalDishes = menuType === "tasting" ? covers * selectedRecipes.size : Math.round(covers * effectiveDishesPerCover)

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <PageHeader title={t.planning.title} description="Plan events and calculate ingredient requirements" />

      {/* Event Configuration - Compact */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap items-end gap-6 p-4 rounded-lg border bg-muted/30">
          <div className="grid gap-6 flex-1 @xl/main:grid-cols-3">
              {/* Covers */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Covers
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full shrink-0"
                    onClick={() => setCovers((c) => Math.max(1, c - 10))}
                  >
                    <MinusIcon className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={covers}
                    onChange={(e) => setCovers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center text-xl font-semibold h-10"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full shrink-0"
                    onClick={() => setCovers((c) => c + 10)}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Menu Type */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Menu Type
                </label>
                <div className="flex gap-2">
                  {MENU_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setMenuType(type.value)}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all text-left ${
                        menuType === type.value
                          ? "border-orange-500 bg-orange-50"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className={`font-medium text-sm ${menuType === type.value ? "text-orange-600" : ""}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dishes per Cover */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dishes / Cover
                </label>
                {menuType === "tasting" ? (
                  <div className="h-10 flex items-center justify-center rounded-lg bg-muted/50 border border-dashed text-sm">
                    <span className="font-semibold">{selectedRecipes.size}</span>
                    <span className="text-muted-foreground ml-1">dishes (fixed by selection)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={Math.round((manualDishesPerCover ?? avgDishesPerCover ?? 2.5) * 10) / 10}
                      onChange={(e) => setManualDishesPerCover(parseFloat(e.target.value) || null)}
                      className="h-10 text-center font-semibold"
                    />
                    {!hasEnoughData ? (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircleIcon className="size-3" />
                        Set manually (insufficient data)
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Historical avg: {avgDishesPerCover?.toFixed(1)} dishes
                      </p>
                    )}
                  </div>
                )}
              </div>
          </div>

          {/* Summary inline */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center px-3">
              <p className="text-xs text-muted-foreground">Dishes</p>
              <p className="font-semibold">{totalDishes}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center px-3">
              <p className="text-xs text-muted-foreground">Recipes</p>
              <p className="font-semibold">{selectedRecipes.size}</p>
            </div>
            {replenishmentList.length > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                  <AlertTriangleIcon className="size-3 mr-1" />
                  {replenishmentList.length} to order
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recipe Selection */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ChefHatIcon className="size-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {menuType === "tasting" ? "Tasting Menu" : "Recipe Selection"}
                  </CardTitle>
                  <CardDescription>
                    {menuType === "tasting" ? "Each guest receives all selected dishes" : "Select dishes for your event"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recipes..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedRecipes(new Set(recipeList.map((r) => r.id)))}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedRecipes(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {Array.from(recipesByCategory.entries()).map(([category, recipes]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {category}
                  </p>
                  <div className="grid grid-cols-2 @xl/main:grid-cols-3 @3xl/main:grid-cols-4 gap-2">
                    {recipes.map((recipe) => {
                      const isSelected = selectedRecipes.has(recipe.id)
                      return (
                        <button
                          key={recipe.id}
                          onClick={() => toggleRecipe(recipe.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "bg-orange-50 border-orange-300 shadow-sm"
                              : "hover:bg-muted/50 border-transparent bg-muted/30"
                          }`}
                        >
                          <div className={`size-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-orange-500 border-orange-500" : "border-muted-foreground/30"
                          }`}>
                            {isSelected && <CheckCircle2Icon className="size-3 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{recipe.name}</p>
                            <p className="text-xs text-muted-foreground">{formatEUR(recipe.price)} · {recipe.margin.toFixed(0)}% margin</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {selectedRecipes.size > 0 && (
        <>
          {/* At-Risk Alert */}
          {atRiskRecipes.length > 0 && (
            <div className="px-4 lg:px-6">
              <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangleIcon className="size-5" />
                    {atRiskRecipes.length} Recipe{atRiskRecipes.length > 1 ? "s" : ""} at Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {atRiskRecipes.map((recipe) => (
                      <div key={recipe.id} className="px-3 py-2 bg-white rounded-lg border border-red-200 shadow-sm">
                        <p className="font-medium text-sm">{recipe.name}</p>
                        <p className="text-xs text-red-600">
                          Missing: {recipe.missingIngredients.map((i) => i.name).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Two Column Results */}
          <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
            {/* Replenishment */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <ShoppingCartIcon className="size-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Replenishment List</CardTitle>
                    <CardDescription>Items to order before event</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {replenishmentList.length > 0 ? (
                  <div className="space-y-4">
                    {shortageChartData.length > 0 && (
                      <ChartContainer config={chartConfig} className="w-full" style={{ height: `${Math.max(100, shortageChartData.length * 28)}px` }}>
                        <BarChart data={shortageChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="shortage" radius={4}>
                            {shortageChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill="#ef4444" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    )}
                    <div className="max-h-[200px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Order</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {replenishmentList.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell className="py-2">{item.productName}</TableCell>
                              <TableCell className="py-2 text-right font-medium text-red-600">
                                {item.shortage.toFixed(1)} {item.unit}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2Icon className="size-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium text-green-600">All ingredients available!</p>
                    <p className="text-sm text-muted-foreground">No ordering required</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projected Inventory */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <WarehouseIcon className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Projected Inventory</CardTitle>
                    <CardDescription>Stock levels after {covers} covers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Now</TableHead>
                        <TableHead className="text-right">Need</TableHead>
                        <TableHead className="text-right">After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientNeeds.map((item) => (
                        <TableRow key={item.productId} className={item.shortage > 0 ? "bg-red-50/50" : ""}>
                          <TableCell className="py-2 font-medium">{item.productName}</TableCell>
                          <TableCell className="py-2 text-right text-muted-foreground">
                            {item.currentQty.toFixed(1)}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {item.neededQty.toFixed(1)}
                          </TableCell>
                          <TableCell className={`py-2 text-right font-medium ${item.afterEvent < 0 ? "text-red-600" : "text-green-600"}`}>
                            {item.afterEvent.toFixed(1)} {item.unit}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty State */}
      {selectedRecipes.size === 0 && (
        <div className="px-4 lg:px-6">
          <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-12 text-center">
            <ChefHatIcon className="size-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium mb-1">No recipes selected</p>
            <p className="text-muted-foreground">Select dishes above to calculate ingredient requirements</p>
          </div>
        </div>
      )}
    </div>
  )
}
