import { useState } from 'react';
import './App.css';

// Existing component imports (Retained for future use)
import View_details from './Users/View_details'; 
import User_Header from './Components/User_Header'; 

// --- FIXED ADMIN PANEL IMPORT ---
// NOTE: File extension is changed to .jsx to fix the JSX parsing error.
import AdminPanel from './Components/Adminpanel.jsx'; 

function App() {
  const [count, setCount] = useState(0); 
  // You can remove the useState hook if it's not used in this file later.

  return (
    <>
      {/* The User components are commented out below.
        Only the AdminPanel is rendered to show the design correctly.
      */}
      {/* <User_Header /> */}
      {/* <View_details /> */}

      {/* --- ADMIN PANEL IS RENDERED HERE --- */}
      <AdminPanel />
    </>
  );
}

export default App;
