import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Tabs, { useTabs, type TabItem } from '../tabs/Tabs'

describe('Tabs Component', () => {
  const mockTabs: TabItem[] = [
    {
      id: 'tab1',
      label: 'Tab 1',
      content: <div>Content 1</div>
    },
    {
      id: 'tab2',
      label: 'Tab 2',
      content: <div>Content 2</div>
    },
    {
      id: 'tab3',
      label: 'Tab 3',
      content: <div>Content 3</div>,
      disabled: true
    }
  ]

  it('should render all tabs', () => {
    render(<Tabs tabs={mockTabs} />)
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()
  })

  it('should show first tab content by default', () => {
    render(<Tabs tabs={mockTabs} />)
    
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument()
  })

  it('should show default tab content when specified', () => {
    render(<Tabs tabs={mockTabs} defaultTab="tab2" />)
    
    expect(screen.getByText('Content 2')).toBeInTheDocument()
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
  })

  it('should switch tabs when clicked', () => {
    render(<Tabs tabs={mockTabs} />)
    
    // Initially shows tab 1 content
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    
    // Click tab 2
    fireEvent.click(screen.getByText('Tab 2'))
    
    // Should now show tab 2 content
    expect(screen.getByText('Content 2')).toBeInTheDocument()
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
  })

  it('should not switch to disabled tabs', () => {
    render(<Tabs tabs={mockTabs} />)
    
    // Initially shows tab 1 content
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    
    // Click disabled tab 3
    fireEvent.click(screen.getByText('Tab 3'))
    
    // Should still show tab 1 content
    expect(screen.getByText('Content 1')).toBeInTheDocument()
    expect(screen.queryByText('Content 3')).not.toBeInTheDocument()
  })

  it('should call onTabChange callback', () => {
    const mockOnTabChange = jest.fn()
    render(<Tabs tabs={mockTabs} onTabChange={mockOnTabChange} />)
    
    fireEvent.click(screen.getByText('Tab 2'))
    
    expect(mockOnTabChange).toHaveBeenCalledWith('tab2')
  })

  it('should apply correct CSS classes for active tab', () => {
    render(<Tabs tabs={mockTabs} />)
    
    const activeTab = screen.getByText('Tab 1')
    const inactiveTab = screen.getByText('Tab 2')
    
    expect(activeTab).toHaveClass('border-blue-500', 'text-blue-600')
    expect(inactiveTab).toHaveClass('border-transparent', 'text-gray-500')
  })

  it('should apply correct CSS classes for disabled tab', () => {
    render(<Tabs tabs={mockTabs} />)
    
    const disabledTab = screen.getByText('Tab 3')
    
    expect(disabledTab).toHaveClass('text-gray-400', 'cursor-not-allowed')
    expect(disabledTab).toBeDisabled()
  })

  it('should show no content message when tab has no content', () => {
    const tabsWithoutContent: TabItem[] = [
      {
        id: 'empty',
        label: 'Empty Tab',
        content: null
      }
    ]
    
    render(<Tabs tabs={tabsWithoutContent} />)
    
    expect(screen.getByText('No content available for this tab')).toBeInTheDocument()
  })

  it('should handle empty tabs array', () => {
    render(<Tabs tabs={[]} />)
    
    expect(screen.getByText('No content available for this tab')).toBeInTheDocument()
  })
})

describe('useTabs Hook', () => {
  const TestComponent = ({ initialTab }: { initialTab?: string }) => {
    const { activeTab, setActiveTab, isActive } = useTabs(initialTab)
    
    return (
      <div>
        <div data-testid="active-tab">{activeTab}</div>
        <button onClick={() => setActiveTab('tab1')}>Set Tab 1</button>
        <button onClick={() => setActiveTab('tab2')}>Set Tab 2</button>
        <div data-testid="is-tab1-active">{isActive('tab1').toString()}</div>
        <div data-testid="is-tab2-active">{isActive('tab2').toString()}</div>
      </div>
    )
  }

  it('should initialize with empty string by default', () => {
    render(<TestComponent />)
    
    expect(screen.getByTestId('active-tab')).toHaveTextContent('')
  })

  it('should initialize with provided initial tab', () => {
    render(<TestComponent initialTab="tab1" />)
    
    expect(screen.getByTestId('active-tab')).toHaveTextContent('tab1')
  })

  it('should update active tab when setActiveTab is called', () => {
    render(<TestComponent />)
    
    fireEvent.click(screen.getByText('Set Tab 1'))
    expect(screen.getByTestId('active-tab')).toHaveTextContent('tab1')
    
    fireEvent.click(screen.getByText('Set Tab 2'))
    expect(screen.getByTestId('active-tab')).toHaveTextContent('tab2')
  })

  it('should correctly identify active tab', () => {
    render(<TestComponent initialTab="tab1" />)
    
    expect(screen.getByTestId('is-tab1-active')).toHaveTextContent('true')
    expect(screen.getByTestId('is-tab2-active')).toHaveTextContent('false')
    
    fireEvent.click(screen.getByText('Set Tab 2'))
    
    expect(screen.getByTestId('is-tab1-active')).toHaveTextContent('false')
    expect(screen.getByTestId('is-tab2-active')).toHaveTextContent('true')
  })
})
