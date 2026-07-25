import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from '@/app/(auth)/signup/page';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRegister = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    register: mockRegister,
    isAuthenticated: false,
    user: null,
    loading: false,
  })),
}));

function fillField(labelPattern: RegExp, value: string) {
  const input = screen.getByLabelText(labelPattern);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  return input;
}

function fillValidForm() {
  fillField(/first name/i, 'Ada');
  fillField(/last name/i, 'Okafor');
  fillField(/email address/i, 'ada@example.com');
  fillField(/^password$/i, 'password123');
  fillField(/confirm password/i, 'password123');
}

describe('SignupPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockRegister.mockClear();
    mockRegister.mockResolvedValue({ success: true });
  });

  it('disables the submit button until the form is valid', () => {
    render(<SignupPage />);
    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('does not show any error before the user interacts with a field', () => {
    render(<SignupPage />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an error when the password is too short after the field is touched', async () => {
    render(<SignupPage />);
    fillField(/^password$/i, 'short');

    expect(
      await screen.findByText(/password must be at least 8 characters/i),
    ).toBeDefined();
  });

  it('shows an error when passwords do not match', async () => {
    render(<SignupPage />);
    fillField(/^password$/i, 'password123');
    fillField(/confirm password/i, 'different123');

    expect(await screen.findByText(/passwords do not match/i)).toBeDefined();
  });

  it('enables the submit button once the form becomes valid', async () => {
    render(<SignupPage />);
    fillValidForm();

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it('submits successfully with valid data', async () => {
    render(<SignupPage />);
    fillValidForm();

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Okafor',
        email: 'ada@example.com',
        password: 'password123',
        role: 'user',
      }),
    );
  });

  it('marks required fields with a visual indicator', () => {
    render(<SignupPage />);
    const firstNameLabel = screen.getByText(/first name/i).closest('label');
    expect(firstNameLabel?.textContent).toContain('*');
  });
});
