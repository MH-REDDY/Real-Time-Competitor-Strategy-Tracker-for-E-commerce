import os
from pymongo import MongoClient
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://teamignite:J8L7pSQ29w2mopPW@ecomtracker.sw0pckw.mongodb.net/")
DB_NAME = "ecom_tracker"
COLLECTION_NAME = "users"

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin@123"  # Change this to a secure password

def create_admin_user():
    try:
        # Initialize password hashing
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        users_collection = db[COLLECTION_NAME]
        
        # Check if admin already exists
        existing_admin = users_collection.find_one({"$or": [
            {"username": ADMIN_USERNAME},
            {"email": ADMIN_EMAIL},
            {"role": "admin"}
        ]})
        
        if existing_admin:
            print("Admin user already exists!")
            print(f"Username: {existing_admin.get('username')}")
            print(f"Email: {existing_admin.get('email')}")
            return
        
        # Create admin user
        admin_user = {
            "username": ADMIN_USERNAME,
            "email": ADMIN_EMAIL,
            "hashed_password": pwd_context.hash(ADMIN_PASSWORD),
            "full_name": "Administrator",
            "role": "admin",
            "disabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert admin user
        result = users_collection.insert_one(admin_user)
        print(f"Admin user created successfully! ID: {result.inserted_id}")
        print(f"Username: {ADMIN_USERNAME}")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD} (Please change this after first login)")
        
    except Exception as e:
        print(f"Error creating admin user: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    print("Creating admin user...")
    create_admin_user()
