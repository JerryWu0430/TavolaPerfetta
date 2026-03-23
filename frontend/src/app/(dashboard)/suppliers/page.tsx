"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
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
import { ReliabilityBadge, PriceChangeBadge } from "@/components/status-badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations, useI18n } from "@/lib/i18n"
import {
  suppliers as suppliersApi,
  deliveries as deliveriesApi,
  priceHistory as priceHistoryApi,
  type Supplier as APISupplier,
  type Delivery as APIDelivery,
  type PriceHistoryRecord,
} from "@/lib/api"
import { KPICard } from "@/components/kpi-card"
import type { KPI } from "@/types"
import {
  TruckIcon,
  ClockIcon,
  MailIcon,
  CalendarIcon,
  PlusIcon,
  FileTextIcon,
  PackageIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  Loader2Icon,
} from "lucide-react"

interface SupplierUI {
  id: string
  name: string
  category: string
  reliability: number
  avgDeliveryDays: number
  priceChange: number
  lastOrder: string
  contact: string
}

interface Delivery {
  id: string
  date: string
  items: number
  status: "onTime" | "late" | "partial"
  notes?: string
}

function mapSupplierToUI(s: APISupplier): SupplierUI {
  return {
    id: String(s.id),
    name: s.name,
    category: s.category || "General",
    reliability: s.reliability_score,
    avgDeliveryDays: s.avg_delivery_days,
    priceChange: 0, // Will be computed from price history
    lastOrder: s.updated_at,
    contact: s.contact_email || s.contact_phone || "",
  }
}

function mapDeliveryToUI(d: APIDelivery): Delivery {
  return {
    id: String(d.id),
    date: d.date,
    items: d.items?.length || 0,
    status: d.status === "on_time" ? "onTime" : d.status === "late" ? "late" : "partial",
    notes: d.notes || undefined,
  }
}

function DeliveryStatusBadge({ status }: { status: Delivery["status"] }) {
  const t = useTranslations()
  switch (status) {
    case "onTime":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2Icon className="size-3 mr-1" />
          {t.suppliers.onTime}
        </Badge>
      )
    case "late":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
          <AlertTriangleIcon className="size-3 mr-1" />
          {t.suppliers.late}
        </Badge>
      )
    case "partial":
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          <PackageIcon className="size-3 mr-1" />
          {t.suppliers.partial}
        </Badge>
      )
  }
}

