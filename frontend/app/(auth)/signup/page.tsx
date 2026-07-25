'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import OAuthButtons from '@/components/auth/OAuthButtons';

const inputClasses =
  'w-full px-4 py-3 bg-ink-800 border border-cream/10 rounded-xl text-cream placeholder:text-cream-dim/40 focus:outline-none focus:border-brass-500/60 transition-colors text-sm';

const inputErrorClasses = 'border-red-400/60 focus:border-red-400/60';

const labelClasses =
  'block text-xs font-semibold text-cream-dim uppercase tracking-widest mb-2';

const roles = [
  {
    value: 'user' as const,
    title: 'Rent or list a home',
    description: 'Tenant or landlord',
  },
  {
    value: 'agent' as const,
    title: 'Work as an agent',
    description: 'Earn automated commissions',
  },
];

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['user', 'agent']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

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

export default function SignupPage() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, user, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, touchedFields, isValid, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
    },
  });

  // Compute initial validity (for the disabled submit button) without
  // surfacing error messages before the user has touched a field.
  useEffect(() => {
    void trigger();
  }, [trigger]);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/user');
    }
  }, [isAuthenticated, user, loading, router]);

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormData) => {
    const result = await registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role,
    });
    if (result.success) {
      toast.success('Account created! Welcome to Chioma.');
      router.push('/user');
    } else {
      toast.error(result.error ?? 'Registration failed. Please try again.');
    }
  };

  const fieldError = (name: keyof SignupFormData) =>
    touchedFields[name] ? errors[name]?.message : undefined;

  const firstNameError = fieldError('firstName');
  const lastNameError = fieldError('lastName');
  const emailError = fieldError('email');
  const passwordError = fieldError('password');
  const confirmPasswordError = fieldError('confirmPassword');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">
          Create your account
        </h1>
        <p className="text-cream-dim text-sm mt-2">
          Free to start — no credit card required
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
        {/* Role selection */}
        <fieldset>
          <legend className={labelClasses}>I want to…</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                  selectedRole === role.value
                    ? 'border-brass-500/70 bg-brass-500/10'
                    : 'border-cream/10 bg-ink-800 hover:border-cream/25'
                }`}
              >
                <input
                  type="radio"
                  value={role.value}
                  className="sr-only"
                  {...register('role')}
                />
                <span className="block text-sm font-semibold text-cream">
                  {role.title}
                </span>
                <span className="block text-xs text-cream-dim mt-0.5">
                  {role.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <Field id="firstName" label="First name" error={firstNameError}>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Ada"
              aria-invalid={!!firstNameError}
              aria-describedby={
                firstNameError ? 'firstName-error' : undefined
              }
              className={`${inputClasses} ${firstNameError ? inputErrorClasses : ''}`}
              {...register('firstName')}
            />
          </Field>
          <Field id="lastName" label="Last name" error={lastNameError}>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Okafor"
              aria-invalid={!!lastNameError}
              aria-describedby={lastNameError ? 'lastName-error' : undefined}
              className={`${inputClasses} ${lastNameError ? inputErrorClasses : ''}`}
              {...register('lastName')}
            />
          </Field>
        </div>

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

        <Field id="password" label="Password" error={passwordError}>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
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

        <Field
          id="confirmPassword"
          label="Confirm password"
          error={confirmPasswordError}
        >
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter password"
            aria-invalid={!!confirmPasswordError}
            aria-describedby={
              confirmPasswordError ? 'confirmPassword-error' : undefined
            }
            className={`${inputClasses} ${confirmPasswordError ? inputErrorClasses : ''}`}
            {...register('confirmPassword')}
          />
        </Field>

        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brass-500 hover:bg-brass-400 disabled:opacity-60 disabled:cursor-not-allowed text-ink-950 font-semibold rounded-xl transition-colors text-sm mt-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-cream-dim mt-8">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-brass-400 hover:text-brass-300 font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
