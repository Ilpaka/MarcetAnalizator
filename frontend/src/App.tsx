import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Trading from './pages/Trading'
import Analytics from './pages/Analytics'
import BotControl from './pages/BotControl'
import Sentiment from './pages/Sentiment'
import Backtest from './pages/Backtest'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trading" element={<Trading />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="bot" element={<BotControl />} />
          <Route path="sentiment" element={<Sentiment />} />
          <Route path="backtest" element={<Backtest />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
