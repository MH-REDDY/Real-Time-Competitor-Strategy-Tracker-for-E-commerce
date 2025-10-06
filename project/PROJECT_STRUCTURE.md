# Ignite E-Commerce Project Structure

## Overview
Ignite is a modern e-commerce website for audio equipment including headphones, speakers, and earphones.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Header.jsx      # Navigation header
│   ├── Header.css
│   ├── Footer.jsx      # Footer component
│   ├── Footer.css
│   ├── ProductCard.jsx # Product display card
│   └── ProductCard.css
│
├── pages/              # Page components
│   ├── GuestHomePage.jsx    # Landing page for guests
│   ├── GuestHomePage.css
│   ├── HomePage.jsx         # Home page for logged-in users
│   ├── HomePage.css
│   ├── LoginPage.jsx        # Login/Signup page
│   ├── LoginPage.css
│   ├── BrowseEventsPage.jsx # Product browsing page
│   ├── BrowseEventsPage.css
│   ├── ProductDetailPage.jsx # Individual product page
│   ├── ProductDetailPage.css
│   ├── CartPage.jsx         # Shopping cart
│   └── CartPage.css
│
├── context/            # React Context for state management
│   ├── AuthContext.jsx # Authentication state
│   └── CartContext.jsx # Shopping cart state
│
├── data/               # Static data
│   └── products.js     # Product catalog
│
├── utils/              # Utility functions
│   └── placeholderImages.js # SVG placeholder images
│
├── App.jsx             # Main app component with routing
├── main.tsx            # Application entry point
└── index.css           # Global styles

public/
└── images/             # Image assets directory
    ├── products/
    ├── banners/
    └── logo/
```

## Features

### Authentication
- User and Admin login toggle
- User signup with terms acceptance
- Admin login (no signup)
- Protected routes for authenticated users

### Guest Experience
- View featured products
- See promotional banners
- Redirected to login when trying to access products

### User Experience
- Browse all products
- Filter by category (Headphones, Speakers, Earphones)
- Search products by name or brand
- View detailed product information
- Add products to cart with quantity selection
- View and manage shopping cart
- Proceed to checkout

### Product Details
- Image slideshow
- Product specifications
- Features list
- Benefits (Free delivery, 2-day shipping, etc.)
- Add to cart or Buy now options

### Shopping Cart
- View all cart items
- Update quantities
- Remove items
- See total price with tax
- Proceed to payment (dummy button)

## Routes

- `/` - Guest homepage (if not logged in) or User homepage (if logged in)
- `/login` - Login/Signup page
- `/browse-events` - Product browsing page (protected)
- `/product/:id` - Product detail page (protected)
- `/cart` - Shopping cart (protected)

## Technology Stack

- React 18
- React Router DOM for routing
- Context API for state management
- Lucide React for icons
- Tailwind CSS for styling
- Vite for build tooling

## Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Notes

- All images use SVG placeholders stored in `src/utils/placeholderImages.js`
- No backend or database integration (frontend only)
- Authentication is simulated with context state
- Cart data is stored in memory (not persisted)
