"""Seed default alert settings into MongoDB for the Ignite project.

Usage:
  - Ensure `MONGO_URI` and `MONGO_DB` are set in your environment, or pass the URI when prompted.
  - Run:
      python scripts/seed_alert_settings.py

This inserts/updates a document with _id='global' in the `alert_settings` collection.
"""
import os
from pymongo import MongoClient


def main():
    mongo_uri = os.environ.get('MONGO_URI')
    mongo_db = os.environ.get('MONGO_DB', 'ecom_tracker')
    if not mongo_uri:
        mongo_uri = input('Enter MONGO_URI (mongodb+srv://...): ').strip()
    if not mongo_uri:
        print('MONGO_URI required. Exiting.')
        return

    client = MongoClient(mongo_uri)
    db = client[mongo_db]

    default = {
        '_id': 'global',
        'enabled': True,
        'notify_channels': {'slack': True, 'email': False},
        'threshold_percent': 20.0,
        'threshold_absolute': 500.0,
        'min_price_for_alert': 100.0,
        'quiet_hours': None
    }

    res = db.alert_settings.update_one({'_id': 'global'}, {'$set': default}, upsert=True)
    print('Seeded alert_settings (upserted).')


if __name__ == '__main__':
    main()
