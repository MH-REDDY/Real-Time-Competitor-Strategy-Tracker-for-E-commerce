#!/usr/bin/env python3
"""
Entrypoint for running the Amazon scraper. Intended for CI/scheduler runs.
"""
from dotenv import load_dotenv
import os
import sys

# Load env from .env if present (useful for local testing)
load_dotenv()

# Import the scraper runner
try:
    from amazon_price_scraper import run_scraper
except Exception as e:
    print(f"Failed to import scraper: {e}")
    raise


if __name__ == '__main__':
    result = run_scraper()
    status = result.get('status') if isinstance(result, dict) else None
    if status in ('ok', 'locked'):
        # ok or locked (another run) are not errors for a scheduled job
        sys.exit(0)
    else:
        # any other status indicates failure
        sys.exit(1)