function LogDeliveryDialog({ supplier, onLog }: { supplier: SupplierUI; onLog: (delivery: Delivery) => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [items, setItems] = React.useState("")
  const [status, setStatus] = React.useState<Delivery["status"]>("onTime")
  const [notes, setNotes] = React.useState("")

  const handleSubmit = async () => {
    try {
      await deliveriesApi.create({
        supplier_id: parseInt(supplier.id),
        date,
        status: status === "onTime" ? "on_time" : status,
        notes: notes || undefined,
        items: [],
      })
      onLog({
        id: `d-${Date.now()}`,
        date,
        items: parseInt(items) || 0,
        status,
        notes: notes || undefined,
      })
      setOpen(false)
      setItems("")
      setNotes("")
      setStatus("onTime")
    } catch (err) {
      console.error("Failed to create delivery:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PackageIcon className="size-4 mr-2" />
            {t.suppliers.logDelivery}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.suppliers.logDelivery}</DialogTitle>
          <DialogDescription>{supplier.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">{t.suppliers.deliveryDate}</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="items">{t.suppliers.items}</Label>
            <Input
              id="items"
              type="number"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">{t.suppliers.status}</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as Delivery["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onTime">{t.suppliers.onTime}</SelectItem>
                <SelectItem value="late">{t.suppliers.late}</SelectItem>
                <SelectItem value="partial">{t.suppliers.partial}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">{t.suppliers.notes}</Label>
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
            {t.suppliers.cancel}
          </Button>
          <Button onClick={handleSubmit}>{t.suppliers.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SupplierCard({
  supplier,
  deliveries,
  onLogDelivery,
}: {
  supplier: SupplierUI
  deliveries: Delivery[]
  onLogDelivery: (delivery: Delivery) => void
}) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{supplier.name}</CardTitle>
                <CardDescription>{supplier.category}</CardDescription>
              </div>
              <PriceChangeBadge change={supplier.priceChange} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TruckIcon className="size-4 text-muted-foreground" />
                <span>{t.suppliers.reliability}:</span>
                <ReliabilityBadge percentage={supplier.reliability} />
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                <span>
                  {supplier.avgDeliveryDays}{" "}
                  {supplier.avgDeliveryDays === 1 ? t.suppliers.day : t.suppliers.days}{" "}
                  {t.suppliers.delivery}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{supplier.name}</DrawerTitle>
          <DrawerDescription>{t.suppliers.details}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              render={<Link href={`/bolla?supplier=${encodeURIComponent(supplier.name)}`} />}
            >
              <FileTextIcon className="size-4 mr-2" />
              {t.suppliers.addDeliveryNote}
            </Button>
            <LogDeliveryDialog supplier={supplier} onLog={onLogDelivery} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TruckIcon className="size-4" />
                {t.suppliers.reliability}
              </div>
              <p className="text-xl font-semibold">{supplier.reliability}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ClockIcon className="size-4" />
                {t.suppliers.deliveryTime}
              </div>
              <p className="text-xl font-semibold">
                {supplier.avgDeliveryDays} {t.suppliers.days}
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MailIcon className="size-4" />
              {t.suppliers.contact}
            </div>
            <p className="font-medium">{supplier.contact || "N/A"}</p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CalendarIcon className="size-4" />
              {t.suppliers.lastOrder}
            </div>
            <p className="font-medium">
              {new Date(supplier.lastOrder).toLocaleDateString(
                locale === "it" ? "it-IT" : "en-US",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </p>
          </div>

          {deliveries.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">{t.suppliers.recentDeliveries}</h4>
              <div className="rounded-lg border divide-y">
                {deliveries.slice(0, 5).map((delivery) => (
                  <div key={delivery.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(delivery.date).toLocaleDateString(
                          locale === "it" ? "it-IT" : "en-US"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.items} {t.suppliers.items}
                        {delivery.notes && ` - ${delivery.notes}`}
                      </p>
                    </div>
                    <DeliveryStatusBadge status={delivery.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
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

function AddSupplierDialog({ onAdd }: { onAdd: (supplier: SupplierUI) => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [contact, setContact] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const created = await suppliersApi.create({
        name,
        category,
        contact_email: contact,
        reliability_score: 100,
        avg_delivery_days: 2,
      })
      onAdd(mapSupplierToUI(created))
      setOpen(false)
      setName("")
      setCategory("")
      setContact("")
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
  const [suppliers, setSuppliers] = React.useState<SupplierUI[]>([])
  const [deliveries, setDeliveries] = React.useState<Record<string, Delivery[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [suppliersRes, deliveriesRes] = await Promise.all([
          suppliersApi.list(),
          deliveriesApi.list(),
        ])

        const mappedSuppliers = suppliersRes.items.map(mapSupplierToUI)
        setSuppliers(mappedSuppliers)

        // Group deliveries by supplier
        const deliveriesBySupplier: Record<string, Delivery[]> = {}
        for (const d of deliveriesRes) {
          const supplierId = String(d.supplier_id)
          if (!deliveriesBySupplier[supplierId]) {
            deliveriesBySupplier[supplierId] = []
          }
          deliveriesBySupplier[supplierId].push(mapDeliveryToUI(d))
        }
        setDeliveries(deliveriesBySupplier)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate KPIs
  const activeSuppliers = suppliers.length
  const allDeliveries = Object.values(deliveries).flat()
  const openAnomalies = allDeliveries.filter((d) => d.status === "late" || d.status === "partial").length
  const avgReliability = suppliers.length > 0
    ? suppliers.reduce((sum, s) => sum + s.reliability, 0) / suppliers.length
    : 0
  const maxPriceIncrease = suppliers.length > 0
    ? Math.max(...suppliers.map((s) => s.priceChange))
    : 0

  const kpis: KPI[] = [
    {
      label: t.suppliers.activeSuppliers,
      value: String(activeSuppliers),
      change: 1,
      trend: "up",
    },
    {
      label: t.suppliers.openAnomalies,
      value: String(openAnomalies),
      change: openAnomalies > 0 ? -openAnomalies : 0,
      trend: openAnomalies > 0 ? "down" : "neutral",
      description: t.suppliers.lateOrPartial,
    },
    {
      label: t.suppliers.avgReliability,
      value: avgReliability.toFixed(1),
      change: 2.5,
      trend: "up",
      description: t.suppliers.acrossSuppliers,
    },
    {
      label: t.suppliers.maxPriceIncrease,
      value: maxPriceIncrease.toFixed(1),
      change: maxPriceIncrease,
      trend: maxPriceIncrease > 5 ? "down" : "neutral",
      description: t.suppliers.fromLastMonth,
    },
  ]

  const handleAddSupplier = (supplier: SupplierUI) => {
    setSuppliers((prev) => [...prev, supplier])
  }

  const handleLogDelivery = (supplierId: string) => (delivery: Delivery) => {
    setDeliveries((prev) => ({
      ...prev,
      [supplierId]: [delivery, ...(prev[supplierId] || [])],
    }))
  }

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
        actions={<AddSupplierDialog onAdd={handleAddSupplier} />}
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

      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
        {suppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            deliveries={deliveries[supplier.id] || []}
            onLogDelivery={handleLogDelivery(supplier.id)}
          />
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TruckIcon className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t.common.noResults}</h3>
          <p className="text-muted-foreground">Add your first supplier to get started</p>
        </div>
      )}
    </div>
  )
}
