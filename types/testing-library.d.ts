declare module '@testing-library/react' {
  export * from '@testing-library/react/types';
}

declare module '@testing-library/user-event' {
  import { UserEvent } from '@testing-library/user-event/dist/types/setup/setup';
  const userEvent: {
    setup(options?: any): UserEvent;
  };
  export default userEvent;
}

declare module '@testing-library/jest-dom' {
  export {};
}

declare module '@testing-library/jest-dom/matchers' {
  export * from '@testing-library/jest-dom/types/matchers';
}