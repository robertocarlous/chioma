import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockLogin = vi.fn();
const stableSearchParams = { get: (_key: string) => null };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => stableSearchParams,
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = () =>
      React.createElement('div', { 'data-testid': 'wallet-connect-stub' });
    Stub.displayName = 'DynamicWalletConnectStub';
    return Stub;
  },
}));

vi.mock('@/components/auth/OAuthButtons', () => ({
  default: () =>
    React.createElement('div', { 'data-testid': 'oauth-buttons' }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => {
  const useAuthMock = vi.fn(() => ({
    login: mockLogin,
    isAuthenticated: false,
    user: null,
    loading: false,
  }));
  (useAuthMock as unknown as { getState: () => unknown }).getState = () => ({
    user: { role: 'user' },
  });
  return { useAuth: useAuthMock };
});

function fillEmail(value: string) {
  const input = screen.getByLabelText(/email address/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  return input;
}

function fillPassword(value: string) {
  const input = screen.getByLabelText(/^password$/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  return input;
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLogin.mockClear();
    mockLogin.mockResolvedValue({ success: true });
  });

  it('disables the submit button until the form is valid', () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
  });

  it('does not show any error before the user interacts with a field', () => {
    render(<LoginPage />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a validation error for an invalid email after the field is touched', async () => {
    render(<LoginPage />);
    fillEmail('not-an-email');

    expect(
      await screen.findByText(/enter a valid email address/i),
    ).toBeDefined();
  });

  it('clears the error once a valid email is entered', async () => {
    render(<LoginPage />);
    fillEmail('not-an-email');
    await screen.findByText(/enter a valid email address/i);

    fillEmail('user@example.com');

    await waitFor(() =>
      expect(screen.queryByText(/enter a valid email address/i)).toBeNull(),
    );
  });

  it('enables the submit button once the form becomes valid', async () => {
    render(<LoginPage />);
    fillEmail('user@example.com');
    fillPassword('secret123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it('submits successfully with valid credentials', async () => {
    render(<LoginPage />);
    fillEmail('user@example.com');
    fillPassword('secret123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123'),
    );
  });

  it('marks required fields with a visual indicator', () => {
    render(<LoginPage />);
    const emailLabel = screen.getByText(/email address/i).closest('label');
    expect(emailLabel?.textContent).toContain('*');
  });
});
