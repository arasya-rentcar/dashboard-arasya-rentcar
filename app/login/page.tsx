'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { saveAuth, isAuthenticated } from '@/lib/auth';
import { getErrorMessage } from '@/lib/utils';

function buildLoginSchema(t: (key: 'errEmail' | 'errPassword') => string) {
  return z.object({
    email: z.string().email(t('errEmail')),
    password: z.string().min(1, t('errPassword')),
  });
}

type LoginForm = z.infer<ReturnType<typeof buildLoginSchema>>;

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('login');
  const [ready, setReady] = useState(false);
  const loginSchema = useMemo(() => buildLoginSchema(t), [t]);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    } else {
      setReady(true);
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    try {
      const res = await authApi.login(values);
      const { token, user } = res.data.data;
      saveAuth(token, user);
      toast.success(t('okLogin'));
      router.push('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2">
            <span className="text-xl font-semibold text-gray-900">{t('brand')}</span>
          </div>
          <CardTitle className="text-lg">{t('signInTitle')}</CardTitle>
          <CardDescription>{t('signInDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                aria-invalid={!!errors.email}
                placeholder={t('emailPlaceholder')}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
