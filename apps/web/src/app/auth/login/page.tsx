'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/hooks/useAuth';
import { formatApiError } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, data.mfaCode);

      if (result?.requiresMfa) {
        setRequiresMfa(true);
        toast.info('Please enter your 2FA code');
        return;
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(formatApiError(error));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tapflow-50 via-background to-tapflow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground">TapFlow POS</span>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              {requiresMfa ? 'Two-factor authentication' : 'Sign in'}
            </CardTitle>
            <CardDescription className="text-center">
              {requiresMfa
                ? 'Enter the code from your authenticator app'
                : 'Enter your credentials to access your account'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!requiresMfa ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      placeholder="you@business.com"
                      autoComplete="email"
                      autoFocus
                      error={form.formState.errors.email?.message}
                      {...form.register('email')}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Password</label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      error={form.formState.errors.password?.message}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                      {...form.register('password')}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Authenticator code</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={8}
                    autoFocus
                    className="text-center text-2xl tracking-widest font-mono"
                    error={form.formState.errors.mfaCode?.message}
                    {...form.register('mfaCode')}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                {requiresMfa ? 'Verify' : 'Sign in'}
              </Button>

              {requiresMfa && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setRequiresMfa(false)}
                >
                  Back to login
                </Button>
              )}
            </form>

            {!requiresMfa && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-primary font-medium hover:underline">
                  Create one free
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
