"""
Pytest configuration and fixtures for TavolaPerfetta API tests.
Uses SQLite in-memory database for fast, isolated testing.
"""
import os
import pytest
from datetime import date, datetime, timedelta
from typing import Generator

# Set test database URL BEFORE importing app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import Supplier
from app.models.product import Product
from app.models.delivery import Delivery, DeliveryItem
from app.models.invoice import Invoice, InvoiceLine
from app.models.inventory import Inventory
from app.models.haccp import HACCPTemplate, HACCPChecklist, HACCPItem
from app.models.location import Location
from app.models.price_history import PriceHistory
from app.models.recipe import Recipe, RecipeIngredient
from app.models.order import Order, OrderItem


# Test database setup - SQLite in memory with foreign key support
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ============ Sample Data Fixtures ============

@pytest.fixture
def sample_location(db: Session) -> Location:
    """Create a sample location."""
    location = Location(name="Main Kitchen", address="123 Restaurant St")
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@pytest.fixture
def sample_supplier(db: Session) -> Supplier:
    """Create a sample supplier."""
    supplier = Supplier(
        name="Fresh Farms Inc",
        category="Produce",
        contact_name="John Farmer",
        contact_email="john@freshfarms.com",
        contact_phone="+39 123 456 789",
        address="456 Farm Road",
        payment_terms="Net 30",
        reliability_score=95.0,
        avg_delivery_days=2.5,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@pytest.fixture
def sample_suppliers(db: Session) -> list[Supplier]:
    """Create multiple suppliers for testing."""
    suppliers = [
        Supplier(name="Fresh Farms", category="Produce", reliability_score=95.0),
        Supplier(name="Ocean Catch", category="Seafood", reliability_score=88.0),
        Supplier(name="Pasta Palace", category="Dry Goods", reliability_score=92.0),
        Supplier(name="Dairy Direct", category="Dairy", reliability_score=90.0),
        Supplier(name="Meat Masters", category="Meat", reliability_score=85.0),
    ]
    for s in suppliers:
        db.add(s)
    db.commit()
    for s in suppliers:
        db.refresh(s)
    return suppliers


@pytest.fixture
def sample_product(db: Session, sample_supplier: Supplier) -> Product:
    """Create a sample product."""
    product = Product(
        name="Tomatoes",
        category="Produce",
        unit="kg",
        unit_price=3.50,
        supplier_id=sample_supplier.id,
        sku="TOM-001",
        min_stock=10,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@pytest.fixture
def sample_products(db: Session, sample_suppliers: list[Supplier]) -> list[Product]:
    """Create multiple products for testing."""
    products = [
        Product(name="Tomatoes", category="Produce", unit="kg", unit_price=3.50, supplier_id=sample_suppliers[0].id, min_stock=10),
        Product(name="Salmon", category="Seafood", unit="kg", unit_price=25.00, supplier_id=sample_suppliers[1].id, min_stock=5),
        Product(name="Spaghetti", category="Pasta", unit="kg", unit_price=2.00, supplier_id=sample_suppliers[2].id, min_stock=20),
        Product(name="Mozzarella", category="Dairy", unit="kg", unit_price=12.00, supplier_id=sample_suppliers[3].id, min_stock=8),
        Product(name="Beef Tenderloin", category="Meat", unit="kg", unit_price=45.00, supplier_id=sample_suppliers[4].id, min_stock=3),
        Product(name="Olive Oil", category="Oils", unit="L", unit_price=15.00, supplier_id=sample_suppliers[0].id, min_stock=10),
        Product(name="Basil", category="Herbs", unit="bunch", unit_price=1.50, supplier_id=sample_suppliers[0].id, min_stock=15),
        Product(name="Parmesan", category="Dairy", unit="kg", unit_price=28.00, supplier_id=sample_suppliers[3].id, min_stock=5),
    ]
    for p in products:
        db.add(p)
    db.commit()
    for p in products:
        db.refresh(p)
    return products


@pytest.fixture
def sample_inventory(db: Session, sample_products: list[Product], sample_location: Location) -> list[Inventory]:
    """Create inventory items for products."""
    inventory_items = []
    quantities = [25, 8, 35, 12, 5, 18, 20, 7]  # Various stock levels

    for i, product in enumerate(sample_products):
        inv = Inventory(
            product_id=product.id,
            location_id=sample_location.id,
            quantity=quantities[i],
            theoretical_quantity=quantities[i],
            last_count_date=date.today(),
        )
        db.add(inv)
        inventory_items.append(inv)

    db.commit()
    for inv in inventory_items:
        db.refresh(inv)
    return inventory_items


@pytest.fixture
def sample_delivery(db: Session, sample_supplier: Supplier, sample_product: Product) -> Delivery:
    """Create a sample delivery with items."""
    delivery = Delivery(
        supplier_id=sample_supplier.id,
        date=date.today(),
        status="on_time",
        notes="Regular delivery",
    )
    db.add(delivery)
    db.flush()

    item = DeliveryItem(
        delivery_id=delivery.id,
        product_id=sample_product.id,
        product_name=sample_product.name,
        quantity=50,
        unit="kg",
        unit_price=3.50,
    )
    db.add(item)
    db.commit()
    db.refresh(delivery)
    return delivery


@pytest.fixture
def sample_deliveries(db: Session, sample_suppliers: list[Supplier], sample_products: list[Product]) -> list[Delivery]:
    """Create multiple deliveries with various statuses."""
    deliveries = []
    statuses = ["on_time", "on_time", "late", "partial", "pending"]

    for i, supplier in enumerate(sample_suppliers):
        delivery = Delivery(
            supplier_id=supplier.id,
            date=date.today() - timedelta(days=i),
            status=statuses[i],
            notes=f"Delivery {i+1}",
        )
        db.add(delivery)
        db.flush()

        # Add items
        product = sample_products[i] if i < len(sample_products) else sample_products[0]
        item = DeliveryItem(
            delivery_id=delivery.id,
            product_id=product.id,
            product_name=product.name,
            quantity=10 + i * 5,
            unit=product.unit,
            unit_price=product.unit_price,
        )
        db.add(item)
        deliveries.append(delivery)

    db.commit()
    for d in deliveries:
        db.refresh(d)
    return deliveries


@pytest.fixture
def sample_invoice(db: Session, sample_supplier: Supplier, sample_product: Product) -> Invoice:
    """Create a sample invoice with lines."""
    invoice = Invoice(
        supplier_id=sample_supplier.id,
        invoice_number="INV-2024-001",
        date=date.today(),
        total=175.00,
        vat=35.00,
        status="pending",
    )
    db.add(invoice)
    db.flush()

    line = InvoiceLine(
        invoice_id=invoice.id,
        product_id=sample_product.id,
        description="Tomatoes - Grade A",
        quantity=50,
        unit="kg",
        unit_price=3.50,
        total=175.00,
    )
    db.add(line)
    db.commit()
    db.refresh(invoice)
    return invoice


@pytest.fixture
def sample_recipe(db: Session, sample_products: list[Product]) -> Recipe:
    """Create a sample recipe with ingredients."""
    recipe = Recipe(
        name="Margherita Pizza",
        category="Pizza",
        description="Classic Italian pizza with tomatoes, mozzarella, and basil",
        price=12.00,
        is_active=True,
    )
    db.add(recipe)
    db.flush()

    # Add ingredients
    ingredients = [
        RecipeIngredient(recipe_id=recipe.id, product_id=sample_products[0].id, quantity=0.2, unit="kg", waste_pct=5),  # Tomatoes
        RecipeIngredient(recipe_id=recipe.id, product_id=sample_products[3].id, quantity=0.15, unit="kg", waste_pct=0),  # Mozzarella
        RecipeIngredient(recipe_id=recipe.id, product_id=sample_products[6].id, quantity=0.5, unit="bunch", waste_pct=10),  # Basil
        RecipeIngredient(recipe_id=recipe.id, product_id=sample_products[5].id, quantity=0.02, unit="L", waste_pct=0),  # Olive oil
    ]
    for ing in ingredients:
        db.add(ing)

    db.commit()
    db.refresh(recipe)
    return recipe


@pytest.fixture
def sample_recipes(db: Session, sample_products: list[Product]) -> list[Recipe]:
    """Create multiple recipes."""
    recipes_data = [
        {"name": "Margherita Pizza", "category": "Pizza", "price": 12.00},
        {"name": "Spaghetti Carbonara", "category": "Pasta", "price": 14.00},
        {"name": "Grilled Salmon", "category": "Main", "price": 22.00},
        {"name": "Caesar Salad", "category": "Salad", "price": 10.00},
        {"name": "Beef Tenderloin", "category": "Main", "price": 35.00},
    ]

    recipes = []
    for data in recipes_data:
        recipe = Recipe(**data, is_active=True)
        db.add(recipe)
        recipes.append(recipe)

    db.flush()

    # Add some ingredients to each
    for i, recipe in enumerate(recipes):
        ing = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=sample_products[i % len(sample_products)].id,
            quantity=0.5,
            unit="kg",
            waste_pct=5,
        )
        db.add(ing)

    db.commit()
    for r in recipes:
        db.refresh(r)
    return recipes


@pytest.fixture
def sample_order(db: Session, sample_recipes: list[Recipe], sample_location: Location) -> Order:
    """Create a sample order."""
    order = Order(
        location_id=sample_location.id,
        date=date.today(),
        total=0,
    )
    db.add(order)
    db.flush()

    total = 0
    for recipe in sample_recipes[:3]:
        item = OrderItem(
            order_id=order.id,
            recipe_id=recipe.id,
            quantity=2,
            unit_price=recipe.price,
        )
        db.add(item)
        total += 2 * recipe.price

    order.total = total
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def sample_haccp_templates(db: Session) -> list[HACCPTemplate]:
    """Create HACCP templates."""
    templates = [
        HACCPTemplate(name="Fridge Temperature", category="Temperature", input_type="number", min_value=0, max_value=5, unit="°C", frequency="daily", is_active=True, sort_order=1),
        HACCPTemplate(name="Freezer Temperature", category="Temperature", input_type="number", min_value=-25, max_value=-18, unit="°C", frequency="daily", is_active=True, sort_order=2),
        HACCPTemplate(name="Food Prep Area Clean", category="Hygiene", input_type="boolean", frequency="daily", is_active=True, sort_order=3),
        HACCPTemplate(name="Hand Washing Station", category="Hygiene", input_type="boolean", frequency="daily", is_active=True, sort_order=4),
        HACCPTemplate(name="Cooking Temperature", category="Temperature", input_type="number", min_value=75, max_value=100, unit="°C", frequency="per_use", is_active=True, sort_order=5),
    ]
    for t in templates:
        db.add(t)
    db.commit()
    for t in templates:
        db.refresh(t)
    return templates


@pytest.fixture
def sample_haccp_checklist(db: Session, sample_haccp_templates: list[HACCPTemplate], sample_location: Location) -> HACCPChecklist:
    """Create a HACCP checklist with items."""
    checklist = HACCPChecklist(
        location_id=sample_location.id,
        date=date.today(),
        operator="Chef Mario",
        shift="morning",
        status="passed",
    )
    db.add(checklist)
    db.flush()

    items = [
        HACCPItem(checklist_id=checklist.id, template_id=sample_haccp_templates[0].id, name="Fridge Temperature", category="Temperature", value="3", passed=True),
        HACCPItem(checklist_id=checklist.id, template_id=sample_haccp_templates[1].id, name="Freezer Temperature", category="Temperature", value="-20", passed=True),
        HACCPItem(checklist_id=checklist.id, template_id=sample_haccp_templates[2].id, name="Food Prep Area Clean", category="Hygiene", value="yes", passed=True),
    ]
    for item in items:
        db.add(item)

    db.commit()
    db.refresh(checklist)
    return checklist


@pytest.fixture
def sample_price_history(db: Session, sample_products: list[Product]) -> list[PriceHistory]:
    """Create price history records."""
    records = []
    base_date = datetime.now() - timedelta(days=90)

    for product in sample_products[:3]:
        # Create price history over 3 months
        prices = [product.unit_price * 0.9, product.unit_price * 0.95, product.unit_price, product.unit_price * 1.05]
        for i, price in enumerate(prices):
            record = PriceHistory(
                product_id=product.id,
                price=price,
                recorded_at=base_date + timedelta(days=i * 30),
            )
            db.add(record)
            records.append(record)

    db.commit()
    for r in records:
        db.refresh(r)
    return records


# ============ Helper Functions ============

def create_auth_headers(token: str = "test-token") -> dict:
    """Create authorization headers (for future auth implementation)."""
    return {"Authorization": f"Bearer {token}"}
