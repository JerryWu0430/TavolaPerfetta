"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"

import { PageHeader } from "@/components/page-header"
import { HACCPStatusBadge } from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTranslations, useI18n } from "@/lib/i18n"
import {
  haccp,
  type HACCPTemplate,
  type HACCPChecklist,
  type HACCPItem,
} from "@/lib/api"
import { ThermometerIcon, SparklesIcon, ClipboardCheckIcon, CheckCircle2Icon, XCircleIcon, SettingsIcon, Loader2Icon, PlusIcon, PencilIcon, HistoryIcon, TrashIcon, MoreVerticalIcon } from "lucide-react"

// Audit log entry type
interface AuditLogEntry {
  id: string
  timestamp: string
  action: "created" | "updated" | "deactivated" | "activated"
  templateName: string
  category: string
  details?: string
}

const HACCP_CATEGORIES = ["kitchen", "storage", "receiving", "dining", "restrooms"] as const
type HACCPCategory = typeof HACCP_CATEGORIES[number]

type ChecklistItemType = "temperature" | "cleaning" | "inspection"

interface ChecklistItemUI {
  id: string
  name: string
  type: ChecklistItemType
  description?: string
  minValue?: number
  maxValue?: number
  unit?: string
  required: boolean
}

interface HACCPEntryUI {
  id: string
  date: string
  operator: string
  status: "pass" | "partial" | "fail"
  items: {
    itemId: string
    value: number | boolean
    passed: boolean
    timestamp: string
  }[]
  notes?: string
}

function mapTemplateToUI(t: HACCPTemplate): ChecklistItemUI {
  return {
    id: String(t.id),
    name: t.name,
    type: (t.category as ChecklistItemType) || "inspection",
    description: t.name,
    minValue: t.min_value ?? undefined,
    maxValue: t.max_value ?? undefined,
    unit: t.unit ?? undefined,
    required: t.is_active,
  }
}

function mapChecklistToUI(c: HACCPChecklist): HACCPEntryUI {
  return {
    id: String(c.id),
    date: c.date,
    operator: c.operator || "Unknown",
    status: c.status === "passed" ? "pass" : c.status === "failed" ? "fail" : "partial",
    items: c.items.map((item) => ({
      itemId: String(item.template_id || item.id),
      value: item.value === "true" ? true : item.value === "false" ? false : parseFloat(item.value || "0"),
      passed: item.passed ?? false,
      timestamp: c.created_at,
    })),
    notes: c.notes ?? undefined,
  }
}

function ChecklistItemIcon({ type }: { type: ChecklistItemType }) {
  switch (type) {
    case "temperature":
      return <ThermometerIcon className="size-4 text-blue-500" />
    case "cleaning":
      return <SparklesIcon className="size-4 text-green-500" />
    case "inspection":
      return <ClipboardCheckIcon className="size-4 text-purple-500" />
    default:
      return <ClipboardCheckIcon className="size-4 text-muted-foreground" />
  }
}

