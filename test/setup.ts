import "@testing-library/jest-dom";

// Polyfill ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  constructor() {
    // Do nothing
  }
  observe() {
    // Do nothing
  }
  unobserve() {
    // Do nothing
  }
  disconnect() {
    // Do nothing
  }
};
