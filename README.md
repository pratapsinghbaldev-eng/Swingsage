# SwingSage - NSE/BSE Stock Analysis Platform

A modern, AI-powered stock analysis application for NSE and BSE markets, built with Next.js 14+ and TypeScript.

## 🚀 Features

### ✅ **Week 1-2 (Completed)**
- **Splash Screen**: Clean branded splash screen with auto-navigation
- **Home Dashboard**: Live market indices (Nifty 50, Bank Nifty, Midcap, Smallcap)
- **Stock Search**: Debounced search with real-time results
- **Navigation**: Seamless flow between screens

### ✅ **Week 3 (Completed)**
- **Interactive Charts**: Price charts with multiple timeframes (1D, 1W, 1M, 3M, 1Y)
- **Fundamentals Analysis**: Market cap, P/E ratio, EPS, 52-week high/low, sector info
- **Technical Indicators**: RSI(14), SMA(20), EMA(50), MA crossover signals
- **Tabbed Interface**: Overview, Chart, Fundamentals, Technicals tabs

### 🔮 **Coming Soon (Week 4+)**
- Advanced charting with TradingView integration
- AI-powered stock insights and recommendations
- Watchlists and portfolio tracking
- Alerts and screeners
- Backtesting capabilities

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui, Lucide React icons
- **Charts**: Recharts for lightweight, responsive charts
- **State Management**: TanStack React Query for server state
- **Testing**: Jest, React Testing Library
- **API**: Next.js API routes with mock data system

## 📊 Data Sources

### Current (Mock Data)
- Realistic mock data for development and testing
- Configurable via `NEXT_PUBLIC_ENABLE_MOCK_DATA` environment variable
- Simulates live market conditions with price variations

### Live Data Providers
The app supports multiple data providers with automatic fallback:

1. **RapidAPI NSE** (Premium) - Primary paid provider for NSE data
2. **Yahoo Finance** (Free) - Primary free provider, used as default
3. **Alpha Vantage** (Free with rate limits) - Secondary provider for quotes, charts, and fundamentals

### Provider Configuration
- **Default Order**: RapidAPI → Yahoo Finance → Alpha Vantage
- **Primary Provider**: Use `NEXT_PUBLIC_PRIMARY_PROVIDER=alpha` to make Alpha Vantage primary
- **Automatic Fallback**: If primary provider fails, automatically tries other providers
- **Rate Limit Handling**: Alpha Vantage rate limits are handled gracefully with fallback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd swingsage-app

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Alternative Port
If port 3000 is busy:
```bash
npm run dev -- -p 3001
```

## 🔧 Environment Variables

Create a `.env.local` file in the root directory (copy from `.env.local.example`):

```bash
# Mock Data Configuration
NEXT_PUBLIC_ENABLE_MOCK_DATA=true

# API Configuration (for production)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Primary Data Provider (optional)
# Set to 'alpha' to use Alpha Vantage as primary provider, 'yahoo' as fallback
# Leave empty or set to 'yahoo' for default behavior (Yahoo primary, Alpha Vantage fallback)
# NEXT_PUBLIC_PRIMARY_PROVIDER=yahoo

# RapidAPI Configuration (optional)
# RAPIDAPI_KEY=your_rapidapi_key_here
# RAPIDAPI_HOST=indian-stock-exchange-api.p.rapidapi.com

# Yahoo Finance (fallback)
YAHOO_FINANCE_BASE_URL=https://query1.finance.yahoo.com

# Alpha Vantage (optional; free tier with rate limits)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co

# Unofficial NSE (optional; use cautiously)
# NSE_UNOFFICIAL_BASE_URL=https://www.nseindia.com/api
```

## 📱 Usage

### Navigation Flow
1. **Splash Screen** → Auto-navigates after 3 seconds
2. **Home Dashboard** → View market indices, click search icon
3. **Search Screen** → Type stock name/symbol, select from results
4. **Stock Detail** → Tabbed interface with comprehensive analysis

### Stock Detail Tabs

#### 📊 **Overview Tab**
- Current stock price with change indicators
- Quick stats: Market cap, volume, exchange
- Clean, focused layout

#### 📈 **Chart Tab**
- Interactive price charts with Recharts
- Timeframe selector: 1D (area chart), 1W/1M/3M/1Y (line charts)
- Responsive design with tooltips and axis labels

#### 📋 **Fundamentals Tab**
- Market capitalization in crores
- P/E ratio, EPS, dividend yield
- 52-week high/low ranges
- Sector and industry classification
- Loading states and error handling

#### 🔬 **Technicals Tab**
- RSI(14) with overbought/oversold interpretation
- SMA(20) and EMA(50) values
- Moving average crossover signals
- Color-coded bullish/bearish indicators
- Educational disclaimer

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Unit Tests**: Technical indicators, API utilities
- **Component Tests**: Charts, tabs, search functionality
- **Integration Tests**: Data fetching and state management

### Test Files
- `src/lib/__tests__/indicators.test.ts` - Technical indicators
- `src/lib/__tests__/api.test.ts` - API utilities
- `src/components/__tests__/StockChart.test.tsx` - Chart component
- `src/components/__tests__/Tabs.test.tsx` - Tabs component
- `src/components/__tests__/SearchScreen.test.tsx` - Search functionality

