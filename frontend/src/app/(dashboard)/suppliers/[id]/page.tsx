"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { suppliers as suppliersApi, deliveries as deliveriesApi, type SupplierDetail } from "@/lib/api"
import { formatEUR } from "@/types"
import {
  ArrowLeftIcon,
  Loader2Icon,
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
} from "lucide-react"

const chartConfig = {
  price: { label: "Price", color: "#f97316" },
} satisfies ChartConfig

function LogDeliveryDialog({
  supplierId,
  onSuccess
}: {
  supplierId: number
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
          <Button variant="outline">
            <PackageIcon className="size-4 mr-2" />
            Log Delivery
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Delivery</DialogTitle>
          <DialogDescription>Record a new delivery from this supplier</DialogDescription>
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

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [supplier, setSupplier] = React.useState<SupplierDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const id = params.id as string

  const loadSupplier = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await suppliersApi.get(parseInt(id))
      setSupplier(data)
    } catch (err) {
      console.error("Failed to load supplier:", err)
      setError("Failed to load supplier")
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    if (id) {
      loadSupplier()
    }
  }, [id, loadSupplier])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">{error || "Supplier not found"}</p>
        <Button variant="outline" onClick={() => router.push("/suppliers")}>
          <ArrowLeftIcon className="size-4 mr-2" />
          Back to suppliers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <Link href="/suppliers" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit mb-4">
                <ArrowLeftIcon className="size-4" />
                Back to suppliers
              </Link>
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <span className="capitalize">{supplier.category}</span>
                {supplier.address && (
                  <>
                    <span>·</span>
                    <MapPinIcon className="size-4" />
                    <span>{supplier.address}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {supplier.contact_phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="size-4 text-muted-foreground" />
                    {supplier.contact_phone}
                  </span>
                )}
                {supplier.contact_email && (
                  <span className="flex items-center gap-1">
                    <MailIcon className="size-4 text-muted-foreground" />
                    {supplier.contact_email}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <LogDeliveryDialog supplierId={supplier.id} onSuccess={loadSupplier} />
              <Button
                render={<Link href={`/bolla?supplier=${encodeURIComponent(supplier.name)}`} />}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <FileTextIcon className="size-4 mr-2" />
                + Add Delivery Note
              </Button>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Reliability</p>
              <p className="text-2xl font-bold text-orange-500">{supplier.reliability_score}%</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Products Supplied</p>
              <p className="text-2xl font-bold">{supplier.product_count}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center">
              <p className="text-sm text-orange-700">Price Increase</p>
              <p className="text-2xl font-bold text-orange-500">
                {supplier.price_change_pct > 0 ? "+" : ""}{supplier.price_change_pct}%
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center">
              <p className="text-sm text-orange-700">Open Anomalies</p>
              <p className="text-2xl font-bold text-red-500">{supplier.open_anomalies}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Trends */}
      {supplier.price_trends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {supplier.price_trends.slice(0, 2).map((trend) => (
            <Card key={trend.product_id}>
              <CardHeader>
                <CardTitle className="text-base">Price Trend — {trend.product_name}</CardTitle>
                <CardDescription>€/{trend.unit || "unit"}</CardDescription>
              </CardHeader>
              <CardContent>
                {trend.prices.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <LineChart data={trend.prices}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                          const d = new Date(v)
                          return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `€${v}`}
                        domain={["auto", "auto"]}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => formatEUR(Number(value))} />}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: "#f97316", r: 3 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No price data</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Recent history</CardDescription>
        </CardHeader>
        <CardContent>
          {supplier.recent_deliveries.length > 0 ? (
            <div className="space-y-3">
              {supplier.recent_deliveries.map((delivery) => {
                const isOk = delivery.status === "on_time"
                return (
                  <div
                    key={delivery.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                      isOk ? "border-l-green-500 bg-green-50/50" : "border-l-orange-500 bg-orange-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isOk ? (
                        <CheckCircleIcon className="size-5 text-green-500 mt-0.5" />
                      ) : (
                        <AlertTriangleIcon className="size-5 text-orange-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{delivery.date}</p>
                        <p className="text-sm text-muted-foreground">
                          {delivery.notes || "Regular delivery"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatEUR(delivery.total)}</span>
                      <Badge
                        variant="outline"
                        className={isOk ? "text-green-600 border-green-300" : "text-orange-600 border-orange-300"}
                      >
                        {isOk ? "OK" : "Anomaly"}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No deliveries yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
