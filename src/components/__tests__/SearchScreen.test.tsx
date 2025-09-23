import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchScreen from '../SearchScreen'
import { Stock } from '@/lib/api'

// Mock the API module
jest.mock('@/lib/api', () => ({
  searchStocks: jest.fn(),
}))

import * as apiModule from '@/lib/api'
const mockSearchStocks = apiModule.searchStocks as jest.MockedFunction<typeof apiModule.searchStocks>

const mockStock: Stock = {
  symbol: 'RELIANCE',
  name: 'Reliance Industries Ltd',
  ltp: 2456.75,
  change: 15.25,
  changePercent: 0.63,
  exchange: 'NSE',
  marketCap: 1658000,
  volume: 45000000
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const renderWithQueryClient = (component: React.ReactElement) => {
  const testQueryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('SearchScreen', () => {
  const mockOnBack = jest.fn()
  const mockOnStockSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render search input and back button', () => {
    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    expect(screen.getByPlaceholderText('Search stocks by name or symbol...')).toBeInTheDocument()
    expect(screen.getByLabelText('Go back')).toBeInTheDocument()
    expect(screen.getByText('Search NSE/BSE Stocks')).toBeInTheDocument()
  })

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    const backButton = screen.getByLabelText('Go back')
    await user.click(backButton)

    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('should show search tips when no query is entered', () => {
    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    expect(screen.getByText('Search Tips:')).toBeInTheDocument()
    expect(screen.getByText('• Try "Reliance" or "RELIANCE"')).toBeInTheDocument()
  })

  it('should show typing indicator for queries less than 2 characters', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search stocks by name or symbol...')
    await user.type(searchInput, 'R')

    expect(screen.getByText('Type at least 2 characters to search...')).toBeInTheDocument()
  })

  it('should search and display results', async () => {
    const user = userEvent.setup()
    mockSearchStocks.mockResolvedValue([mockStock])

    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search stocks by name or symbol...')
    await user.type(searchInput, 'Reliance')

    await waitFor(() => {
      expect(screen.getByText('Reliance Industries Ltd')).toBeInTheDocument()
    })

    expect(screen.getByText('NSE:RELIANCE')).toBeInTheDocument()
    expect(screen.getByText('₹2,456.75')).toBeInTheDocument()
  })

  it('should call onStockSelect when a stock is clicked', async () => {
    const user = userEvent.setup()
    mockSearchStocks.mockResolvedValue([mockStock])

    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search stocks by name or symbol...')
    await user.type(searchInput, 'Reliance')

    await waitFor(() => {
      expect(screen.getByText('Reliance Industries Ltd')).toBeInTheDocument()
    })

    const stockButton = screen.getByText('Reliance Industries Ltd').closest('button')
    expect(stockButton).toBeInTheDocument()
    
    if (stockButton) {
      await user.click(stockButton)
      expect(mockOnStockSelect).toHaveBeenCalledWith(mockStock)
    }
  })

  it('should show no results message when search returns empty', async () => {
    const user = userEvent.setup()
    mockSearchStocks.mockResolvedValue([])

    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search stocks by name or symbol...')
    await user.type(searchInput, 'NonExistentStock')

    await waitFor(() => {
      expect(screen.getByText('No Results Found')).toBeInTheDocument()
    })

    expect(screen.getByText('No stocks found for "NonExistentStock"')).toBeInTheDocument()
  })

  it('should show error message when search fails', async () => {
    const user = userEvent.setup()
    mockSearchStocks.mockRejectedValue(new Error('Network error'))

    renderWithQueryClient(
      <SearchScreen onBack={mockOnBack} onStockSelect={mockOnStockSelect} />
    )

    const searchInput = screen.getByPlaceholderText('Search stocks by name or symbol...')
    await user.type(searchInput, 'ERRORTEST')

    // Wait for debounce and error state
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
