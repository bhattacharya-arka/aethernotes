'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { authApi, getErrorMessage } from '@/lib/api';
import { useStore } from '@/store/useStore';

interface Fields {
  username: string;
  email:    string;
  password: string;
  confirm:  string;
}

export function RegisterForm() {
  const router                = useRouter();
  const { setUser, setToken } = useStore();

  const [form, setForm]       = useState<Fields>({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors]   = useState<Partial<Fields>>({});

  const set = (field: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<Fields> = {};
    if (!form.username || form.username.length < 3)
      e.username = 'Username must be at least 3 characters';
    if (!form.email)
      e.email = 'Email is required';
    if (!form.password || form.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm)
      e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.register({
        username: form.username,
        email:    form.email,
        password: form.password,
      });
      setToken(res.accessToken);
      setUser({ id: res.userId, username: res.username, email: res.email });
      toast.success('Account created! Welcome to AetherNotes.');
      router.push('/notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your vault</h1>
        <p className="text-sm text-muted-foreground">
          All notes are encrypted with your password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="yourname"
            autoComplete="username"
            value={form.username}
            onChange={set('username')}
            className={errors.username ? 'border-destructive' : ''}
          />
          {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            className={errors.confirm ? 'border-destructive' : ''}
          />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        </div>

        {/* Security notice */}
        <div className="flex gap-3 rounded-lg bg-primary/10 border border-primary/20 p-3">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">End-to-end encrypted</p>
            <p>Your password derives the AES-256 encryption key via PBKDF2. It is never stored. If lost, notes cannot be recovered.</p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
