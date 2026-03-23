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
import { suppliers as initialSuppliers, inflationData, priceHistory } from "@/data/mock/suppliers"
import type { Supplier } from "@/types"
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
} from "lucide-react"

const inflationChartConfig = {
  "Carni Pregiate": { label: "Carni Pregiate", color: "var(--chart-1)" },
  "Ortofrutticola": { label: "Ortofrutticola", color: "var(--chart-2)" },
  "Caseificio": { label: "Caseificio", color: "var(--chart-3)" },
  "Ittica": { label: "Ittica", color: "var(--chart-4)" },
  "Oleificio": { label: "Oleificio", color: "var(--chart-5)" },
} satisfies ChartConfig

interface Delivery {
  id: string
  date: string
  items: number
  status: "onTime" | "late" | "partial"
  notes?: string
}

// Mock deliveries data
const mockDeliveries: Record<string, Delivery[]> = {
  "1": [
    { id: "d1", date: "2024-01-15", items: 5, status: "onTime" },
    { id: "d2", date: "2024-01-10", items: 3, status: "onTime" },
    { id: "d3", date: "2024-01-05", items: 4, status: "late", notes: "Traffic delay" },
  ],
  "2": [
    { id: "d4", date: "2024-01-14", items: 8, status: "onTime" },
    { id: "d5", date: "2024-01-07", items: 6, status: "partial", notes: "Missing 2 items" },
  ],
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

function LogDeliveryDialog({ supplier, onLog }: { supplier: Supplier; onLog: (delivery: Delivery) => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [items, setItems] = React.useState("")
  const [status, setStatus] = React.useState<Delivery["status"]>("onTime")
  const [notes, setNotes] = React.useState("")

  const handleSubmit = () => {
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
  supplier: Supplier
  deliveries: Delivery[]
  onLogDelivery: (delivery: Delivery) => void
}) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isMobile = useIsMobile()
  const supplierPriceHistory = priceHistory.filter((p) => p.supplier === supplier.name)

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
          {/* Quick Actions */}
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
            <p className="font-medium">{supplier.contact}</p>
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

          {/* Recent Deliveries */}
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

          {supplierPriceHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">{t.suppliers.priceHistory}</h4>
              <div className="rounded-lg border p-3 space-y-2">
                {supplierPriceHistory.map((entry, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{entry.item}</span>
                    <span className="font-medium">€{entry.price.toFixed(2)}</span>
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

function AddSupplierDialog({ onAdd }: { onAdd: (supplier: Supplier) => void }) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [contact, setContact] = React.useState("")

  const handleSubmit = () => {
    onAdd({
      id: `sup-${Date.now()}`,
      name,
      category,
      reliability: 100,
      avgDeliveryDays: 2,
      priceChange: 0,
      lastOrder: new Date().toISOString(),
      contact,
    })
    setOpen(false)
    setName("")
    setCategory("")
    setContact("")
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
          <Button onClick={handleSubmit} disabled={!name || !category}>
            {t.suppliers.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SuppliersPage() {
  const t = useTranslations()
  const [suppliers, setSuppliers] = React.useState(initialSuppliers)
  const [deliveries, setDeliveries] = React.useState<Record<string, Delivery[]>>(mockDeliveries)

  const handleAddSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier])
  }

  const handleLogDelivery = (supplierId: string) => (delivery: Delivery) => {
    setDeliveries((prev) => ({
      ...prev,
      [supplierId]: [delivery, ...(prev[supplierId] || [])],
    }))
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageHeader
        title={t.suppliers.title}
        description={t.suppliers.description}
        actions={<AddSupplierDialog onAdd={handleAddSupplier} />}
      />

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

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.suppliers.inflation}</CardTitle>
            <CardDescription>{t.suppliers.inflationDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={inflationChartConfig} className="aspect-auto h-[300px] w-full">
              <LineChart data={inflationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const [year, month] = value.split("-")
                    return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
                      month: "short",
                    })
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => `+${Number(v).toFixed(1)}%`} />}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Carni Pregiate"
                  stroke="var(--color-Carni Pregiate)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Ortofrutticola"
                  stroke="var(--color-Ortofrutticola)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Caseificio"
                  stroke="var(--color-Caseificio)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Ittica"
                  stroke="var(--color-Ittica)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Oleificio"
                  stroke="var(--color-Oleificio)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
