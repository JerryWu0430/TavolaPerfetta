#!/usr/bin/env python3
"""Run database seeding"""
from app.database import SessionLocal
from app.services.seed import seed_all

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_all(db)
        print("✓ Database seeded successfully!")
    finally:
        db.close()
