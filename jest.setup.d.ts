// ABOUTME: Type declarations to enable Jest globals in TypeScript test files
// ABOUTME: Adds reference to @types/jest so `jest`, `describe`, `it`, etc. are recognized

/// <reference types="jest" />

// Extend Jest matchers from Testing Library
import "@testing-library/jest-dom";

// Ensure TypeScript is aware of extended jest-dom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}
