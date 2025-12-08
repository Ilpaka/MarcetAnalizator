export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Overview of your trading performance and market conditions
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-gray-400 text-sm mb-1">Total Balance</div>
          <div className="text-2xl font-bold">$10,000.00</div>
          <div className="text-profit text-sm mt-1">+5.2%</div>
        </div>

        <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-gray-400 text-sm mb-1">Open Positions</div>
          <div className="text-2xl font-bold">3</div>
          <div className="text-gray-400 text-sm mt-1">2 winning</div>
        </div>

        <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-gray-400 text-sm mb-1">Today's P&L</div>
          <div className="text-2xl font-bold text-profit">+$250.50</div>
          <div className="text-profit text-sm mt-1">+2.5%</div>
        </div>

        <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
          <div className="text-gray-400 text-sm mb-1">Win Rate</div>
          <div className="text-2xl font-bold">68%</div>
          <div className="text-gray-400 text-sm mt-1">Last 30 days</div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
        <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
        <div className="h-96 flex items-center justify-center text-gray-500">
          Chart will be rendered here
        </div>
      </div>

      {/* Recent trades */}
      <div className="bg-bg-secondary p-6 rounded-lg border border-border-primary">
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg"
            >
              <div>
                <div className="font-medium">BTC/USDT</div>
                <div className="text-sm text-gray-400">5 minutes ago</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-profit">+$45.20</div>
                <div className="text-sm text-gray-400">+1.2%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
