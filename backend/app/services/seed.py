"""Seed database with sample data"""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from ..models import (
    Location, Supplier, Product, Delivery, DeliveryItem,
    Inventory, HACCPTemplate, HACCPChecklist, HACCPItem
)


def seed_all(db: Session):
    """Seed all tables with sample data"""
    seed_locations(db)
    seed_suppliers(db)
    seed_products(db)
    seed_inventory(db)
    seed_haccp_templates(db)
    seed_sample_deliveries(db)
    seed_sample_haccp(db)


def seed_locations(db: Session):
    if db.query(Location).count() > 0:
        return

    locations = [
        Location(name="Centro", address="Via Roma 15, Milano"),
        Location(name="Navigli", address="Ripa di Porta Ticinese 55, Milano"),
    ]
    db.add_all(locations)
    db.commit()


def seed_suppliers(db: Session):
    if db.query(Supplier).count() > 0:
        return

    suppliers = [
        Supplier(
            name="Ortofrutticola Milano",
            category="produce",
            contact_name="Marco Verdi",
            contact_email="marco@ortomilano.it",
            contact_phone="+39 02 1234567",
            reliability_score=95.0,
            avg_delivery_days=1.0,
            payment_terms="net30"
        ),
        Supplier(
            name="Macelleria Bianchi",
            category="meat",
            contact_name="Giuseppe Bianchi",
            contact_email="giuseppe@macelleriabianchi.it",
            contact_phone="+39 02 2345678",
            reliability_score=98.0,
            avg_delivery_days=1.5,
            payment_terms="net30"
        ),
        Supplier(
            name="Latteria Lombarda",
            category="dairy",
            contact_name="Anna Rossi",
            contact_email="anna@latterialombarda.it",
            contact_phone="+39 02 3456789",
            reliability_score=92.0,
            avg_delivery_days=1.0,
            payment_terms="cod"
        ),
        Supplier(
            name="Pescheria Adriatico",
            category="seafood",
            contact_name="Luca Marino",
            contact_email="luca@pescheriadriatico.it",
            contact_phone="+39 02 4567890",
            reliability_score=88.0,
            avg_delivery_days=0.5,
            payment_terms="net15"
        ),
        Supplier(
            name="Dispensa Mediterranea",
            category="dry_goods",
            contact_name="Sofia Greco",
            contact_email="sofia@dispensamed.it",
            contact_phone="+39 02 5678901",
            reliability_score=99.0,
            avg_delivery_days=3.0,
            payment_terms="net60"
        ),
    ]
    db.add_all(suppliers)
    db.commit()


def seed_products(db: Session):
    if db.query(Product).count() > 0:
        return

    suppliers = {s.category: s.id for s in db.query(Supplier).all()}

    products = [
        # Produce
        Product(name="Pomodori San Marzano", category="vegetable", unit="kg", unit_price=3.50, supplier_id=suppliers.get("produce"), min_stock=10),
        Product(name="Basilico fresco", category="herb", unit="bunch", unit_price=1.20, supplier_id=suppliers.get("produce"), min_stock=5),
        Product(name="Cipolle dorate", category="vegetable", unit="kg", unit_price=1.80, supplier_id=suppliers.get("produce"), min_stock=8),
        Product(name="Aglio", category="vegetable", unit="kg", unit_price=8.00, supplier_id=suppliers.get("produce"), min_stock=2),
        Product(name="Zucchine", category="vegetable", unit="kg", unit_price=2.50, supplier_id=suppliers.get("produce"), min_stock=5),
        # Meat
        Product(name="Manzo macinato", category="meat", unit="kg", unit_price=12.00, supplier_id=suppliers.get("meat"), min_stock=5),
        Product(name="Pancetta", category="meat", unit="kg", unit_price=15.00, supplier_id=suppliers.get("meat"), min_stock=3),
        Product(name="Guanciale", category="meat", unit="kg", unit_price=18.00, supplier_id=suppliers.get("meat"), min_stock=2),
        Product(name="Salsiccia italiana", category="meat", unit="kg", unit_price=10.00, supplier_id=suppliers.get("meat"), min_stock=4),
        # Dairy
        Product(name="Parmigiano Reggiano 24 mesi", category="cheese", unit="kg", unit_price=22.00, supplier_id=suppliers.get("dairy"), min_stock=3),
        Product(name="Mozzarella di Bufala", category="cheese", unit="kg", unit_price=16.00, supplier_id=suppliers.get("dairy"), min_stock=4),
        Product(name="Ricotta fresca", category="cheese", unit="kg", unit_price=8.00, supplier_id=suppliers.get("dairy"), min_stock=3),
        Product(name="Burro", category="dairy", unit="kg", unit_price=12.00, supplier_id=suppliers.get("dairy"), min_stock=2),
        Product(name="Panna fresca", category="dairy", unit="l", unit_price=6.00, supplier_id=suppliers.get("dairy"), min_stock=5),
        # Seafood
        Product(name="Gamberi freschi", category="seafood", unit="kg", unit_price=25.00, supplier_id=suppliers.get("seafood"), min_stock=2),
        Product(name="Vongole veraci", category="seafood", unit="kg", unit_price=18.00, supplier_id=suppliers.get("seafood"), min_stock=3),
        Product(name="Calamari", category="seafood", unit="kg", unit_price=15.00, supplier_id=suppliers.get("seafood"), min_stock=2),
        # Dry goods
        Product(name="Spaghetti De Cecco", category="pasta", unit="kg", unit_price=2.50, supplier_id=suppliers.get("dry_goods"), min_stock=20),
        Product(name="Penne rigate", category="pasta", unit="kg", unit_price=2.30, supplier_id=suppliers.get("dry_goods"), min_stock=15),
        Product(name="Olio EVO Toscano", category="oil", unit="l", unit_price=12.00, supplier_id=suppliers.get("dry_goods"), min_stock=10),
        Product(name="Farina 00", category="flour", unit="kg", unit_price=1.50, supplier_id=suppliers.get("dry_goods"), min_stock=25),
    ]
    db.add_all(products)
    db.commit()


