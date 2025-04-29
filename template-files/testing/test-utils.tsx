import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Add in providers here if needed (e.g., theme provider, redux provider, etc.)
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
    </>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// Setup user-event
export const setupUser = () => userEvent.setup();

// Helper function to create a mock function with a specific implementation
export const mockFn = <T extends (...args: any[]) => any>(
  implementation?: T
) => jest.fn(implementation); 