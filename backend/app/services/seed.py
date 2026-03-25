"""Seed database with sample data"""
from datetime import date, datetime, timedelta
import random
from sqlalchemy.orm import Session
from ..models import (
    Restaurant, RestaurantMember, Location, Supplier, Product, Delivery, DeliveryItem,
    Inventory, HACCPTemplate, HACCPChecklist, HACCPItem,
    Recipe, RecipeIngredient, Order, OrderItem, PriceHistory
)


def seed_all(db: Session, restaurant_id: int | None = None):
    """Seed all tables with sample data.

    If restaurant_id is provided, uses that restaurant.
    Otherwise creates a demo restaurant.
    """
    if restaurant_id is None:
        restaurant_id = seed_restaurant(db)

    seed_locations(db, restaurant_id)
    seed_suppliers(db, restaurant_id)
    seed_products(db, restaurant_id)
    seed_inventory(db, restaurant_id)
    seed_haccp_templates(db, restaurant_id)
    seed_sample_deliveries(db, restaurant_id)
    seed_sample_haccp(db, restaurant_id)
    seed_recipes(db, restaurant_id)
    seed_orders(db, restaurant_id)
    seed_price_history(db, restaurant_id)


def seed_restaurant(db: Session) -> int:
    """Create demo restaurant and return its ID."""
    existing = db.query(Restaurant).filter(Restaurant.slug == "demo").first()
    if existing:
        return existing.id

    restaurant = Restaurant(
        name="Ristorante Demo",
        slug="demo",
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)

    # Add a demo admin member (you can add your email here)
    member = RestaurantMember(
        email="admin@demo.com",
        role="admin",
        restaurant_id=restaurant.id,
    )
    db.add(member)
    db.commit()

    return restaurant.id


def seed_locations(db: Session, restaurant_id: int):
    if db.query(Location).filter(Location.restaurant_id == restaurant_id).count() > 0:
        return

    locations = [
        Location(name="Centro", address="Via Roma 15, Milano", restaurant_id=restaurant_id),
        Location(name="Navigli", address="Ripa di Porta Ticinese 55, Milano", restaurant_id=restaurant_id),
    ]
    db.add_all(locations)
    db.commit()


def seed_suppliers(db: Session, restaurant_id: int):
    if db.query(Supplier).filter(Supplier.restaurant_id == restaurant_id).count() > 0:
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
            payment_terms="net30",
            restaurant_id=restaurant_id,
        ),
        Supplier(
            name="Macelleria Bianchi",
            category="meat",
            contact_name="Giuseppe Bianchi",
            contact_email="giuseppe@macelleriabianchi.it",
            contact_phone="+39 02 2345678",
            reliability_score=98.0,
            avg_delivery_days=1.5,
            payment_terms="net30",
            restaurant_id=restaurant_id,
        ),
        Supplier(
            name="Latteria Lombarda",
            category="dairy",
            contact_name="Anna Rossi",
            contact_email="anna@latterialombarda.it",
            contact_phone="+39 02 3456789",
            reliability_score=92.0,
            avg_delivery_days=1.0,
            payment_terms="cod",
            restaurant_id=restaurant_id,
        ),
        Supplier(
            name="Pescheria Adriatico",
            category="seafood",
            contact_name="Luca Marino",
            contact_email="luca@pescheriadriatico.it",
            contact_phone="+39 02 4567890",
            reliability_score=88.0,
            avg_delivery_days=0.5,
            payment_terms="net15",
            restaurant_id=restaurant_id,
        ),
        Supplier(
            name="Dispensa Mediterranea",
            category="dry_goods",
            contact_name="Sofia Greco",
            contact_email="sofia@dispensamed.it",
            contact_phone="+39 02 5678901",
            reliability_score=99.0,
            avg_delivery_days=3.0,
            payment_terms="net60",
            restaurant_id=restaurant_id,
        ),
    ]
    db.add_all(suppliers)
    db.commit()


