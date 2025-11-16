"""
Database configuration and connection
"""
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

MONGO_URI = os.getenv('MONGO_URI')
MONGO_DB = os.getenv('MONGO_DB', 'ecom_tracker')

# Try to connect to MongoDB with fallback
client = None
db = None

try:
    # Try Atlas connection first
    if MONGO_URI and MONGO_URI.startswith('mongodb+srv'):
        logger.info("Attempting to connect to MongoDB Atlas...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test the connection
        client.admin.command('ping')
        db = client[MONGO_DB]
        logger.info("Successfully connected to MongoDB Atlas")
except (ConnectionFailure, ServerSelectionTimeoutError) as e:
    logger.warning(f"MongoDB Atlas connection failed: {e}")
    logger.info("Falling back to local MongoDB...")
    try:
        # Try local MongoDB
        client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[MONGO_DB]
        logger.info("Successfully connected to local MongoDB")
    except Exception as e2:
        logger.error(f"Local MongoDB connection also failed: {e2}")
        logger.warning("Running without database - some features will be disabled")
        client = None
        db = None

# Collections (will be None if no database connection)
admins_collection = db['admin'] if db is not None else None
users_collection = db['user'] if db is not None else None
products_collection = db['products'] if db is not None else None
synthetic_data_collection = db['synthetic_data'] if db is not None else None

def get_database():
    """Get database instance"""
    return db

def get_admins_collection():
    """Get admins collection"""
    return admins_collection

def get_users_collection():
    """Get users collection"""
    return users_collection

def get_products_collection():
    """Get products collection"""
    return products_collection
