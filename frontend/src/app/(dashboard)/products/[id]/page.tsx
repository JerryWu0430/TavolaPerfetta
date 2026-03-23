"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  recipes as recipesApi,
  products as productsApi,
  type Recipe,
  type Product,
} from "@/lib/api"
import { formatEUR } from "@/types"
import { useTranslations } from "@/lib/i18n"
import {
  ArrowLeftIcon,
  Loader2Icon,
  TrendingUpIcon,
  CakeIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  SaveIcon,
  XIcon,
} from "lucide-react"

const costChartConfig = {
  cost: { label: "Cost" },
} satisfies ChartConfig

const salesChartConfig = {
  quantity: { label: "Sales" },
} satisfies ChartConfig

const categories = ["antipasti", "primi", "secondi", "dolci"]

interface EditIngredient {
  product_id: number
  quantity: number
  unit: string
  waste_pct: number
  product_name?: string
}

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [recipe, setRecipe] = React.useState<Recipe | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  // Edit form state
  const [editName, setEditName] = React.useState("")
  const [editCategory, setEditCategory] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [editPrice, setEditPrice] = React.useState("")
  const [editIngredients, setEditIngredients] = React.useState<EditIngredient[]>([])

  // Products for ingredient selector
  const [availableProducts, setAvailableProducts] = React.useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = React.useState("")
  const [newIngQty, setNewIngQty] = React.useState("")
  const [newIngWaste, setNewIngWaste] = React.useState("0")
  const [productSearch, setProductSearch] = React.useState("")

  const id = params.id as string

  const loadRecipe = React.useCallback(async () => {
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
  }, [id])

  React.useEffect(() => {
    if (id) {
      loadRecipe()
      productsApi.list().then(setAvailableProducts).catch(console.error)
    }
  }, [id, loadRecipe])

  const startEditing = () => {
    if (!recipe) return
    setEditName(recipe.name)
    setEditCategory(recipe.category || "")
    setEditDescription(recipe.description || "")
    setEditPrice(String(recipe.price))
    setEditIngredients(
      recipe.ingredients.map((ing) => ({
        product_id: ing.product_id,
        quantity: ing.quantity,
        unit: ing.unit || "",
        waste_pct: ing.waste_pct,
        product_name: ing.product_name || "",
      }))
    )
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setSelectedProductId("")
    setNewIngQty("")
    setNewIngWaste("0")
  }

  const handleSave = async () => {
    if (!recipe) return
    try {
      setSaving(true)
      const updated = await recipesApi.update(parseInt(id), {
        name: editName,
        category: editCategory || undefined,
        description: editDescription || undefined,
        price: parseFloat(editPrice) || 0,
        ingredients: editIngredients.map((ing) => ({
          product_id: ing.product_id,
          quantity: ing.quantity,
          unit: ing.unit || undefined,
          waste_pct: ing.waste_pct,
        })),
      })
      setRecipe(updated)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await recipesApi.delete(parseInt(id))
      router.push("/products")
    } catch (err) {
      console.error("Failed to delete:", err)
      setDeleting(false)
    }
  }

  const addIngredient = () => {
    if (!selectedProductId || !newIngQty) return
    const product = availableProducts.find((p) => p.id === parseInt(selectedProductId))
    if (!product) return
    setEditIngredients((prev) => [
      ...prev,
      {
        product_id: product.id,
        quantity: parseFloat(newIngQty) || 0,
        unit: product.unit || "",
        waste_pct: parseFloat(newIngWaste) || 0,
        product_name: product.name,
      },
    ])
    setSelectedProductId("")
    setNewIngQty("")
    setNewIngWaste("0")
  }

  const removeIngredient = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof EditIngredient, value: string | number) => {
    setEditIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )
  }

  const filteredProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const selectedProduct = selectedProductId
    ? availableProducts.find((p) => p.id === parseInt(selectedProductId))
    : null

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
      <div className="flex items-center justify-between">
        <Link href="/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeftIcon className="size-4" />
          Back to products
        </Link>
        {!isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEditing}>
              <PencilIcon className="size-4 mr-1" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm" disabled={deleting}>
                    {deleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4 mr-1" />}
                    Delete
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{recipe.name}&quot;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} variant="destructive">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEditing}>
              <XIcon className="size-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4 mr-1" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Recipe Icon */}
            <div className="size-14 rounded-lg bg-amber-100 flex items-center justify-center">
              <CakeIcon className="size-7 text-amber-600" />
            </div>

            <div className="flex-1">
              {isEditing ? (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={editCategory} onValueChange={(v) => v && setEditCategory(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="capitalize">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Recipe description..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {!isEditing && recipe.description && (
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
            {isEditing ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase">Ingredient</TableHead>
                      <TableHead className="text-xs uppercase w-24">Qty</TableHead>
                      <TableHead className="text-xs uppercase w-20">Waste%</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editIngredients.map((ing, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{ing.product_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="1"
                            value={ing.waste_pct}
                            onChange={(e) => updateIngredient(idx, "waste_pct", parseFloat(e.target.value) || 0)}
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => removeIngredient(idx)}>
                            <Trash2Icon className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Add new ingredient row */}
                    <TableRow className="bg-muted/30">
                      <TableCell>
                        <Select value={selectedProductId} onValueChange={(v) => v && setSelectedProductId(v)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Add ingredient..." />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Search..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                              {filteredProducts.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </div>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={newIngQty}
                          onChange={(e) => setNewIngQty(e.target.value)}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          value={newIngWaste}
                          onChange={(e) => setNewIngWaste(e.target.value)}
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={addIngredient}
                          disabled={!selectedProductId || !newIngQty}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">
                    Unit: {selectedProduct.unit} · Price: {formatEUR(selectedProduct.unit_price)}/{selectedProduct.unit}
                  </p>
                )}
              </div>
            ) : (
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
            )}
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