def seed_products(db: Session, restaurant_id: int):
    if db.query(Product).filter(Product.restaurant_id == restaurant_id).count() > 0:
        return

    suppliers = {s.category: s.id for s in db.query(Supplier).filter(
        Supplier.restaurant_id == restaurant_id
    ).all()}

    products = [
        # Produce
        Product(name="Pomodori San Marzano", category="vegetable", unit="kg", unit_price=3.50, supplier_id=suppliers.get("produce"), min_stock=10, restaurant_id=restaurant_id),
        Product(name="Basilico fresco", category="herb", unit="bunch", unit_price=1.20, supplier_id=suppliers.get("produce"), min_stock=5, restaurant_id=restaurant_id),
        Product(name="Cipolle dorate", category="vegetable", unit="kg", unit_price=1.80, supplier_id=suppliers.get("produce"), min_stock=8, restaurant_id=restaurant_id),
        Product(name="Aglio", category="vegetable", unit="kg", unit_price=8.00, supplier_id=suppliers.get("produce"), min_stock=2, restaurant_id=restaurant_id),
        Product(name="Zucchine", category="vegetable", unit="kg", unit_price=2.50, supplier_id=suppliers.get("produce"), min_stock=5, restaurant_id=restaurant_id),
        # Meat
        Product(name="Manzo macinato", category="meat", unit="kg", unit_price=12.00, supplier_id=suppliers.get("meat"), min_stock=5, restaurant_id=restaurant_id),
        Product(name="Pancetta", category="meat", unit="kg", unit_price=15.00, supplier_id=suppliers.get("meat"), min_stock=3, restaurant_id=restaurant_id),
        Product(name="Guanciale", category="meat", unit="kg", unit_price=18.00, supplier_id=suppliers.get("meat"), min_stock=2, restaurant_id=restaurant_id),
        Product(name="Salsiccia italiana", category="meat", unit="kg", unit_price=10.00, supplier_id=suppliers.get("meat"), min_stock=4, restaurant_id=restaurant_id),
        # Dairy
        Product(name="Parmigiano Reggiano 24 mesi", category="cheese", unit="kg", unit_price=22.00, supplier_id=suppliers.get("dairy"), min_stock=3, restaurant_id=restaurant_id),
        Product(name="Mozzarella di Bufala", category="cheese", unit="kg", unit_price=16.00, supplier_id=suppliers.get("dairy"), min_stock=4, restaurant_id=restaurant_id),
        Product(name="Ricotta fresca", category="cheese", unit="kg", unit_price=8.00, supplier_id=suppliers.get("dairy"), min_stock=3, restaurant_id=restaurant_id),
        Product(name="Burro", category="dairy", unit="kg", unit_price=12.00, supplier_id=suppliers.get("dairy"), min_stock=2, restaurant_id=restaurant_id),
        Product(name="Panna fresca", category="dairy", unit="l", unit_price=6.00, supplier_id=suppliers.get("dairy"), min_stock=5, restaurant_id=restaurant_id),
        # Seafood
        Product(name="Gamberi freschi", category="seafood", unit="kg", unit_price=25.00, supplier_id=suppliers.get("seafood"), min_stock=2, restaurant_id=restaurant_id),
        Product(name="Vongole veraci", category="seafood", unit="kg", unit_price=18.00, supplier_id=suppliers.get("seafood"), min_stock=3, restaurant_id=restaurant_id),
        Product(name="Calamari", category="seafood", unit="kg", unit_price=15.00, supplier_id=suppliers.get("seafood"), min_stock=2, restaurant_id=restaurant_id),
        # Dry goods
        Product(name="Spaghetti De Cecco", category="pasta", unit="kg", unit_price=2.50, supplier_id=suppliers.get("dry_goods"), min_stock=20, restaurant_id=restaurant_id),
        Product(name="Penne rigate", category="pasta", unit="kg", unit_price=2.30, supplier_id=suppliers.get("dry_goods"), min_stock=15, restaurant_id=restaurant_id),
        Product(name="Olio EVO Toscano", category="oil", unit="l", unit_price=12.00, supplier_id=suppliers.get("dry_goods"), min_stock=10, restaurant_id=restaurant_id),
        Product(name="Farina 00", category="flour", unit="kg", unit_price=1.50, supplier_id=suppliers.get("dry_goods"), min_stock=25, restaurant_id=restaurant_id),
    ]
    db.add_all(products)
    db.commit()


def seed_inventory(db: Session, restaurant_id: int):
    if db.query(Inventory).filter(Inventory.restaurant_id == restaurant_id).count() > 0:
        return

    products = db.query(Product).filter(Product.restaurant_id == restaurant_id).all()
    location = db.query(Location).filter(Location.restaurant_id == restaurant_id).first()

    for product in products:
        qty = product.min_stock * 1.5
        inv = Inventory(
            product_id=product.id,
            location_id=location.id if location else None,
            quantity=qty,
            theoretical_quantity=qty,
            last_count_date=datetime.utcnow(),
            restaurant_id=restaurant_id,
        )
        db.add(inv)
    db.commit()


