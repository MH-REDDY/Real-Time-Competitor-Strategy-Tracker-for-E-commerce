from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

def check_admin_user():
    try:
        # Connect to MongoDB
        MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://teamignite:J8L7pSQ29w2mopPW@ecomtracker.sw0pckw.mongodb.net/")
        client = MongoClient(MONGO_URI)
        db = client['ecom_tracker']
        
        # Check admin collection
        if 'admin' not in db.list_collection_names():
            print("Admin collection does not exist!")
            return
        
        admins = db['admin']
        admin_user = admins.find_one({"username": "Siri_26"})
        
        if admin_user:
            print("Admin user found:")
            print(f"Username: {admin_user['username']}")
            print(f"Password: {admin_user['password']}")
            print(f"Role: {admin_user.get('role', 'not set')}")
            print(f"Active: {admin_user.get('is_active', False)}")
        else:
            print("Admin user not found!")
            
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    print("Checking admin user...")
    check_admin_user()
