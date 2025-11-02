# Admin Module Structure

This folder contains the refactored admin panel, split into modular, maintainable components.

## 📁 Folder Structure

```
admin/
├── Adminpanel.jsx              # Entry point (exports AdminDashboard)
├── AdminDashboard.jsx           # Main admin dashboard container
├── components/                  # Individual view components
│   ├── AdminSidebar.jsx        # Navigation sidebar
│   ├── DashboardView.jsx       # Dashboard/Alerts overview
│   ├── QAAssistantView.jsx     # Q&A Assistant (LLM simulation)
│   ├── PriceForecastView.jsx   # Price forecast visualization
│   ├── ProductsView.jsx        # Products inventory management
│   └── PlaceholderView.jsx     # Reusable placeholder for incomplete sections
├── data/                        # Mock/static data
│   └── mockData.js             # Products and alerts data
└── styles/                      # Shared styles
    └── adminStyles.js          # Centralized style definitions
```

## 🔧 Changes Made

### ✅ Removed
- **Duplicate Admin Login** - Login is now handled by the main `LoginPage.jsx` component
- **Inline styles chaos** - Moved to centralized `adminStyles.js`
- **Monolithic 765-line file** - Split into smaller, focused components

### ✅ Added
- **Modular component structure** - Each view is its own component
- **Centralized styles** - All styles in one place for easy maintenance
- **Separated data** - Mock data moved to its own file
- **Reusable components** - PlaceholderView can be used for any unfinished section

## 🎯 Component Responsibilities

### **AdminDashboard.jsx**
- Main container for the admin panel
- Handles view routing/switching
- Manages current view state
- Props: `onLogout`, `userName`

### **AdminSidebar.jsx**
- Navigation menu
- Active state management
- Logout button
- User display
- Props: `currentView`, `setCurrentView`, `onLogout`, `userName`

### **DashboardView.jsx**
- Alerts overview
- Recent activity feed
- Welcome message
- Props: `userName`

### **QAAssistantView.jsx**
- Q&A interface (LLM simulation)
- Query input and response display
- Loading states
- Props: None (self-contained)

### **PriceForecastView.jsx**
- Price prediction visualization
- Chart display
- ML model insights
- Props: None (self-contained)

### **ProductsView.jsx**
- Product inventory table
- Stock alerts
- Search functionality
- Edit/Delete actions
- Props: None (self-contained)

### **PlaceholderView.jsx**
- Generic placeholder for incomplete sections
- Props: `title`, `subtitle`

## 🔄 Usage

### Importing the Admin Panel
```javascript
import AdminPanel from './admin/Adminpanel';

// Use in your app
<AdminPanel onLogout={handleLogout} userName={user.name} />
```

### Adding a New View
1. Create a new component in `components/` folder
2. Import it in `AdminDashboard.jsx`
3. Add a new case in the `renderContent()` switch statement
4. Add navigation item in `AdminSidebar.jsx`

Example:
```javascript
// In AdminDashboard.jsx
import NewView from './components/NewView';

case 'NewView':
  return <NewView />;
```

## 📝 Notes

- **Authentication**: Login logic is handled externally in `pages/LoginPage.jsx`
- **Styles**: All shared styles are in `styles/adminStyles.js`
- **Data**: Mock data is in `data/mockData.js` - replace with API calls later
- **Responsive**: Views are responsive and mobile-friendly

## 🚀 Future Improvements

- [ ] Convert inline styles to CSS modules or styled-components
- [ ] Add real API integration
- [ ] Implement proper authentication flow
- [ ] Add loading skeletons
- [ ] Add error boundaries
- [ ] Implement proper routing with React Router
- [ ] Add unit tests for each component