def seed_haccp_templates(db: Session, restaurant_id: int):
    if db.query(HACCPTemplate).filter(HACCPTemplate.restaurant_id == restaurant_id).count() > 0:
        return

    templates = [
        HACCPTemplate(name="Frigo principale", category="temperature", input_type="number", min_value=0, max_value=4, unit="°C", sort_order=1, restaurant_id=restaurant_id),
        HACCPTemplate(name="Congelatore", category="temperature", input_type="number", min_value=-22, max_value=-18, unit="°C", sort_order=2, restaurant_id=restaurant_id),
        HACCPTemplate(name="Frigo pesce", category="temperature", input_type="number", min_value=0, max_value=2, unit="°C", sort_order=3, restaurant_id=restaurant_id),
        HACCPTemplate(name="Pulizia superfici lavoro", category="cleaning", input_type="boolean", sort_order=4, restaurant_id=restaurant_id),
        HACCPTemplate(name="Pulizia pavimenti", category="cleaning", input_type="boolean", sort_order=5, restaurant_id=restaurant_id),
        HACCPTemplate(name="Lavaggio mani personale", category="hygiene", input_type="boolean", sort_order=6, restaurant_id=restaurant_id),
        HACCPTemplate(name="Uniformi pulite", category="hygiene", input_type="boolean", sort_order=7, restaurant_id=restaurant_id),
        HACCPTemplate(name="Rotazione FIFO verificata", category="storage", input_type="boolean", sort_order=8, restaurant_id=restaurant_id),
        HACCPTemplate(name="Scadenze controllate", category="storage", input_type="boolean", sort_order=9, restaurant_id=restaurant_id),
    ]
    db.add_all(templates)
    db.commit()


