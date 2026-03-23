const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || "API Error")
  }

  return res.json()
}

// Suppliers
export interface Supplier {
  id: number
  name: string
  category: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  payment_terms: string | null
  reliability_score: number
  avg_delivery_days: number
  created_at: string
  updated_at: string
}

export const suppliers = {
  list: (category?: string) =>
    fetchAPI<{ items: Supplier[]; total: number }>(
      `/suppliers${category ? `?category=${category}` : ""}`
    ),
  get: (id: number) => fetchAPI<Supplier>(`/suppliers/${id}`),
  create: (data: Partial<Supplier>) =>
    fetchAPI<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Supplier>) =>
    fetchAPI<Supplier>(`/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/suppliers/${id}`, { method: "DELETE" }),
}

// Products
export interface Product {
  id: number
  name: string
  category: string | null
  unit: string | null
  unit_price: number
  supplier_id: number | null
  sku: string | null
  min_stock: number
  created_at: string
  updated_at: string
}

export const products = {
  list: (params?: { category?: string; supplier_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.category) query.set("category", params.category)
    if (params?.supplier_id) query.set("supplier_id", String(params.supplier_id))
    return fetchAPI<Product[]>(`/products${query.toString() ? `?${query}` : ""}`)
  },
  get: (id: number) => fetchAPI<Product>(`/products/${id}`),
  create: (data: Partial<Product>) =>
    fetchAPI<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Product>) =>
    fetchAPI<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" }),
}

// Deliveries
export interface DeliveryItem {
  id: number
  product_id: number | null
  product_name: string | null
  quantity: number
  unit: string | null
  unit_price: number
}

export interface Delivery {
  id: number
  supplier_id: number
  date: string
  status: "pending" | "on_time" | "late" | "partial"
  notes: string | null
  created_at: string
  items: DeliveryItem[]
}

export const deliveries = {
  list: (params?: { supplier_id?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.supplier_id) query.set("supplier_id", String(params.supplier_id))
    if (params?.status) query.set("status", params.status)
    return fetchAPI<Delivery[]>(`/deliveries${query.toString() ? `?${query}` : ""}`)
  },
  get: (id: number) => fetchAPI<Delivery>(`/deliveries/${id}`),
  create: (data: {
    supplier_id: number
    date: string
    status?: string
    notes?: string
    items?: Array<{ product_id?: number; product_name?: string; quantity: number; unit?: string; unit_price?: number }>
  }) =>
    fetchAPI<Delivery>("/deliveries", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Delivery>) =>
    fetchAPI<Delivery>(`/deliveries/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/deliveries/${id}`, { method: "DELETE" }),
}

// Invoices
export interface InvoiceLine {
  id: number
  product_id: number | null
  description: string | null
  quantity: number
  unit: string | null
  unit_price: number
  total: number
}

export interface Invoice {
  id: number
  supplier_id: number | null
  invoice_number: string | null
  date: string
  total: number
  vat: number
  file_url: string | null
  status: "pending" | "verified" | "paid"
  notes: string | null
  created_at: string
  lines: InvoiceLine[]
}

export interface InvoiceLineCreate {
  product_id?: number
  description?: string
  quantity: number
  unit?: string
  unit_price: number
  total: number
}

export interface InvoiceCreate {
  supplier_id?: number
  invoice_number?: string
  date: string
  total?: number
  vat?: number
  status?: string
  notes?: string
  lines?: InvoiceLineCreate[]
}

