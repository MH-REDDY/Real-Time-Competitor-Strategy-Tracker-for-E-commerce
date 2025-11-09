"""
Database configuration and connection
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
MONGO_DB = os.getenv('MONGO_DB', 'ecom_tracker')

# Create MongoDB client
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Collections
admins_collection = db['admins']
users_collection = db['users']
products_collection = db['products']
synthetic_data_collection = db['synthetic_data']

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