def seed_sample_deliveries(db: Session, restaurant_id: int):
    if db.query(Delivery).filter(Delivery.restaurant_id == restaurant_id).count() > 0:
        return

    supplier = db.query(Supplier).filter(
        Supplier.category == "produce",
        Supplier.restaurant_id == restaurant_id,
    ).first()
    if not supplier:
        return

    products = db.query(Product).filter(
        Product.supplier_id == supplier.id,
        Product.restaurant_id == restaurant_id,
    ).limit(3).all()

    today = date.today()
    for i in range(5):
        delivery = Delivery(
            supplier_id=supplier.id,
            date=today - timedelta(days=i*2),
            status=["on_time", "on_time", "late", "on_time", "partial"][i],
            notes=None,
            restaurant_id=restaurant_id,
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


def seed_sample_haccp(db: Session, restaurant_id: int):
    if db.query(HACCPChecklist).filter(HACCPChecklist.restaurant_id == restaurant_id).count() > 0:
        return

    templates = db.query(HACCPTemplate).filter(
        HACCPTemplate.is_active == True,
        HACCPTemplate.restaurant_id == restaurant_id,
    ).all()
    location = db.query(Location).filter(Location.restaurant_id == restaurant_id).first()

    today = date.today()
    for i in range(7):
        checklist = HACCPChecklist(
            location_id=location.id if location else None,
            date=today - timedelta(days=i),
            operator="Chef Marco",
            shift="morning",
            status="passed" if i != 2 else "failed",
            restaurant_id=restaurant_id,
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


def seed_recipes(db: Session, restaurant_id: int):
    if db.query(Recipe).filter(Recipe.restaurant_id == restaurant_id).count() > 0:
        return

    products = {p.name: p for p in db.query(Product).filter(
        Product.restaurant_id == restaurant_id
    ).all()}

    recipes_data = [
        {
            "name": "Spaghetti alla Carbonara",
            "category": "primi",
            "description": "Ricetta romana tradizionale con guanciale e uova.",
            "price": 14.00,
            "ingredients": [
                ("Spaghetti De Cecco", 0.12, "kg", 2),
                ("Guanciale", 0.05, "kg", 5),
                ("Parmigiano Reggiano 24 mesi", 0.03, "kg", 1),
            ]
        },
        {
            "name": "Risotto alla Milanese",
            "category": "primi",
            "description": "Cremoso risotto allo zafferano, specialità milanese.",
            "price": 16.00,
            "ingredients": [
                ("Burro", 0.03, "kg", 0),
                ("Parmigiano Reggiano 24 mesi", 0.04, "kg", 1),
                ("Cipolle dorate", 0.03, "kg", 10),
            ]
        },
        {
            "name": "Tagliatelle al Ragù",
            "category": "primi",
            "description": "Ragù bolognese cotto a fuoco lento per ore.",
            "price": 15.00,
            "ingredients": [
                ("Manzo macinato", 0.1, "kg", 3),
                ("Pomodori San Marzano", 0.15, "kg", 5),
                ("Cipolle dorate", 0.03, "kg", 10),
            ]
        },
        {
            "name": "Spaghetti alle Vongole",
            "category": "primi",
            "description": "Vongole veraci fresche con aglio e prezzemolo.",
            "price": 18.00,
            "ingredients": [
                ("Spaghetti De Cecco", 0.12, "kg", 2),
                ("Vongole veraci", 0.25, "kg", 15),
                ("Aglio", 0.01, "kg", 5),
                ("Olio EVO Toscano", 0.02, "l", 0),
            ]
        },
        {
            "name": "Gamberi alla Griglia",
            "category": "secondi",
            "description": "Gamberi freschi grigliati con erbe aromatiche.",
            "price": 24.00,
            "ingredients": [
                ("Gamberi freschi", 0.2, "kg", 20),
                ("Olio EVO Toscano", 0.02, "l", 0),
                ("Aglio", 0.005, "kg", 5),
            ]
        },
        {
            "name": "Calamari Fritti",
            "category": "secondi",
            "description": "Calamari freschi fritti in pastella leggera.",
            "price": 18.00,
            "ingredients": [
                ("Calamari", 0.2, "kg", 10),
                ("Farina 00", 0.05, "kg", 0),
            ]
        },
        {
            "name": "Caprese",
            "category": "antipasti",
            "description": "Mozzarella di bufala con pomodori e basilico fresco.",
            "price": 12.00,
            "ingredients": [
                ("Mozzarella di Bufala", 0.125, "kg", 2),
                ("Pomodori San Marzano", 0.15, "kg", 5),
                ("Basilico fresco", 0.5, "bunch", 20),
                ("Olio EVO Toscano", 0.02, "l", 0),
            ]
        },
        {
            "name": "Tiramisù",
            "category": "dolci",
            "description": "Classico tiramisù con savoiardi artigianali.",
            "price": 8.00,
            "ingredients": [
                ("Ricotta fresca", 0.08, "kg", 1),
                ("Panna fresca", 0.05, "l", 0),
            ]
        },
    ]

    for data in recipes_data:
        recipe = Recipe(
            name=data["name"],
            category=data["category"],
            description=data.get("description"),
            price=data["price"],
            is_active=True,
            restaurant_id=restaurant_id,
        )
        db.add(recipe)
        db.flush()

        for ing_tuple in data["ingredients"]:
            ing_name, qty, unit = ing_tuple[0], ing_tuple[1], ing_tuple[2]
            waste_pct = ing_tuple[3] if len(ing_tuple) > 3 else 0
            if ing_name in products:
                ingredient = RecipeIngredient(
                    recipe_id=recipe.id,
                    product_id=products[ing_name].id,
                    quantity=qty,
                    unit=unit,
                    waste_pct=waste_pct
                )
                db.add(ingredient)

    db.commit()


def seed_orders(db: Session, restaurant_id: int):
    if db.query(Order).filter(Order.restaurant_id == restaurant_id).count() > 0:
        return

    recipes = db.query(Recipe).filter(Recipe.restaurant_id == restaurant_id).all()
    location = db.query(Location).filter(Location.restaurant_id == restaurant_id).first()

    if not recipes:
        return

    today = date.today()
    for i in range(30):
        order_date = today - timedelta(days=i)
        num_orders = random.randint(20, 50)

        for _ in range(num_orders):
            order = Order(
                location_id=location.id if location else None,
                date=order_date,
                total=0.0,
                restaurant_id=restaurant_id,
            )
            db.add(order)
            db.flush()

            num_items = random.randint(1, 4)
            total = 0.0
            for _ in range(num_items):
                recipe = random.choice(recipes)
                qty = random.randint(1, 3)
                item = OrderItem(
                    order_id=order.id,
                    recipe_id=recipe.id,
                    quantity=qty,
                    unit_price=recipe.price
                )
                total += qty * recipe.price
                db.add(item)

            order.total = total

    db.commit()


def seed_price_history(db: Session, restaurant_id: int):
    if db.query(PriceHistory).filter(PriceHistory.restaurant_id == restaurant_id).count() > 0:
        return

    products = db.query(Product).filter(Product.restaurant_id == restaurant_id).all()
    today = datetime.utcnow()

    for product in products:
        for month in range(6):
            recorded_at = today - timedelta(days=month * 30)
            variation = random.uniform(-0.1, 0.15)
            price = product.unit_price * (1 - variation * (month / 6))

            record = PriceHistory(
                product_id=product.id,
                price=round(price, 2),
                recorded_at=recorded_at,
                restaurant_id=restaurant_id,
            )
            db.add(record)

    db.commit()


if __name__ == "__main__":
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        seed_all(db)
        print("Seeding complete!")
    finally:
        db.close()