function DailyChecklist({ templates, onSave, onManageItems }: { templates: ChecklistItemUI[]; onSave: (items: { template_id: number; name: string; category: string; value: string; passed: boolean }[]) => Promise<void>; onManageItems: () => void }) {
  const t = useTranslations()
  const { locale } = useI18n()
  const [values, setValues] = React.useState<Record<string, number | boolean>>({})
  const [saving, setSaving] = React.useState(false)

  const handleValueChange = (id: string, value: number | boolean) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const isValueValid = (item: ChecklistItemUI, value: number | boolean | undefined): boolean | null => {
    if (value === undefined) return null
    if (typeof value === "boolean") return value
    if (item.minValue !== undefined && item.maxValue !== undefined) {
      return value >= item.minValue && value <= item.maxValue
    }
    return true
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = templates.map((template) => {
        const value = values[template.id]
        const passed = isValueValid(template, value) ?? false
        return {
          template_id: parseInt(template.id),
          name: template.name,
          category: template.type,
          value: String(value ?? ""),
          passed,
        }
      }).filter((item) => item.value !== "undefined" && item.value !== "")

      await onSave(items)
    } catch (err) {
      console.error("Failed to save checklist:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t.haccp.dailyChecklist}</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onManageItems}>
            <SettingsIcon className="size-4 mr-2" />
            {t.haccp.manageItems}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No checklist templates configured</p>
        ) : (
          templates.map((item) => {
            const currentValue = values[item.id]
            const isValid = isValueValid(item, currentValue)

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  isValid === false
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : isValid === true
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      : ""
                }`}
              >
                <ChecklistItemIcon type={item.type} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {item.required && (
                      <Badge variant="outline" className="text-xs">
                        {t.haccp.required}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.type === "temperature" && item.minValue !== undefined && item.maxValue !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.haccp.range}: {item.minValue}{item.unit} - {item.maxValue}{item.unit}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.type === "temperature" ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        className="w-20"
                        placeholder={item.unit}
                        onChange={(e) => handleValueChange(item.id, parseFloat(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">{item.unit}</span>
                    </div>
                  ) : (
                    <Checkbox
                      checked={currentValue as boolean || false}
                      onCheckedChange={(checked) => handleValueChange(item.id, !!checked)}
                    />
                  )}
                  {isValid !== null && (
                    isValid ? (
                      <CheckCircle2Icon className="size-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-5 text-red-500" />
                    )
                  )}
                </div>
              </div>
            )
          })
        )}
        <Button className="w-full" onClick={handleSave} disabled={saving || templates.length === 0}>
          {saving ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
          {t.haccp.saveChecks}
        </Button>
      </CardContent>
    </Card>
  )
}

function HistoryDrawer({ entry, templates }: { entry: HACCPEntryUI; templates: ChecklistItemUI[] }) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm">{t.haccp.details}</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {t.haccp.checksOn} {new Date(entry.date).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")}
          </DrawerTitle>
          <DrawerDescription>
            {t.haccp.operator}: {entry.operator}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          <div className="flex items-center gap-4">
            <HACCPStatusBadge status={entry.status} />
            {entry.notes && (
              <p className="text-sm text-muted-foreground">{entry.notes}</p>
            )}
          </div>

          <div className="space-y-2">
            {entry.items.map((result) => {
              const item = templates.find((i) => i.id === result.itemId)
              if (!item) return null

              return (
                <div
                  key={result.itemId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    result.passed
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChecklistItemIcon type={item.type} />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {typeof result.value === "boolean"
                        ? result.value ? "OK" : "NO"
                        : `${result.value}${item.unit || ""}`}
                    </span>
                    {result.passed ? (
                      <CheckCircle2Icon className="size-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-4 text-red-500" />
                    )}
                  </div>
                </div>
              )
            })}
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

// Template Form Dialog
function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: HACCPTemplate | null
  onSave: (data: Partial<HACCPTemplate>) => Promise<void>
}) {
  const t = useTranslations()
  const [saving, setSaving] = React.useState(false)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<string>("")
  const [inputType, setInputType] = React.useState<"boolean" | "number" | "text">("boolean")
  const [frequency, setFrequency] = React.useState("daily")
  const [minValue, setMinValue] = React.useState<string>("")
  const [maxValue, setMaxValue] = React.useState<string>("")
  const [unit, setUnit] = React.useState("")

  React.useEffect(() => {
    if (template) {
      setName(template.name)
      setCategory(template.category || "")
      setInputType(template.input_type)
      setFrequency(template.frequency)
      setMinValue(template.min_value?.toString() || "")
      setMaxValue(template.max_value?.toString() || "")
      setUnit(template.unit || "")
    } else {
      setName("")
      setCategory("")
      setInputType("boolean")
      setFrequency("daily")
      setMinValue("")
      setMaxValue("")
      setUnit("")
    }
  }, [template, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name,
        category,
        input_type: inputType,
        frequency,
        min_value: minValue ? parseFloat(minValue) : null,
        max_value: maxValue ? parseFloat(maxValue) : null,
        unit: unit || null,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const categoryLabels: Record<HACCPCategory, string> = {
    kitchen: t.haccp.categories.kitchen,
    storage: t.haccp.categories.storage,
    receiving: t.haccp.categories.receiving,
    dining: t.haccp.categories.dining,
    restrooms: t.haccp.categories.restrooms,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{template ? t.haccp.editTemplate : t.haccp.addTemplate}</DialogTitle>
          <DialogDescription>
            {t.haccp.templatesDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t.haccp.templateName}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.products.category}</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.products.selectCategory} />
                </SelectTrigger>
                <SelectContent className="min-w-[180px]">
                  {HACCP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.haccp.frequency}</Label>
              <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[140px]">
                  <SelectItem value="daily">{t.haccp.daily}</SelectItem>
                  <SelectItem value="weekly">{t.haccp.weekly}</SelectItem>
                  <SelectItem value="monthly">{t.haccp.monthly}</SelectItem>
                  <SelectItem value="once">{t.haccp.once}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.haccp.inputType}</Label>
            <Select value={inputType} onValueChange={(v) => setInputType(v as "boolean" | "number" | "text")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[200px]">
                <SelectItem value="boolean">{t.haccp.boolean}</SelectItem>
                <SelectItem value="number">{t.haccp.number}</SelectItem>
                <SelectItem value="text">{t.haccp.text}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inputType === "number" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t.haccp.minValue}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.haccp.maxValue}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.inventory.unit}</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="°C, %"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.haccp.cancel}
            </Button>
            <Button type="submit" disabled={saving || !name || !category}>
              {saving && <Loader2Icon className="size-4 animate-spin mr-2" />}
              {t.haccp.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Manage Templates Drawer
function ManageTemplatesDrawer({
  open,
  onOpenChange,
  templates,
  auditLog,
  onCreateTemplate,
  onUpdateTemplate,
  onToggleActive,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: HACCPTemplate[]
  auditLog: AuditLogEntry[]
  onCreateTemplate: (data: Partial<HACCPTemplate>) => Promise<void>
  onUpdateTemplate: (id: number, data: Partial<HACCPTemplate>) => Promise<void>
  onToggleActive: (id: number, active: boolean) => Promise<void>
}) {
  const t = useTranslations()
  const { locale } = useI18n()
  const isMobile = useIsMobile()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<HACCPTemplate | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")

  const categoryLabels: Record<HACCPCategory, string> = {
    kitchen: t.haccp.categories.kitchen,
    storage: t.haccp.categories.storage,
    receiving: t.haccp.categories.receiving,
    dining: t.haccp.categories.dining,
    restrooms: t.haccp.categories.restrooms,
  }

  const frequencyLabels: Record<string, string> = {
    daily: t.haccp.daily,
    weekly: t.haccp.weekly,
    monthly: t.haccp.monthly,
    once: t.haccp.once,
  }

  const inputTypeLabels: Record<string, string> = {
    boolean: t.haccp.boolean,
    number: t.haccp.number,
    text: t.haccp.text,
  }

  const filteredTemplates = selectedCategory === "all"
    ? templates
    : templates.filter((t) => t.category === selectedCategory)

  const handleEdit = (template: HACCPTemplate) => {
    setEditingTemplate(template)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingTemplate(null)
    setFormOpen(true)
  }

  const handleSave = async (data: Partial<HACCPTemplate>) => {
    if (editingTemplate) {
      await onUpdateTemplate(editingTemplate.id, data)
    } else {
      await onCreateTemplate(data)
    }
    setEditingTemplate(null)
  }

  return (
    <>
      <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={isMobile ? "" : "sm:max-w-lg md:max-w-xl lg:max-w-2xl"}>
          <DrawerHeader>
            <DrawerTitle>{t.haccp.templates}</DrawerTitle>
            <DrawerDescription>{t.haccp.templatesDesc}</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-auto px-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Select value={selectedCategory} onValueChange={(v) => v && setSelectedCategory(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {HACCP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd}>
                <PlusIcon className="size-4 mr-2" />
                {t.haccp.addTemplate}
              </Button>
            </div>

            <div className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheckIcon className="size-12 mx-auto mb-3 opacity-50" />
                  <p>No checklist items configured</p>
                  <p className="text-sm mt-1">Add your first daily check above</p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      !template.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[template.category as HACCPCategory] || template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {frequencyLabels[template.frequency]}
                        </Badge>
                        {!template.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            {t.haccp.inactive}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {inputTypeLabels[template.input_type]}
                        {template.input_type === "number" && template.min_value != null && template.max_value != null && (
                          <span> • {template.min_value}-{template.max_value}{template.unit}</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="shrink-0 ml-2">
                            <MoreVerticalIcon className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <PencilIcon className="size-4 mr-2" />
                          {t.haccp.editTemplate}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {template.is_active ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onToggleActive(template.id, false)}
                          >
                            <TrashIcon className="size-4 mr-2" />
                            {t.haccp.deactivate}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onToggleActive(template.id, true)}>
                            <CheckCircle2Icon className="size-4 mr-2" />
                            {t.haccp.activate}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>

            {auditLog.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <HistoryIcon className="size-4" />
                  {t.haccp.auditLog}
                </p>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {auditLog.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={
                        entry.action === "created" ? "text-green-600" :
                        entry.action === "updated" ? "text-blue-600" :
                        entry.action === "deactivated" ? "text-red-600" :
                        "text-green-600"
                      }>
                        {entry.action === "created" && t.haccp.created}
                        {entry.action === "updated" && t.haccp.updated}
                        {entry.action === "deactivated" && t.haccp.deactivated}
                        {entry.action === "activated" && t.haccp.activated}
                      </span>
                      <span className="font-medium text-foreground">{entry.templateName}</span>
                      <span>•</span>
                      <span>{new Date(entry.timestamp).toLocaleString(locale === "it" ? "it-IT" : "en-US", { dateStyle: "short", timeStyle: "short" })}</span>
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

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
        onSave={handleSave}
      />
    </>
  )
}

export default function HACCPPage() {
  const t = useTranslations()
  const { locale } = useI18n()
  const [rawTemplates, setRawTemplates] = React.useState<HACCPTemplate[]>([])
  const [templates, setTemplates] = React.useState<ChecklistItemUI[]>([])
  const [history, setHistory] = React.useState<HACCPEntryUI[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [manageDrawerOpen, setManageDrawerOpen] = React.useState(false)
  const [auditLog, setAuditLog] = React.useState<AuditLogEntry[]>([])

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [templatesRes, checklistsRes] = await Promise.all([
          haccp.templates.list(false), // Get all templates including inactive
          haccp.checklists.list(),
        ])
        setRawTemplates(templatesRes)
        setTemplates(templatesRes.filter((t) => t.is_active).map(mapTemplateToUI))
        setHistory(checklistsRes.map(mapChecklistToUI))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load HACCP data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const addAuditEntry = (action: AuditLogEntry["action"], templateName: string, category: string) => {
    setAuditLog((prev) => [
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        templateName,
        category,
      },
      ...prev,
    ])
  }

  const handleCreateTemplate = async (data: Partial<HACCPTemplate>) => {
    const result = await haccp.templates.create(data)
    setRawTemplates((prev) => [...prev, result])
    if (result.is_active) {
      setTemplates((prev) => [...prev, mapTemplateToUI(result)])
    }
    addAuditEntry("created", result.name, result.category || "")
  }

  const handleUpdateTemplate = async (id: number, data: Partial<HACCPTemplate>) => {
    const result = await haccp.templates.update(id, data)
    setRawTemplates((prev) => prev.map((t) => (t.id === id ? result : t)))
    if (result.is_active) {
      setTemplates((prev) => {
        const exists = prev.find((t) => t.id === String(id))
        if (exists) {
          return prev.map((t) => (t.id === String(id) ? mapTemplateToUI(result) : t))
        }
        return [...prev, mapTemplateToUI(result)]
      })
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== String(id)))
    }
    addAuditEntry("updated", result.name, result.category || "")
  }

  const handleToggleActive = async (id: number, active: boolean) => {
    const template = rawTemplates.find((t) => t.id === id)
    if (!template) return

    const result = await haccp.templates.update(id, { is_active: active })
    setRawTemplates((prev) => prev.map((t) => (t.id === id ? result : t)))

    if (active) {
      setTemplates((prev) => [...prev, mapTemplateToUI(result)])
      addAuditEntry("activated", result.name, result.category || "")
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== String(id)))
      addAuditEntry("deactivated", result.name, result.category || "")
    }
  }

  const handleSaveChecklist = async (items: { template_id: number; name: string; category: string; value: string; passed: boolean }[]) => {
    const result = await haccp.checklists.create({
      date: new Date().toISOString().split("T")[0],
      operator: "Current User",
      shift: "morning",
      items: items.map((item) => ({
        template_id: item.template_id,
        name: item.name,
        category: item.category,
        value: item.value,
        passed: item.passed,
      })),
    })
    setHistory((prev) => [mapChecklistToUI(result), ...prev])
  }

  // Calculate compliance stats from history
  const last7Days = history.filter((h) => {
    const date = new Date(h.date)
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const last30Days = history.filter((h) => {
    const date = new Date(h.date)
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 30
  })

  const complianceStats = {
    last7Days: last7Days.length > 0
      ? (last7Days.filter((h) => h.status === "pass").length / last7Days.length) * 100
      : 0,
    last30Days: last30Days.length > 0
      ? (last30Days.filter((h) => h.status === "pass").length / last30Days.length) * 100
      : 0,
    totalChecks: history.reduce((sum, h) => sum + h.items.length, 0),
    passedChecks: history.reduce((sum, h) => sum + h.items.filter((i) => i.passed).length, 0),
    failedChecks: history.reduce((sum, h) => sum + h.items.filter((i) => !i.passed).length, 0),
  }

  const historyColumns: ColumnDef<HACCPEntryUI>[] = [
    {
      accessorKey: "date",
      header: t.haccp.date,
      cell: ({ row }) =>
        new Date(row.original.date).toLocaleDateString(locale === "it" ? "it-IT" : "en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
    },
    {
      accessorKey: "operator",
      header: t.haccp.operator,
    },
    {
      accessorKey: "status",
      header: t.haccp.status,
      cell: ({ row }) => <HACCPStatusBadge status={row.original.status} />,
    },
    {
      id: "completion",
      header: t.haccp.completion,
      cell: ({ row }) => {
        const total = templates.filter((i) => i.required).length || 1
        const completed = row.original.items.length
        return (
          <div className="flex items-center gap-2">
            <Progress value={(completed / total) * 100} className="w-16 h-2" />
            <span className="text-sm text-muted-foreground">{completed}/{total}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "notes",
      header: t.haccp.notes,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.notes || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <HistoryDrawer entry={row.original} templates={templates} />,
    },
  ]

  const table = useReactTable({
    data: history,
    columns: historyColumns,
    getCoreRowModel: getCoreRowModel(),
  })

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
        title={t.haccp.title}
        description={t.haccp.description}
      />

      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.compliance7}</CardDescription>
            <CardTitle className="text-3xl">{complianceStats.last7Days.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceStats.last7Days} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.compliance30}</CardDescription>
            <CardTitle className="text-3xl">{complianceStats.last30Days.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceStats.last30Days} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.passed}</CardDescription>
            <CardTitle className="text-3xl text-green-600">{complianceStats.passedChecks}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.haccp.of} {complianceStats.totalChecks} {t.haccp.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.haccp.failed}</CardDescription>
            <CardTitle className="text-3xl text-red-600">{complianceStats.failedChecks}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.haccp.toVerify}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <DailyChecklist templates={templates} onSave={handleSaveChecklist} onManageItems={() => setManageDrawerOpen(true)} />

        <Card>
          <CardHeader>
            <CardTitle>{t.haccp.history}</CardTitle>
            <CardDescription>{t.haccp.historyDesc}</CardDescription>
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
                  {table.getRowModel().rows.length > 0 ? (
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
                      <TableCell colSpan={historyColumns.length} className="h-24 text-center">
                        No history records yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ManageTemplatesDrawer
        open={manageDrawerOpen}
        onOpenChange={setManageDrawerOpen}
        templates={rawTemplates}
        auditLog={auditLog}
        onCreateTemplate={handleCreateTemplate}
        onUpdateTemplate={handleUpdateTemplate}
        onToggleActive={handleToggleActive}
      />
    </div>
  )
}
