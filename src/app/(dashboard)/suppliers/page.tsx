"use client"

import * as React from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ReliabilityBadge, PriceChangeBadge } from "@/components/status-badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations, useI18n } from "@/lib/i18n"
import { suppliers, inflationData, priceHistory } from "@/data/mock/suppliers"
import type { Supplier } from "@/types"
import { TruckIcon, ClockIcon, MailIcon, CalendarIcon } from "lucide-react"

const inflationChartConfig = {
  "Carni Pregiate": { label: "Carni Pregiate", color: "var(--chart-1)" },
  "Ortofrutticola": { label: "Ortofrutticola", color: "var(--chart-2)" },
  "Caseificio": { label: "Caseificio", color: "var(--chart-3)" },
  "Ittica": { label: "Ittica", color: "var(--chart-4)" },
  "Oleificio": { label: "Oleificio", color: "var(--chart-5)" },
} satisfies ChartConfig

function SupplierCard({ supplier }: { supplier: Supplier }) {
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
              <span>{supplier.avgDeliveryDays} {supplier.avgDeliveryDays === 1 ? t.suppliers.day : t.suppliers.days} {t.suppliers.delivery}</span>
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
              <p className="text-xl font-semibold">{supplier.avgDeliveryDays} {t.suppliers.days}</p>
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
              {new Date(supplier.lastOrder).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

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

export default function SuppliersPage() {
  const t = useTranslations()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageHeader
        title={t.suppliers.title}
        description={t.suppliers.description}
      />

      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
        {suppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
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
                    return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short" })
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => `+${Number(v).toFixed(1)}%`} />}
                />
                <Legend />
                <Line type="monotone" dataKey="Carni Pregiate" stroke="var(--color-Carni Pregiate)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Ortofrutticola" stroke="var(--color-Ortofrutticola)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Caseificio" stroke="var(--color-Caseificio)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Ittica" stroke="var(--color-Ittica)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Oleificio" stroke="var(--color-Oleificio)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
