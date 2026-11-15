import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const schema = z.object({
  identifier: z.string().min(1, 'Email or Member ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { remember: true },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add credentials to .env and restart the dev server.')
      return
    }

    let email = values.identifier.trim()
    if (!email.includes('@')) {
      const { data: member } = await supabase
        .from('members')
        .select('email')
        .eq('member_code', email.toUpperCase())
        .maybeSingle()
      const row = member as { email: string | null } | null
      if (!row?.email) {
        setError('No login email found for this Member ID. Contact the cooperative office.')
        return
      }
      email = row.email
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    })

    if (signInError) {
      setError(signInError.message)
      return
    }

    await refreshProfile()
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (userId) {
      const { data: prof } = await supabase.from('profiles').select('user_type').eq('id', userId).maybeSingle()
      const userType = (prof as { user_type?: string } | null)?.user_type
      if (userType === 'pending') {
        navigate('/pending-approval', { replace: true })
      } else if (userType === 'member') {
        navigate('/member', { replace: true })
      } else {
        navigate('/admin', { replace: true })
      }
    }
  })

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardContent className="space-y-6 p-8">
        <div className="text-center">
          <BrandLogo variant="full" size="hd" className="mb-4" />
          <p className="mb-1 text-xs text-slate-500">Cooperative Management System</p>
          <h2 className="text-2xl font-bold text-navy">Welcome Back!</h2>
          <p className="text-sm text-slate-600">Sign in to your account to continue</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="identifier"
              className="pl-9"
              placeholder="Email Address or Member ID"
              autoComplete="username"
              {...register('identifier')}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="pl-9 pr-10"
              placeholder="Password"
              autoComplete="current-password"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded accent-brand-blue" {...register('remember')} />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-brand-blue hover:underline">
              Forgot password?
            </Link>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </form>
        <p className="text-center text-sm text-slate-600">
          New member?{' '}
          <Link to="/register" className="font-medium text-brand-blue hover:underline">
            Register for membership
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}