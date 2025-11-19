#!/usr/bin/env python3
"""
Entrypoint for running the Amazon scraper. Intended for CI/scheduler runs.
"""
from dotenv import load_dotenv
import os
import sys

# Load env from .env if present (useful for local testing)
load_dotenv()

# When CI/Actions runs `python amazon_scraper/entrypoint.py` the interpreter
# sets sys.path[0] to the `amazon_scraper` folder which prevents resolving
# `amazon_scraper` as a package. Add the repo root (parent directory) to
# sys.path so package imports like `from amazon_scraper.notify import ...`
# succeed whether the module is executed as `-m` or as a script path.
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
except Exception:
    # Best-effort; if this fails we'll fall back to the original import and
    # let the error surface to the CI logs for diagnosis.
    pass

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
