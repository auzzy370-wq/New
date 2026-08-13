'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { register as apiRegister } from '@/lib/auth';
import { formatApiError } from '@/lib/api';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await apiRegister(data);
      setRegistered(true);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tapflow-50 via-background to-tapflow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 text-center">
          <CardContent className="pt-10 pb-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">
              We sent a verification link to your email address. Click the link to activate your account.
            </p>
            <Button variant="outline" onClick={() => router.push('/auth/login')} className="w-full">
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tapflow-50 via-background to-tapflow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold">TapFlow POS</span>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Create your account</CardTitle>
            <CardDescription className="text-center">
              Start your 14-day free trial. No credit card required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">First name</label>
                  <Input
                    placeholder="John"
                    error={form.formState.errors.firstName?.message}
                    {...form.register('firstName')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Last name</label>
                  <Input
                    placeholder="Smith"
                    error={form.formState.errors.lastName?.message}
                    {...form.register('lastName')}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="you@business.com"
                  error={form.formState.errors.email?.message}
                  {...form.register('email')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Phone (optional)</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  {...form.register('phone')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
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

              <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                Create account
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          {['14-day free trial', '$25/month after', '1% platform fee'].map((item) => (
            <div key={item} className="text-xs text-muted-foreground bg-card rounded-lg p-2 border">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
