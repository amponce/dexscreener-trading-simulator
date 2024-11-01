# Solana Trading Simulator

A real-time trading simulator for Solana tokens that allows users to practice trading strategies without risking real funds. The simulator uses live price data from DexScreener to provide a realistic trading experience.

![Trading Simulator Screenshot]

## Features

### Real-Time Trading

- Close to Live price updates from DexScreener API
- Support for any Solana token (via token address)
- Real-time profit/loss tracking
- Price movement indicators
- Visual price charts (in progress)

### Portfolio Management

- $1,000 starting balance for practice
- Track holdings across multiple tokens
- Real-time portfolio value updates
- Profit/Loss calculations per position
- Overall portfolio performance tracking

### Trading Features

- Quick trade buttons ($100, $250) more to come soon
- Buy/Sell with real-time price execution
- Position size tracking
- Trade history logging
- Market statistics display

### Market Data

- Token price and 24h price change
- Trading volume information
- Market cap display
- Liquidity information
- Last update timestamps

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/solana-trading-simulator.git
cd solana-trading-simulator
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Project Structure

```
├── app/
│   └── page.tsx          # Main trading simulator page
├── components/
│   ├── trading-card.tsx  # Individual token trading card
│   └── trade-history.tsx # Trade history component
├── services/
│   └── dexscreener-service.ts # DexScreener API integration
├── hooks/
│   └── use-token-data.ts # Token data fetching hook
└── lib/
    └── utils.ts          # Utility functions
```

## Usage

1. Enter a Solana token address in the input field

   - Example tokens:
   - JUP (Jupiter): `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`
   - BONK: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`

2. Click "Add Token" to start tracking the token

3. Use the Buy/Sell buttons to execute trades:

   - $100 increments
   - $250 increments
   - Real-time price execution

4. Monitor your positions:
   - Current holdings
   - Position value
   - Profit/Loss
   - Overall portfolio performance

## Technical Details

### Built With

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- DexScreener API
- Recharts for charts

### API Integration

- Real-time price updates every 3 seconds
- Rate limiting (300 requests/minute)
- Efficient batch updates
- WebSocket-like updates

### State Management

- React hooks for local state
- Real-time price subscriptions
- Efficient update batching
- Memory leak prevention

## Rate Limits

- DexScreener API: 300 requests per minute
- Price updates: Every 3 seconds per token
- Maximum tokens: 6 per session

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE.md file for details

## Acknowledgments

- DexScreener for providing the API
- shadcn/ui for the component library
- Recharts for the charting library

## Coming Soon

- Trade execution animations
- Price alerts
- Stop-loss/take-profit orders
- Trading strategy templates
- Position sizing calculator
- Performance analytics