## 🏗️ Architecture

### Component Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main app component
├── components/
│   ├── charts/            # Chart components
│   ├── tabs/              # Tab components
│   ├── ui/                # Reusable UI components
│   └── [screens]/         # Screen components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and API
└── providers/             # React Query provider
```

### Data Flow
```
UI Components → Custom Hooks → API Layer → Mock/Real Data
     ↓              ↓            ↓
React Query ← Caching ← Route Handlers
```

## 🔧 Development

### Adding New Features

1. **Create Components**: Follow existing patterns in `src/components/`
2. **Add Hooks**: Custom hooks in `src/hooks/` for data fetching
3. **Update API**: Add new endpoints in `src/lib/api.ts` and `src/app/api/`
4. **Write Tests**: Comprehensive test coverage required
5. **Update Documentation**: Keep README and inline docs current

### Mock Data System

The app uses a sophisticated mock data system:
- Realistic stock prices with variations
- Time-series data generation for charts
- Configurable via environment variables
- Easy transition to real APIs

### API Integration

When ready for real data:
1. Set `NEXT_PUBLIC_ENABLE_MOCK_DATA=false`
2. Add API keys to environment variables
3. Implement real API calls in route handlers
4. Test thoroughly with rate limiting

## 🚨 Troubleshooting

### Common Issues

**Port 3000 in use**
```bash
npm run dev -- -p 3001
```

**Tests failing**
```bash
npm test -- --watchAll=false --verbose
```

**Build errors**
```bash
npm run build
# Check TypeScript errors and fix
```

**Mock data not loading**
- Check `NEXT_PUBLIC_ENABLE_MOCK_DATA=true` in `.env.local`
- Restart development server after env changes

## 📈 Performance

- **React Query**: Intelligent caching and background updates
- **Debounced Search**: 500ms delay to reduce API calls
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Use `npm run analyze` (when configured)

## 🔒 Security

- **API Keys**: Server-side only, never exposed to client
- **Input Validation**: All user inputs sanitized
- **Rate Limiting**: Planned for API routes
- **HTTPS**: Required for production deployment

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Docker
```dockerfile
# Dockerfile provided in repository
docker build -t swingsage .
docker run -p 3000:3000 swingsage
```

### Environment Setup
- Set production environment variables
- Configure API keys securely
- Enable real data sources
- Set up monitoring and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Write comprehensive tests
- Use conventional commit messages
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and ideas
- **Documentation**: In-code documentation and this README

---

**Built with ❤️ for Indian stock market enthusiasts**

*Disclaimer: This application is for educational and informational purposes only. Not intended as financial advice. Always consult with qualified financial advisors before making investment decisions.*

## 🔌 Real Data Setup (NSE/BSE)

By default, the app runs with mock data. To enable live data:

### 1) Get API Keys
- **Alpha Vantage**: Sign up at [alphavantage.co](https://www.alphavantage.co/support/#api-key) (free tier: 25 requests/day, 5 requests/minute)
- **RapidAPI**: Optional premium provider for enhanced NSE data

### 2) Configure Environment
Create `.env.local` in `swingsage-app/` with:

```bash
# Enable real data
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Primary provider selection (optional)
# Set to 'alpha' to use Alpha Vantage as primary, 'yahoo' as fallback
NEXT_PUBLIC_PRIMARY_PROVIDER=yahoo

# Yahoo Finance (free; used for intraday and fallback)
YAHOO_FINANCE_BASE_URL=https://query1.finance.yahoo.com

# Alpha Vantage (free tier with rate limits)
ALPHA_VANTAGE_API_KEY=your_actual_alpha_vantage_key
ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co

# RapidAPI NSE (optional; paid)
# RAPIDAPI_KEY=your_rapidapi_key
# RAPIDAPI_HOST=latest-stock-price.p.rapidapi.com

# Unofficial NSE (optional; use cautiously)
# NSE_UNOFFICIAL_BASE_URL=https://www.nseindia.com/api
```

### 3) Restart and Test
```bash
npm run dev
```

### 4) Provider Behavior
- **Default Order**: RapidAPI → Yahoo Finance → Alpha Vantage
- **Alpha as Primary**: Set `NEXT_PUBLIC_PRIMARY_PROVIDER=alpha` to prioritize Alpha Vantage
- **Automatic Fallback**: If primary fails, tries other providers automatically
- **Rate Limit Handling**: Alpha Vantage rate limits trigger graceful fallback

### 5) Supported Symbols
- **NSE Stocks**: Use symbols like `RELIANCE`, `TCS`, `INFY` (app adds `.NS` suffix automatically)
- **BSE Stocks**: Use symbols like `RELIANCE.BSE`, `TCS.BSE` for BSE exchange
- **Search**: Try symbols like RELIANCE, TCS, HDFCBANK

### 6) Notes
- Alpha Vantage free tier: 25 requests/day, 5 requests/minute
- Use React Query caching to minimize API calls
- Keep API keys server-side only (never use `NEXT_PUBLIC_` prefix)
- Fundamentals data requires Alpha Vantage API key

## 🧪 Verifying Live Data

- Search: try symbols like RELIANCE, TCS, HDFCBANK
- Open detail screen → Chart tab switches timeframes with real series
- Overview price and change reflect live fetch