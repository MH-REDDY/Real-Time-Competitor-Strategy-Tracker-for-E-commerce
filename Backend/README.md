# E-Commerce Tracker Backend

FastAPI backend for authentication and data management.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
   - Set your MongoDB connection string
   - Change the SECRET_KEY to a secure random string

3. Run the server:
```bash
python main.py
```

The server will start at http://localhost:8001

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Default Credentials

### Admin Account
- Email: admin@ecomtracker.com
- Password: Admin@123

### Test User Account
- Email: user@example.com
- Password: User@123

**Important:** Change these passwords in production!

## Endpoints

### Authentication
- POST `/auth/login` - Login for both admin and users
- POST `/auth/register` - Register new user account
- GET `/auth/me` - Get current user info (requires token)

### Admin Routes (requires admin token)
- GET `/admin/users` - Get all users
- DELETE `/admin/users/{user_id}` - Delete a user

## MongoDB Collections

- `admins` - Admin accounts (only 1 admin)
- `users` - User accounts
