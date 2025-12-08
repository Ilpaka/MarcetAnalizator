import { Bell, Settings, User } from 'lucide-react'

export default function Header() {
  return (
    <header className="h-16 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-6">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <div className="text-sm">
          <span className="text-gray-400">Статус рынка:</span>
          <span className="ml-2 text-profit font-medium">Открыт</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">BTC:</span>
          <span className="ml-2 font-medium">$43,250.50</span>
          <span className="ml-2 text-profit text-xs">+2.5%</span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-2 hover:bg-bg-elevated rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        {/* User */}
        <button className="flex items-center space-x-2 p-2 hover:bg-bg-elevated rounded-lg transition-colors">
          <User className="w-5 h-5" />
          <span className="text-sm font-medium">Трейдер</span>
        </button>
      </div>
    </header>
  )
}
