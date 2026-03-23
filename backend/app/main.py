from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import (
    suppliers_router,
    products_router,
    deliveries_router,
    invoices_router,
    inventory_router,
    haccp_router,
    locations_router,
    ocr_router,
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TavolaPerfetta API",
    description="Restaurant management backend",
    version="1.0.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(suppliers_router)
app.include_router(products_router)
app.include_router(deliveries_router)
app.include_router(invoices_router)
app.include_router(inventory_router)
app.include_router(haccp_router)
app.include_router(locations_router)
app.include_router(ocr_router)


@app.get("/")
def root():
    return {"status": "ok", "app": "TavolaPerfetta API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
