import { useState } from 'react'
import './App.css'
import View_details from './Users/View_details'
import User_Header from './Components/User_Header'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <User_Header />
      <View_details />
    </>
  )
}

export default App
