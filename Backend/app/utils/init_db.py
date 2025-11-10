"""
Initialize database with default admin and user accounts
"""
from datetime import datetime
from app.config.database import get_admins_collection, get_users_collection
from app.utils.security import get_password_hash

def init_database():
    """Initialize database with default accounts"""
    admins_collection = get_admins_collection()
    users_collection = get_users_collection()
    
    # Check if admin already exists
    existing_admin = admins_collection.find_one({"email": "admin@ecomtracker.com"})
    if not existing_admin:
        # Create default admin
        admin_data = {
            "email": "admin@ecomtracker.com",
            "full_name": "Admin User",
            "password": get_password_hash("Admin@123"),
            "role": "admin",
            "created_at": datetime.utcnow()
        }
        result = admins_collection.insert_one(admin_data)
        print(f"✅ Created default admin account: admin@ecomtracker.com")
        print(f"   Admin ID: {result.inserted_id}")
    else:
        print("✅ Admin account already exists")
    
    # Check if test user already exists
    existing_user = users_collection.find_one({"email": "user@example.com"})
    if not existing_user:
        # Create default test user
        user_data = {
            "email": "user@example.com",
            "full_name": "Test User",
            "password": get_password_hash("User@123"),
            "role": "user",
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        result = users_collection.insert_one(user_data)
        print(f"✅ Created default user account: user@example.com")
        print(f"   User ID: {result.inserted_id}")
    else:
        print("✅ Test user account already exists")
    
    # Create indexes for better performance
    admins_collection.create_index("email", unique=True)
    users_collection.create_index("email", unique=True)
    print("✅ Database indexes created")

if __name__ == "__main__":
    print("Initializing database...")
    init_database()
    print("Database initialization complete!")
