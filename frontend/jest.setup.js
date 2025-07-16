// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import React from 'react'

// MSW globals for Node.js environment
import { TextEncoder, TextDecoder } from 'util'
import 'whatwg-fetch'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock BroadcastChannel for MSW
global.BroadcastChannel = class BroadcastChannel {
  constructor(channel) {
    this.channel = channel
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

// Mock TransformStream for MSW
global.TransformStream = class TransformStream {
  constructor() {}
  readable = {}
  writable = {}
}

// Mock react-error-boundary
jest.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children }) => children,
  useErrorBoundary: () => ({ resetBoundary: jest.fn() }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: '',
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock next/navigation for App Router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock axios
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  }
  return mockAxios
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock MUI Date Pickers dependencies
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: class MockAdapterDateFns {
    constructor(options = {}) {
      this.locale = options.locale;
    }
    
    date = jest.fn();
    parse = jest.fn();
    format = jest.fn();
    isValid = jest.fn(() => true);
    isEqual = jest.fn(() => false);
    isSameDay = jest.fn(() => false);
    isSameMonth = jest.fn(() => false);
    isAfter = jest.fn(() => false);
    isBefore = jest.fn(() => false);
    startOfDay = jest.fn();
    endOfDay = jest.fn();
    addDays = jest.fn();
    addMonths = jest.fn();
    getYear = jest.fn(() => 2024);
    getMonth = jest.fn(() => 0);
    getDate = jest.fn(() => 1);
    toJsDate = jest.fn();
    formatByString = jest.fn();
    utils = this;
    lib = 'date-fns';
  }
}))

// Mock date-fns locale
jest.mock('date-fns/locale', () => ({
  ja: {},
}))

// Mock MUI Date Pickers components
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: jest.fn(({ label, slotProps, ...props }) => {
    const testId = slotProps?.textField?.['data-testid'] || 'date-picker';
    return React.createElement('input', {
      'data-testid': testId,
      placeholder: label,
      ...props
    });
  })
}))

// Mock LocalizationProvider
jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: jest.fn(({ children }) => children)
}))

jest.mock('@mui/x-date-pickers', () => ({
  DatePicker: jest.fn(({ label, slotProps, ...props }) => {
    const testId = slotProps?.textField?.['data-testid'] || 'date-picker';
    return React.createElement('input', {
      'data-testid': testId,
      placeholder: label,
      ...props
    });
  }),
  LocalizationProvider: jest.fn(({ children }) => children),
  DateCalendar: jest.fn((props) => 
    React.createElement('div', { 'data-testid': 'date-calendar' }, 'Mock DateCalendar')
  )
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock HTMLCanvasElement for charts
HTMLCanvasElement.prototype.getContext = jest.fn()

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: validateDOMNesting') ||
       args[0].includes('MUI:'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})