"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslations, useI18n } from "@/lib/i18n"
import { ocr, invoices, suppliers as suppliersApi, products as productsApi, type Supplier, type Product } from "@/lib/api"
import type { InvoiceLine, AnomalyType } from "@/types"
import { formatEUR } from "@/types"
import {
  UploadIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  Loader2Icon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  TrendingUpIcon,
  PackageIcon,
  HelpCircleIcon,
} from "lucide-react"

type Step = 1 | 2 | 3

interface ExtractedLine extends InvoiceLine {
  productId?: number
  matchedProduct?: Product
}

interface ExtractedData {
  supplierName: string
  supplierId?: number
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  lines: ExtractedLine[]
  subtotal: number
  vat: number
  total: number
}

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const t = useTranslations()
  const steps = [
    { step: 1, label: t.bolla.step1 },
    { step: 2, label: t.bolla.step2 },
    { step: 3, label: t.bolla.step3 },
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map(({ step, label }, idx) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center size-8 rounded-full text-sm font-medium ${
                step < currentStep
                  ? "bg-green-500 text-white"
                  : step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step < currentStep ? <CheckIcon className="size-4" /> : step}
            </div>
            <span
              className={`text-sm ${
                step === currentStep ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className="w-12 h-0.5 bg-muted mx-2" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function UploadStep({
  onFileUpload,
  isProcessing,
}: {
  onFileUpload: (file: File) => void
  isProcessing: boolean
}) {
  const t = useTranslations()
  const [preview, setPreview] = React.useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file) {
        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = () => setPreview(reader.result as string)
          reader.readAsDataURL(file)
        } else {
          setPreview(null)
        }
        onFileUpload(file)
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.bolla.uploadTitle}</CardTitle>
        <CardDescription>{t.bolla.uploadDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2Icon className="size-12 animate-spin text-primary" />
            <p className="text-lg font-medium">{t.bolla.processing}</p>
            <Progress value={66} className="w-48" />
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 object-contain rounded"
              />
            ) : (
              <>
                <UploadIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? "Drop here..." : t.bolla.uploadDesc}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.bolla.supportedFormats}
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReviewStep({
  data,
  onDataChange,
  suppliers,
  products,
}: {
  data: ExtractedData
  onDataChange: (data: ExtractedData) => void
  suppliers: Supplier[]
  products: Product[]
}) {
  const t = useTranslations()
  const { locale } = useI18n()

  const handleLineChange = (
    lineId: string,
    field: keyof ExtractedLine,
    value: string | number
  ) => {
    const newLines = data.lines.map((line) =>
      line.id === lineId ? { ...line, [field]: value } : line
    )
    // Recalculate totals
    const subtotal = newLines.reduce((sum, line) => sum + (line.total || 0), 0)
    onDataChange({ ...data, lines: newLines, subtotal, total: subtotal + data.vat })
  }

  const handleProductMatch = (lineId: string, productId: number | undefined) => {
    const product = products.find((p) => p.id === productId)
    const newLines = data.lines.map((line) =>
      line.id === lineId
        ? { ...line, productId, matchedProduct: product }
        : line
    )
    onDataChange({ ...data, lines: newLines })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="size-5" />
          {t.bolla.reviewTitle}
        </CardTitle>
        <CardDescription>{t.bolla.reviewDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <Label>{t.bolla.supplier} *</Label>
            <Select
              value={data.supplierId ? String(data.supplierId) : ""}
              onValueChange={(v) => {
                if (!v) return
                const supplier = suppliers.find((s) => s.id === parseInt(v))
                onDataChange({
                  ...data,
                  supplierId: parseInt(v),
                  supplierName: supplier?.name || data.supplierName,
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={data.supplierName || "Select supplier"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!data.supplierId && data.supplierName && (
              <p className="text-xs text-amber-600">OCR detected: {data.supplierName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t.bolla.invoiceNumber}</Label>
            <Input
              value={data.invoiceNumber}
              onChange={(e) =>
                onDataChange({ ...data, invoiceNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t.bolla.invoiceDate} *</Label>
            <Input
              type="date"
              value={data.invoiceDate}
              onChange={(e) =>
                onDataChange({ ...data, invoiceDate: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t.bolla.dueDate}</Label>
            <Input
              type="date"
              value={data.dueDate || ""}
              onChange={(e) =>
                onDataChange({ ...data, dueDate: e.target.value })
              }
            />
          </div>
        </div>

        {/* Line items */}
        <div>
          <h4 className="font-medium mb-3">{t.bolla.lines}</h4>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{t.bolla.itemDesc}</TableHead>
                  <TableHead className="min-w-[160px]">{t.bolla.matchedTo}</TableHead>
                  <TableHead className="w-20">{t.bolla.quantity}</TableHead>
                  <TableHead className="w-20">{t.bolla.unit}</TableHead>
                  <TableHead className="w-24">{t.bolla.unitPrice}</TableHead>
                  <TableHead className="w-24">{t.bolla.total}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) =>
                          handleLineChange(line.id, "description", e.target.value)
                        }
                        className="min-w-[160px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.productId ? String(line.productId) : ""}
                        onValueChange={(v) => handleProductMatch(line.id, v ? parseInt(v) : undefined)}
                      >
                        <SelectTrigger className="w-full min-w-[140px]">
                          <SelectValue placeholder="Match product..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No match</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(line.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.unit}
                        onChange={(e) =>
                          handleLineChange(line.id, "unit", e.target.value)
                        }
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => {
                          const price = parseFloat(e.target.value) || 0
                          const total = price * line.quantity
                          const newLines = data.lines.map((l) =>
                            l.id === line.id ? { ...l, unitPrice: price, total } : l
                          )
                          const subtotal = newLines.reduce((s, l) => s + l.total, 0)
                          onDataChange({ ...data, lines: newLines, subtotal, total: subtotal + data.vat })
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatEUR(line.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.bolla.subtotal}</span>
              <span>{formatEUR(data.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.bolla.vat}</span>
              <Input
                type="number"
                step="0.01"
                value={data.vat}
                onChange={(e) => {
                  const vat = parseFloat(e.target.value) || 0
                  onDataChange({ ...data, vat, total: data.subtotal + vat })
                }}
                className="w-24 text-right"
              />
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>{t.bolla.grandTotal}</span>
              <span>{formatEUR(data.total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AnomalyIcon({ type }: { type: AnomalyType }) {
  switch (type) {
    case "price_increase":
      return <TrendingUpIcon className="size-4 text-amber-500" />
    case "new_item":
      return <PackageIcon className="size-4 text-blue-500" />
    case "quantity_mismatch":
      return <AlertTriangleIcon className="size-4 text-amber-500" />
    case "missing_item":
      return <XCircleIcon className="size-4 text-red-500" />
    default:
      return <HelpCircleIcon className="size-4 text-muted-foreground" />
  }
}

function ConfirmStep({
  data,
  anomalies,
  reviewed,
  onReviewedChange,
  suppliers,
}: {
  data: ExtractedData
  anomalies: ExtractedLine[]
  reviewed: boolean
  onReviewedChange: (reviewed: boolean) => void
  suppliers: Supplier[]
}) {
  const t = useTranslations()
  const { locale } = useI18n()

  const hasAnomalies = anomalies.length > 0
  const supplier = suppliers.find((s) => s.id === data.supplierId)

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-green-500" />
            {t.bolla.confirmTitle}
          </CardTitle>
          <CardDescription>{t.bolla.confirmDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">{t.bolla.supplier}</p>
              <p className="font-medium">{supplier?.name || data.supplierName}</p>
              {!data.supplierId && (
                <p className="text-xs text-amber-600">No supplier linked!</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.bolla.invoiceNumber}</p>
              <p className="font-medium">{data.invoiceNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.bolla.invoiceDate}</p>
              <p className="font-medium">
                {new Date(data.invoiceDate).toLocaleDateString(
                  locale === "it" ? "it-IT" : "en-US"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.bolla.grandTotal}</p>
              <p className="font-bold text-lg">{formatEUR(data.total)}</p>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.bolla.itemDesc}</TableHead>
                  <TableHead className="text-right">{t.bolla.quantity}</TableHead>
                  <TableHead className="text-right">{t.bolla.unitPrice}</TableHead>
                  <TableHead className="text-right">{t.bolla.total}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow
                    key={line.id}
                    className={
                      line.anomaly
                        ? line.anomaly.severity === "error"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : "bg-amber-50 dark:bg-amber-950/20"
                        : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {line.anomaly && <AnomalyIcon type={line.anomaly.type} />}
                        <span className="font-medium">{line.description}</span>
                      </div>
                      {line.anomaly && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {line.anomaly.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.quantity} {line.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatEUR(line.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatEUR(line.total)}
                    </TableCell>
                    <TableCell>
                      {line.anomaly ? (
                        <AlertTriangleIcon className="size-4 text-amber-500" />
                      ) : (
                        <CheckCircle2Icon className="size-4 text-green-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies Panel */}
      {hasAnomalies && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangleIcon className="size-5" />
              {t.bolla.anomalies} ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.map((line) => (
                <div
                  key={line.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30"
                >
                  <div className="flex items-start gap-3">
                    <AnomalyIcon type={line.anomaly!.type} />
                    <div>
                      <p className="font-medium">{line.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {line.anomaly!.message}
                      </p>
                      {line.anomaly!.expectedValue !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.bolla.expected}: {formatEUR(line.anomaly!.expectedValue)} →{" "}
                          {t.bolla.current}: {formatEUR(line.unitPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <XCircleIcon className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <CheckIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!hasAnomalies && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2Icon className="size-6 text-green-500" />
            <p className="font-medium text-green-600 dark:text-green-400">
              {t.bolla.noAnomalies}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review Confirmation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="reviewed"
              checked={reviewed}
              onCheckedChange={(checked) => onReviewedChange(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="reviewed"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {t.bolla.confirmReview}
              </label>
              <p className="text-sm text-muted-foreground">
                {t.bolla.confirmReviewDesc}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BollaPage() {
  const t = useTranslations()
  const [step, setStep] = React.useState<Step>(1)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [extractedData, setExtractedData] = React.useState<ExtractedData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [reviewed, setReviewed] = React.useState(false)

  // Load suppliers and products on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          suppliersApi.list(),
          productsApi.list(),
        ])
        setSuppliers(suppliersRes.items || [])
        setProducts(productsRes || [])
      } catch (err) {
        console.error("Failed to load suppliers/products:", err)
      }
    }
    loadData()
  }, [])

  // Auto-match supplier from OCR result
  const autoMatchSupplier = (name: string): number | undefined => {
    if (!name) return undefined
    const lower = name.toLowerCase()
    const match = suppliers.find((s) =>
      s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())
    )
    return match?.id
  }

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setReviewed(false)

    try {
      const result = await ocr.processInvoice(file)

      // Convert OCR result to ExtractedData format
      const lines: ExtractedLine[] = result.lines.map((line, idx) => {
        // Try to auto-match product
        const matchedProduct = products.find((p) =>
          p.name.toLowerCase().includes(line.description.toLowerCase()) ||
          line.description.toLowerCase().includes(p.name.toLowerCase())
        )

        return {
          id: `line-${idx}`,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit || "pcs",
          unitPrice: line.unit_price,
          total: line.total,
          productId: matchedProduct?.id,
          matchedProduct,
        }
      })

      // Auto-match supplier
      const supplierId = autoMatchSupplier(result.supplier_name || "")

      setExtractedData({
        supplierName: result.supplier_name || "",
        supplierId,
        invoiceNumber: result.invoice_number || "",
        invoiceDate: result.date || new Date().toISOString().split("T")[0],
        lines,
        subtotal: result.subtotal,
        vat: result.vat,
        total: result.total,
      })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!extractedData || !reviewed) return

    try {
      await invoices.create({
        supplier_id: extractedData.supplierId,
        invoice_number: extractedData.invoiceNumber,
        date: extractedData.invoiceDate,
        total: extractedData.total,
        vat: extractedData.vat,
        status: "pending",
        lines: extractedData.lines.map((line) => ({
          product_id: line.productId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price: line.unitPrice,
          total: line.total,
        })),
      })
      alert(t.bolla.success)
      setStep(1)
      setExtractedData(null)
      setReviewed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice")
    }
  }

  // Lines without product match are flagged
  const unmatchedLines = extractedData?.lines.filter((l) => !l.productId) || []

  // Check if data is valid for proceeding
  const canProceedToConfirm = extractedData && extractedData.supplierId && extractedData.invoiceDate

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageHeader title={t.bolla.title} description={t.bolla.description} />

      <div className="px-4 lg:px-6">
        <StepIndicator currentStep={step} />

        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardContent className="flex items-center gap-3 py-4">
              <XCircleIcon className="size-6 text-red-500" />
              <p className="font-medium text-red-600 dark:text-red-400">
                {t.bolla.error}: {error}
              </p>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <UploadStep onFileUpload={handleFileUpload} isProcessing={isProcessing} />
        )}

        {step === 2 && extractedData && (
          <ReviewStep
            data={extractedData}
            onDataChange={setExtractedData}
            suppliers={suppliers}
            products={products}
          />
        )}

        {step === 3 && extractedData && (
          <ConfirmStep
            data={extractedData}
            anomalies={unmatchedLines}
            reviewed={reviewed}
            onReviewedChange={setReviewed}
            suppliers={suppliers}
          />
        )}

        {/* Navigation buttons */}
        {!isProcessing && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => {
                if (step === 1) {
                  // Cancel
                } else {
                  setStep((s) => (s - 1) as Step)
                  if (step === 3) setReviewed(false)
                }
              }}
              disabled={step === 1}
            >
              <ArrowLeftIcon className="size-4 mr-2" />
              {step === 1 ? t.bolla.cancel : t.bolla.back}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 || !extractedData || (step === 2 && !canProceedToConfirm)}
              >
                {t.bolla.next}
                <ArrowRightIcon className="size-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!reviewed}>
                <CheckIcon className="size-4 mr-2" />
                {t.bolla.saveInvoice}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
