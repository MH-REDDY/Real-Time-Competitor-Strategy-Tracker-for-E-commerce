#!/usr/bin/env python3
"""
Simple notifier for alerts: Slack-only implementation.
Provides record_and_notify(alert_dict) which inserts into `alerts` collection
and posts a short message to Slack if `SLACK_WEBHOOK` is configured.

Note: deduplication and quiet-hours suppression have been intentionally
disabled for this small demo — every alert passed to `record_and_notify`
will be recorded and an attempt to notify Slack will be made.
"""
from datetime import datetime, timedelta
import os
import logging
import requests
from pymongo import MongoClient

logging.basicConfig(level=logging.INFO)

MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DB = os.environ.get("MONGO_DB", "ecom_tracker")
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK")
ALERT_DEDUPE_HOURS = int(os.environ.get("ALERT_DEDUPE_HOURS", "12"))

client = None
db = None
alerts_col = None
if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        alerts_col = db.get_collection('alerts')
    except Exception:
        logging.exception('Failed to initialize MongoDB client for notifier; continuing without DB')
else:
    logging.warning('MONGO_URI not set: notifier will run without DB persistence')


def send_slack(alert):
    if not SLACK_WEBHOOK:
        logging.warning('SLACK_WEBHOOK not configured; skipping Slack send')
        return False
    # Prefer the newer field names `current_price` / `scraped_price`, but
    # fall back to legacy `old_price` / `new_price` when present.
    current = alert.get('current_price') if alert.get('current_price') is not None else alert.get('old_price')
    scraped = alert.get('scraped_price') if alert.get('scraped_price') is not None else alert.get('new_price')
    try:
        pct = f" ({alert.get('percent_change',0):.1f}% )"
    except Exception:
        pct = ''
    text = (
        f"*Price Alert* • {alert.get('title','N/A')} ({alert.get('asin')})\n"
        f"Current: {current} → Scraped: {scraped}{pct}\n"
        f"{alert.get('url','') }"
    )
    payload = {"text": text}
    try:
        logging.info('Sending Slack notification (masked webhook)')
        # don't log the full webhook URL; log that one is configured and the payload summary
        logging.debug(f"Slack payload preview: {text[:240]}")
        r = requests.post(SLACK_WEBHOOK, json=payload, timeout=6)
        try:
            body = r.text
        except Exception:
            body = '<unreadable response>'
        if r.status_code >= 400:
            logging.warning(f"Slack webhook returned {r.status_code}: {body}")
            return False
        logging.info(f"Slack send OK (status={r.status_code})")
        logging.debug(f"Slack response body: {body}")
        return True
    except Exception:
        logging.exception('Failed to send Slack alert')
        return False


def record_and_notify(alert: dict):
    """
    Record the alert in the `alerts` collection and send Slack notification.
    For this simplified demo we DO NOT dedupe — every alert will be
    inserted and an attempt to notify Slack will be made.
    Returns True if inserted (and notified if Slack is configured).
    """
    now = datetime.utcnow()
    try:
        alert_doc = dict(alert)
        alert_doc.setdefault('triggered_at', now)
        alert_doc.setdefault('status', 'open')
        alert_doc.setdefault('notified_channels', [])

        res = None
        if alerts_col is not None:
            try:
                res = alerts_col.insert_one(alert_doc)
            except Exception:
                logging.exception('Failed to insert alert into DB; continuing')
        else:
            logging.info('alerts_col not available; skipping DB insert for alert')

        ok = send_slack(alert_doc)
        if ok:
            if alerts_col is not None and res is not None:
                try:
                    alerts_col.update_one({'_id': res.inserted_id}, {'$push': {'notified_channels': 'slack'}})
                except Exception:
                    logging.debug('Failed to mark notified_channels after send')
        return True
    except Exception:
        logging.exception('Failed to record and/or notify alert')
        return False