export const invoices = {
  list: (params?: { supplier_id?: number; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.supplier_id) query.set("supplier_id", String(params.supplier_id))
    if (params?.status) query.set("status", params.status)
    return fetchAPI<Invoice[]>(`/invoices${query.toString() ? `?${query}` : ""}`)
  },
  get: (id: number) => fetchAPI<Invoice>(`/invoices/${id}`),
  create: (data: InvoiceCreate) =>
    fetchAPI<Invoice>("/invoices", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    fetchAPI<Invoice>(`/invoices/${id}?status=${status}`, { method: "PATCH" }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/invoices/${id}`, { method: "DELETE" }),
}

// Inventory
export interface InventoryItem {
  id: number
  product_id: number
  location_id: number | null
  quantity: number
  theoretical_quantity: number
  last_count_date: string | null
  updated_at: string
  product_name: string
  product_unit: string | null
  min_stock: number
  variance_pct: number | null
}

export const inventory = {
  list: (params?: { location_id?: number; low_stock?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.location_id) query.set("location_id", String(params.location_id))
    if (params?.low_stock) query.set("low_stock", "true")
    return fetchAPI<InventoryItem[]>(`/inventory${query.toString() ? `?${query}` : ""}`)
  },
  get: (id: number) => fetchAPI<InventoryItem>(`/inventory/${id}`),
  update: (id: number, data: { quantity?: number; theoretical_quantity?: number }) =>
    fetchAPI<InventoryItem>(`/inventory/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  recordCount: (product_id: number, quantity: number, location_id?: number) =>
    fetchAPI<InventoryItem>(
      `/inventory/count/${product_id}?quantity=${quantity}${location_id ? `&location_id=${location_id}` : ""}`,
      { method: "POST" }
    ),
}

// HACCP
export interface HACCPTemplate {
  id: number
  name: string
  category: string | null
  input_type: "boolean" | "number" | "text"
  min_value: number | null
  max_value: number | null
  unit: string | null
  frequency: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface HACCPItem {
  id: number
  template_id: number | null
  name: string
  category: string | null
  value: string | null
  passed: boolean | null
  notes: string | null
}

export interface HACCPChecklist {
  id: number
  location_id: number | null
  date: string
  operator: string | null
  shift: string | null
  status: "incomplete" | "passed" | "failed"
  notes: string | null
  created_at: string
  items: HACCPItem[]
}

export const haccp = {
  templates: {
    list: (activeOnly = true) =>
      fetchAPI<HACCPTemplate[]>(`/haccp/templates?active_only=${activeOnly}`),
    create: (data: Partial<HACCPTemplate>) =>
      fetchAPI<HACCPTemplate>("/haccp/templates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<HACCPTemplate>) =>
      fetchAPI<HACCPTemplate>(`/haccp/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      fetchAPI<{ ok: boolean }>(`/haccp/templates/${id}`, { method: "DELETE" }),
  },
  checklists: {
    list: (params?: { location_id?: number; start_date?: string; end_date?: string }) => {
      const query = new URLSearchParams()
      if (params?.location_id) query.set("location_id", String(params.location_id))
      if (params?.start_date) query.set("start_date", params.start_date)
      if (params?.end_date) query.set("end_date", params.end_date)
      return fetchAPI<HACCPChecklist[]>(`/haccp/checklists${query.toString() ? `?${query}` : ""}`)
    },
    get: (id: number) => fetchAPI<HACCPChecklist>(`/haccp/checklists/${id}`),
    create: (data: {
      date: string
      operator?: string
      shift?: string
      location_id?: number
      items: Array<{ template_id?: number; name: string; category?: string; value?: string; passed?: boolean }>
    }) =>
      fetchAPI<HACCPChecklist>("/haccp/checklists", { method: "POST", body: JSON.stringify(data) }),
    today: (location_id?: number) =>
      fetchAPI<HACCPChecklist | null>(`/haccp/today${location_id ? `?location_id=${location_id}` : ""}`),
  },
}

// Locations
export interface Location {
  id: number
  name: string
  address: string | null
  created_at: string
}

export const locations = {
  list: () => fetchAPI<Location[]>("/locations"),
  get: (id: number) => fetchAPI<Location>(`/locations/${id}`),
  create: (data: { name: string; address?: string }) =>
    fetchAPI<Location>("/locations", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/locations/${id}`, { method: "DELETE" }),
}

// Recipes
export interface RecipeIngredient {
  id: number
  product_id: number
  quantity: number
  unit: string | null
  product_name?: string | null
  product_unit_price?: number | null
}

export interface Recipe {
  id: number
  name: string
  category: string | null
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
  cost: number
  margin: number
  ingredients: RecipeIngredient[]
}

export interface RecipeListItem {
  id: number
  name: string
  category: string | null
  price: number
  is_active: boolean
  cost: number
  margin: number
  sales_per_week: number
}

export const recipes = {
  list: (params?: { category?: string; is_active?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.category) query.set("category", params.category)
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active))
    return fetchAPI<RecipeListItem[]>(`/recipes${query.toString() ? `?${query}` : ""}`)
  },
  get: (id: number) => fetchAPI<Recipe>(`/recipes/${id}`),
  create: (data: {
    name: string
    category?: string
    price?: number
    is_active?: boolean
    ingredients?: Array<{ product_id: number; quantity: number; unit?: string }>
  }) => fetchAPI<Recipe>("/recipes", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Recipe> & { ingredients?: Array<{ product_id: number; quantity: number; unit?: string }> }) =>
    fetchAPI<Recipe>(`/recipes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/recipes/${id}`, { method: "DELETE" }),
}

// Orders
export interface OrderItem {
  id: number
  recipe_id: number
  quantity: number
  unit_price: number
  recipe_name?: string | null
}

export interface Order {
  id: number
  location_id: number | null
  date: string
  total: number
  created_at: string
  items: OrderItem[]
}

export const orders = {
  list: (params?: { location_id?: number; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams()
    if (params?.location_id) query.set("location_id", String(params.location_id))
    if (params?.start_date) query.set("start_date", params.start_date)
    if (params?.end_date) query.set("end_date", params.end_date)
    return fetchAPI<Order[]>(`/orders${query.toString() ? `?${query}` : ""}`)
  },
  get: (id: number) => fetchAPI<Order>(`/orders/${id}`),
  create: (data: {
    location_id?: number
    date: string
    items: Array<{ recipe_id: number; quantity: number; unit_price: number }>
  }) => fetchAPI<Order>("/orders", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchAPI<{ ok: boolean }>(`/orders/${id}`, { method: "DELETE" }),
}

// Price History
export interface PriceHistoryRecord {
  id: number
  product_id: number
  price: number
  recorded_at: string
}

export const priceHistory = {
  list: (params?: { product_id?: number; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams()
    if (params?.product_id) query.set("product_id", String(params.product_id))
    if (params?.start_date) query.set("start_date", params.start_date)
    if (params?.end_date) query.set("end_date", params.end_date)
    return fetchAPI<PriceHistoryRecord[]>(`/price-history${query.toString() ? `?${query}` : ""}`)
  },
  create: (data: { product_id: number; price: number }) =>
    fetchAPI<PriceHistoryRecord>("/price-history", { method: "POST", body: JSON.stringify(data) }),
}

// OCR
export interface OCRLine {
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total: number
}

export interface OCRResult {
  supplier_name: string | null
  invoice_number: string | null
  date: string | null
  lines: OCRLine[]
  subtotal: number
  vat: number
  total: number
}

export const ocr = {
  processInvoice: async (file: File): Promise<OCRResult> => {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`${API_BASE}/ocr/invoice`, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail || "OCR Error")
    }

    return res.json()
  },
}
