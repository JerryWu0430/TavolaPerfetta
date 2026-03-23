from .suppliers import router as suppliers_router
from .products import router as products_router
from .deliveries import router as deliveries_router
from .invoices import router as invoices_router
from .inventory import router as inventory_router
from .haccp import router as haccp_router
from .locations import router as locations_router
from .ocr import router as ocr_router

__all__ = [
    "suppliers_router",
    "products_router",
    "deliveries_router",
    "invoices_router",
    "inventory_router",
    "haccp_router",
    "locations_router",
    "ocr_router",
]
