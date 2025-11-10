from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def add_admin_user():
    try:
        # Connect to MongoDB
        MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://teamignite:J8L7pSQ29w2mopPW@ecomtracker.sw0pckw.mongodb.net/")
        client = MongoClient(MONGO_URI)
        db = client['ecom_tracker']
        
        # Create admin collection if it doesn't exist
        if 'admin' not in db.list_collection_names():
            db.create_collection('admin')
        
        admins = db['admin']
        
        # Check if admin already exists
        if admins.count_documents({"username": "Siri_26"}) == 0:
            # Add admin user (in production, make sure to hash the password)
            admin_data = {
                "username": "Siri_26",
                "password": "987654321",  # In production, store hashed password
                "email": "admin@example.com",
                "role": "admin",
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            admins.insert_one(admin_data)
            print("Admin user created successfully!")
            print(f"Username: {admin_data['username']}")
            print(f"Password: {admin_data['password']} (Please change this after first login)")
        else:
            print("Admin user already exists!")
            
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    print("Adding admin user...")
    add_admin_user()
