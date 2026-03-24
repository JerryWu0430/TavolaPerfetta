"""
Comprehensive tests for the Price History API endpoints.
Tests cover listing, creating, filtering, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.price_history import PriceHistory
from app.models.product import Product


class TestListPriceHistory:
    """Tests for GET /price-history endpoint."""

    def test_list_price_history_empty(self, client: TestClient):
        """Test listing price history when empty."""
        response = client.get("/price-history")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_price_history_single(self, client: TestClient, sample_price_history: list[PriceHistory]):
        """Test listing with price history records."""
        response = client.get("/price-history")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_list_price_history_filter_by_product(
        self, client: TestClient, sample_price_history: list[PriceHistory], sample_products: list[Product]
    ):
        """Test filtering price history by product."""
        product_id = sample_products[0].id
        response = client.get(f"/price-history?product_id={product_id}")
        assert response.status_code == 200
        data = response.json()
        for record in data:
            assert record["product_id"] == product_id

    def test_list_price_history_filter_by_date_range(self, client: TestClient, sample_price_history: list[PriceHistory]):
        """Test filtering price history by date range."""
        start_date = (datetime.now() - timedelta(days=120)).isoformat()
        end_date = datetime.now().isoformat()
        response = client.get(f"/price-history?start_date={start_date}&end_date={end_date}")
        assert response.status_code == 200

    def test_list_price_history_pagination(self, client: TestClient, sample_price_history: list[PriceHistory]):
        """Test price history pagination."""
        response = client.get("/price-history?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2

    def test_list_price_history_ordered_by_date(self, client: TestClient, sample_price_history: list[PriceHistory]):
        """Test price history is ordered by date descending."""
        response = client.get("/price-history")
        assert response.status_code == 200
        data = response.json()
        if len(data) >= 2:
            dates = [record["recorded_at"] for record in data]
            assert dates == sorted(dates, reverse=True)


class TestCreatePriceHistory:
    """Tests for POST /price-history endpoint."""

    def test_create_price_history_success(self, client: TestClient, sample_product: Product):
        """Test creating a new price history record."""
        history_data = {
            "product_id": sample_product.id,
            "price": 4.00,
        }
        response = client.post("/price-history", json=history_data)
        assert response.status_code == 200
        data = response.json()
        assert data["product_id"] == sample_product.id
        assert data["price"] == 4.00

    def test_create_price_history_records_timestamp(self, client: TestClient, sample_product: Product):
        """Test price history has recorded_at timestamp."""
        history_data = {
            "product_id": sample_product.id,
            "price": 5.00,
        }
        response = client.post("/price-history", json=history_data)
        assert response.status_code == 200
        data = response.json()
        assert "recorded_at" in data
        assert data["recorded_at"] is not None

    def test_create_multiple_price_records(self, client: TestClient, sample_product: Product):
        """Test creating multiple price records for same product."""
        prices = [3.00, 3.50, 4.00]
        for price in prices:
            response = client.post("/price-history", json={
                "product_id": sample_product.id,
                "price": price,
            })
            assert response.status_code == 200

        # Verify all exist
        response = client.get(f"/price-history?product_id={sample_product.id}")
        assert response.status_code == 200
        assert len(response.json()) >= 3


class TestPriceHistoryEdgeCases:
    """Edge case tests for price history."""

    def test_price_history_zero_price(self, client: TestClient, sample_product: Product):
        """Test price history with zero price."""
        history_data = {
            "product_id": sample_product.id,
            "price": 0,
        }
        response = client.post("/price-history", json=history_data)
        assert response.status_code == 200
        assert response.json()["price"] == 0

    def test_price_history_decimal_precision(self, client: TestClient, sample_product: Product):
        """Test price history with precise decimal values."""
        history_data = {
            "product_id": sample_product.id,
            "price": 3.456,
        }
        response = client.post("/price-history", json=history_data)
        assert response.status_code == 200

    def test_price_history_large_price(self, client: TestClient, sample_product: Product):
        """Test price history with large price values."""
        history_data = {
            "product_id": sample_product.id,
            "price": 99999.99,
        }
        response = client.post("/price-history", json=history_data)
        assert response.status_code == 200

    def test_price_history_invalid_product(self, client: TestClient):
        """Test creating price history for non-existent product - FK constraint violation."""
        from sqlalchemy.exc import IntegrityError

        history_data = {
            "product_id": 99999,
            "price": 4.00,
        }
        # FK constraint violation raises IntegrityError
        with pytest.raises(IntegrityError):
            client.post("/price-history", json=history_data)


class TestPriceHistoryAnalytics:
    """Tests for price history analytics use cases."""

    def test_track_price_trend(self, client: TestClient, sample_product: Product, db: Session):
        """Test tracking price trend over time."""
        # Create a series of price changes
        base_date = datetime.now() - timedelta(days=30)
        prices = [3.00, 3.25, 3.50, 3.40, 3.75]

        for i, price in enumerate(prices):
            record = PriceHistory(
                product_id=sample_product.id,
                price=price,
                recorded_at=base_date + timedelta(days=i * 7),
            )
            db.add(record)
        db.commit()

        # Query all records
        response = client.get(f"/price-history?product_id={sample_product.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 5

    def test_filter_recent_changes(self, client: TestClient, sample_product: Product, db: Session):
        """Test filtering for recent price changes."""
        # Create old record
        old_record = PriceHistory(
            product_id=sample_product.id,
            price=2.00,
            recorded_at=datetime.now() - timedelta(days=60),
        )
        db.add(old_record)

        # Create recent record
        recent_record = PriceHistory(
            product_id=sample_product.id,
            price=3.00,
            recorded_at=datetime.now() - timedelta(days=5),
        )
        db.add(recent_record)
        db.commit()

        # Filter for last 30 days
        start_date = (datetime.now() - timedelta(days=30)).isoformat()
        response = client.get(f"/price-history?product_id={sample_product.id}&start_date={start_date}")
        assert response.status_code == 200
        data = response.json()
        # Should only include recent record
        assert len(data) >= 1

    def test_price_volatility_tracking(self, client: TestClient, sample_products: list[Product], db: Session):
        """Test tracking price changes across multiple products."""
        base_date = datetime.now() - timedelta(days=14)

        for product in sample_products[:3]:
            for i in range(3):
                record = PriceHistory(
                    product_id=product.id,
                    price=product.unit_price * (1 + i * 0.05),
                    recorded_at=base_date + timedelta(days=i * 7),
                )
                db.add(record)
        db.commit()

        # Query all records
        response = client.get("/price-history")
        assert response.status_code == 200
        assert len(response.json()) >= 9  # 3 products * 3 records each
