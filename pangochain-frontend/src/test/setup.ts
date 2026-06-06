import '@testing-library/jest-dom'
import { webcrypto } from 'node:crypto'

// jsdom 26 exposes window.crypto but not window.crypto.subtle.
// Polyfill with Node 18's built-in Web Crypto so SubtleCrypto calls work in tests.
if (!window.crypto.subtle) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  })
}
