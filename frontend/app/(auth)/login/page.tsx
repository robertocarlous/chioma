'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import OAuthButtons from '@/components/auth/OAuthButtons';

const WalletConnectButton = dynamic(
  () => import('@/components/auth/WalletConnectButton'),
  {
    ssr: false,
    loading: () => <div className="h-11 rounded-xl bg-ink-800" />,
  },
);

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const inputErrorClasses = 'border-red-400/60 focus:border-red-400/60';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
        <span className="text-brass-400 ml-0.5" aria-hidden="true">
          *
        </span>
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, touchedFields, isValid, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  // Compute initial validity (for the disabled submit button) without
  // surfacing error messages before the user has touched a field.
  useEffect(() => {
    void trigger();
  }, [trigger]);

  // Only follow same-origin relative paths from ?next= to avoid open redirects.
  const nextParam = searchParams.get('next');
  const nextPath =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null;

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      router.replace(nextPath ?? (user.role === 'admin' ? '/admin' : '/user'));
    }
  }, [isAuthenticated, user, loading, router, nextPath]);

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      toast.success('Welcome back!');
      const role = useAuth.getState().user?.role;
      router.push(nextPath ?? (role === 'admin' ? '/admin' : '/user'));
    } else {
      toast.error(result.error ?? 'Login failed. Please try again.');
    }
  };

  const emailError = touchedFields.email ? errors.email?.message : undefined;
  const passwordError = touchedFields.password
    ? errors.password?.message
    : undefined;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">Welcome back</h1>
        <p className="text-cream-dim text-sm mt-2">
          Sign in to your Chioma account
        </p>
      </div>

      <OAuthButtons />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-cream/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-ink-900 px-3 text-cream-dim/70 font-medium">
            or with email
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <Field id="email" label="Email address" error={emailError}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`${inputClasses} ${emailError ? inputErrorClasses : ''}`}
            {...register('email')}
          />
        </Field>

        <div>
          <Field id="password" label="Password" error={passwordError}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
                className={`${inputClasses} ${passwordError ? inputErrorClasses : ''} pr-12`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream-dim/60 hover:text-cream transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <div className="flex justify-end mt-2">
            <Link
              href="#"
              className="text-xs text-brass-400 hover:text-brass-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 disabled:opacity-60 disabled:cursor-not-allowed text-ink-950 font-semibold rounded-xl transition-colors text-sm"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-cream/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-ink-900 px-3 text-cream-dim/70 font-medium">
            or connect a wallet
          </span>
        </div>
      </div>

      <WalletConnectButton
        className="w-full"
        buttonText="Connect Stellar Wallet"
      />

      <p className="text-center text-sm text-cream-dim mt-8">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-brass-400 hover:text-brass-300 font-semibold transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-brass-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
