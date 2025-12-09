import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Bot,
  Heart,
  FlaskConical,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Панель управления' },
  { to: '/portfolio', icon: Wallet, label: 'Портфель' },
  { to: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { to: '/bot', icon: Bot, label: 'Управление ботом' },
  { to: '/sentiment', icon: Heart, label: 'Настроения' },
  { to: '/backtest', icon: FlaskConical, label: 'Тестирование предсказаний' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-bg-secondary border-r border-border-primary flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border-primary flex-shrink-0">
        <Bot className="w-6 h-6 text-primary-500 mr-2 flex-shrink-0" />
        <h1 className="text-base font-bold truncate">Крипто Бот</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-bg-elevated hover:text-white'
              }`
            }
            tabIndex={0}
            aria-label={item.label}
          >
            <item.icon className="w-4 h-4 mr-2.5 flex-shrink-0" />
            <span className="font-medium truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border-primary flex-shrink-0">
        <div className="text-[10px] text-gray-500 text-center">
          v1.0.0 • ML Торговый Бот
        </div>
      </div>
    </aside>
  )
}
