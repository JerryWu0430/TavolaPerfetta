"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useTranslations } from "@/lib/i18n"
import {
  suppliers as suppliersApi,
  deliveries as deliveriesApi,
  type SupplierListItem,
} from "@/lib/api"
import { KPICard } from "@/components/kpi-card"
import type { KPI } from "@/types"
import {
  TruckIcon,
  PlusIcon,
  PackageIcon,
  Loader2Icon,
  SearchIcon,
  MapPinIcon,
  TrendingUpIcon,
  CalendarIcon,
  FileTextIcon,
} from "lucide-react"

const chartConfig = {
  priceChange: { label: "Price Change", color: "#f97316" },
} satisfies ChartConfig

function LogDeliveryDialog({
  supplierId,
  supplierName,
  onSuccess
}: {
  supplierId: number
  supplierName: string
  onSuccess: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [status, setStatus] = React.useState<"on_time" | "late" | "partial">("on_time")
  const [notes, setNotes] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await deliveriesApi.create({
        supplier_id: supplierId,
        date,
        status,
        notes: notes || undefined,
        items: [],
      })
      setOpen(false)
      setNotes("")
      setStatus("on_time")
      onSuccess()
    } catch (err) {
      console.error("Failed to create delivery:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="w-full" onClick={(e) => e.stopPropagation()}>
            <PackageIcon className="size-4 mr-1" />
            Log Delivery
          </Button>
        }
      />
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Log Delivery</DialogTitle>
          <DialogDescription>{supplierName}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Delivery Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_time">On Time</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SupplierCard({ supplier, onRefresh }: { supplier: SupplierListItem; onRefresh: () => void }) {
  return (
    <Card className="transition-colors hover:bg-muted/50 h-full flex flex-col">
      <Link href={`/suppliers/${supplier.id}`} className="flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <CardDescription className="capitalize">{supplier.category || "General"}</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={supplier.open_anomalies > 0 ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}
            >
              {supplier.open_anomalies > 0 ? `${supplier.open_anomalies} anomalies` : "OK"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <PackageIcon className="size-4 text-muted-foreground" />
              <span>{supplier.product_count} products</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUpIcon className={`size-4 ${supplier.price_change_pct > 0 ? "text-orange-500" : "text-green-500"}`} />
              <span className={supplier.price_change_pct > 0 ? "text-orange-600" : "text-green-600"}>
                {supplier.price_change_pct > 0 ? "+" : ""}{supplier.price_change_pct}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TruckIcon className="size-4" />
            <span>Reliability: <span className="font-medium text-foreground">{supplier.reliability_score}%</span></span>
          </div>

          {supplier.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPinIcon className="size-4" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}

          {supplier.last_delivery_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="size-4" />
              <span>Last delivery: {supplier.last_delivery_date}</span>
            </div>
          )}
        </CardContent>
      </Link>
      <CardContent className="pt-0 mt-auto">
        <div className="grid grid-cols-2 gap-2">
          <LogDeliveryDialog
            supplierId={supplier.id}
            supplierName={supplier.name}
            onSuccess={onRefresh}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            render={<Link href={`/bolla?supplier=${encodeURIComponent(supplier.name)}`} />}
            onClick={(e) => e.stopPropagation()}
          >
            <FileTextIcon className="size-4 mr-1" />
            Add Note
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AddSupplierDialog({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [contact, setContact] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await suppliersApi.create({
        name,
        category,
        contact_email: contact,
        address: address || undefined,
      })
      onAdd()
      setOpen(false)
      setName("")
      setCategory("")
      setContact("")
      setAddress("")
    } catch (err) {
      console.error("Failed to create supplier:", err)
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
            {t.suppliers.addSupplier}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.suppliers.newSupplier}</DialogTitle>
          <DialogDescription>{t.suppliers.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t.suppliers.supplierName}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Carni Pregiate Srl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">{t.suppliers.category}</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Meat, Vegetables, Dairy"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Via Roma 123, Milano"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact">{t.suppliers.email}</Label>
            <Input
              id="contact"
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="supplier@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.suppliers.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !category || loading}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : t.suppliers.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SuppliersPage() {
  const t = useTranslations()
  const [suppliers, setSuppliers] = React.useState<SupplierListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await suppliersApi.list()
      setSuppliers(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter suppliers by search
  const filteredSuppliers = React.useMemo(() => {
    if (!search) return suppliers
    const lower = search.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.category?.toLowerCase().includes(lower) ||
        s.address?.toLowerCase().includes(lower)
    )
  }, [suppliers, search])

  // Price trends chart data (top 6 by price change)
  const priceTrendsData = React.useMemo(() => {
    return [...suppliers]
      .filter((s) => s.price_change_pct !== 0)
      .sort((a, b) => Math.abs(b.price_change_pct) - Math.abs(a.price_change_pct))
      .slice(0, 6)
      .map((s) => ({
        name: s.name.length > 15 ? s.name.slice(0, 15) + "..." : s.name,
        priceChange: s.price_change_pct,
        fill: s.price_change_pct > 0 ? "#f97316" : "#22c55e",
      }))
  }, [suppliers])

  // Calculate KPIs
  const activeSuppliers = suppliers.length
  const openAnomalies = suppliers.reduce((sum, s) => sum + s.open_anomalies, 0)
  const avgReliability = suppliers.length > 0
    ? suppliers.reduce((sum, s) => sum + s.reliability_score, 0) / suppliers.length
    : 0
  const maxPriceIncrease = suppliers.length > 0
    ? Math.max(...suppliers.map((s) => s.price_change_pct), 0)
    : 0

  const kpis: KPI[] = [
    {
      label: t.suppliers.activeSuppliers,
      value: String(activeSuppliers),
      description: t.suppliers.total,
    },
    {
      label: t.suppliers.openAnomalies,
      value: String(openAnomalies),
      trend: openAnomalies > 0 ? "down" : "neutral",
      description: t.suppliers.lateOrPartial,
    },
    {
      label: t.suppliers.avgReliability,
      value: avgReliability.toFixed(1),
      trend: avgReliability >= 90 ? "up" : avgReliability >= 70 ? "neutral" : "down",
      description: t.suppliers.acrossSuppliers,
    },
    {
      label: t.suppliers.maxPriceIncrease,
      value: maxPriceIncrease.toFixed(1),
      trend: maxPriceIncrease > 5 ? "down" : "neutral",
      description: t.suppliers.fromPriceHistory,
    },
  ]

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
        title={t.suppliers.title}
        description={t.suppliers.description}
        actions={<AddSupplierDialog onAdd={fetchData} />}
      />

      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        {kpis.map((kpi, idx) => (
          <KPICard
            key={idx}
            kpi={kpi}
            suffix={idx === 2 || idx === 3 ? "%" : undefined}
          />
        ))}
      </div>

      {/* Price Trends Chart */}
      {priceTrendsData.length > 0 && (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="size-5 text-orange-500" />
                Price Trends
              </CardTitle>
              <CardDescription>Price change % by supplier (last 3 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={priceTrendsData} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
                  />
                  <Bar dataKey="priceChange" radius={4}>
                    {priceTrendsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="px-4 lg:px-6">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Supplier Cards */}
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} onRefresh={fetchData} />
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TruckIcon className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t.common.noResults}</h3>
          <p className="text-muted-foreground">
            {search ? "No suppliers match your search" : "Add your first supplier to get started"}
          </p>
        </div>
      )}
    </div>
  )
}
