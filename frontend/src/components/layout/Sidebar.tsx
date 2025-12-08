import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Bot,
  Heart,
  FlaskConical,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Панель управления' },
  { to: '/trading', icon: TrendingUp, label: 'Торговля' },
  { to: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { to: '/bot', icon: Bot, label: 'Управление ботом' },
  { to: '/sentiment', icon: Heart, label: 'Настроения' },
  { to: '/backtest', icon: FlaskConical, label: 'Бэктест' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-bg-secondary border-r border-border-primary flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border-primary">
        <Bot className="w-8 h-8 text-primary-500 mr-3" />
        <h1 className="text-xl font-bold">Крипто Бот</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-bg-elevated hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-primary">
        <div className="text-xs text-gray-500 text-center">
          v1.0.0 • ML Торговый Бот
        </div>
      </div>
    </aside>
  )
}
