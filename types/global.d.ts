/// <reference types="jest" />

declare global {
  // Jest globals
  const jest: typeof import('@jest/globals').jest;
  const describe: typeof import('@jest/globals').describe;
  const it: typeof import('@jest/globals').it;
  const test: typeof import('@jest/globals').test;
  const expect: typeof import('@jest/globals').expect;
  const beforeEach: typeof import('@jest/globals').beforeEach;
  const afterEach: typeof import('@jest/globals').afterEach;
  const beforeAll: typeof import('@jest/globals').beforeAll;
  const afterAll: typeof import('@jest/globals').afterAll;

  // Custom element declarations
  namespace JSX {
    interface IntrinsicElements {
      'ms-store-badge': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          productid?: string
          productname?: string
          'window-mode'?: 'full' | 'mini' | 'direct'
          theme?: 'auto' | 'light' | 'dark'
          language?: string
          animation?: 'on' | 'off'
          size?: 'small' | 'medium' | 'large'
        },
        HTMLElement
      >
    }
  }
}

export {};