import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './Dashboard.jsx'
import './Dashboard.css'
import { ERPProvider } from './context/ERPContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ERPProvider>
      <Dashboard />
    </ERPProvider>
  </React.StrictMode>,
)