def seed_inventory(db: Session):
    if db.query(Inventory).count() > 0:
        return

    products = db.query(Product).all()
    location = db.query(Location).first()

    for product in products:
        qty = product.min_stock * 1.5  # 50% above min stock
        inv = Inventory(
            product_id=product.id,
            location_id=location.id if location else None,
            quantity=qty,
            theoretical_quantity=qty,
            last_count_date=datetime.utcnow()
        )
        db.add(inv)
    db.commit()


def seed_haccp_templates(db: Session):
    if db.query(HACCPTemplate).count() > 0:
        return

    templates = [
        HACCPTemplate(name="Frigo principale", category="temperature", input_type="number", min_value=0, max_value=4, unit="°C", sort_order=1),
        HACCPTemplate(name="Congelatore", category="temperature", input_type="number", min_value=-22, max_value=-18, unit="°C", sort_order=2),
        HACCPTemplate(name="Frigo pesce", category="temperature", input_type="number", min_value=0, max_value=2, unit="°C", sort_order=3),
        HACCPTemplate(name="Pulizia superfici lavoro", category="cleaning", input_type="boolean", sort_order=4),
        HACCPTemplate(name="Pulizia pavimenti", category="cleaning", input_type="boolean", sort_order=5),
        HACCPTemplate(name="Lavaggio mani personale", category="hygiene", input_type="boolean", sort_order=6),
        HACCPTemplate(name="Uniformi pulite", category="hygiene", input_type="boolean", sort_order=7),
        HACCPTemplate(name="Rotazione FIFO verificata", category="storage", input_type="boolean", sort_order=8),
        HACCPTemplate(name="Scadenze controllate", category="storage", input_type="boolean", sort_order=9),
    ]
    db.add_all(templates)
    db.commit()


def seed_sample_deliveries(db: Session):
    if db.query(Delivery).count() > 0:
        return

    supplier = db.query(Supplier).filter(Supplier.category == "produce").first()
    if not supplier:
        return

    products = db.query(Product).filter(Product.supplier_id == supplier.id).limit(3).all()

    today = date.today()
    for i in range(5):
        delivery = Delivery(
            supplier_id=supplier.id,
            date=today - timedelta(days=i*2),
            status=["on_time", "on_time", "late", "on_time", "partial"][i],
            notes=None
        )
        db.add(delivery)
        db.flush()

        for product in products:
            item = DeliveryItem(
                delivery_id=delivery.id,
                product_id=product.id,
                product_name=product.name,
                quantity=5.0 + i,
                unit=product.unit,
                unit_price=product.unit_price
            )
            db.add(item)

    db.commit()


def seed_sample_haccp(db: Session):
    if db.query(HACCPChecklist).count() > 0:
        return

    templates = db.query(HACCPTemplate).filter(HACCPTemplate.is_active == True).all()
    location = db.query(Location).first()

    today = date.today()
    for i in range(7):
        checklist = HACCPChecklist(
            location_id=location.id if location else None,
            date=today - timedelta(days=i),
            operator="Chef Marco",
            shift="morning",
            status="passed" if i != 2 else "failed"
        )
        db.add(checklist)
        db.flush()

        for template in templates:
            if template.input_type == "number":
                value = str((template.min_value + template.max_value) / 2)
                passed = True
            else:
                passed = True if i != 2 else (template.sort_order < 6)
                value = str(passed).lower()

            item = HACCPItem(
                checklist_id=checklist.id,
                template_id=template.id,
                name=template.name,
                category=template.category,
                value=value,
                passed=passed
            )
            db.add(item)

    db.commit()


if __name__ == "__main__":
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        seed_all(db)
        print("Seeding complete!")
    finally:
        db.close()
