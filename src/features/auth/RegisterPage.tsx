import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Layers, Mail, Phone, User, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const schema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    contactNumber: z.string().min(7, 'Contact number is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    membershipType: z.string().min(1, 'Select membership type'),
    agreeTerms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const FALLBACK_TYPES = ['Regular Member', 'Driver-Operator', 'Associate Member']

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: membershipTypes = [] } = useQuery({
    queryKey: ['membership-types', 'register'],
    queryFn: async () => {
      const { data, error: qErr } = await supabase.from('membership_types').select('name').eq('is_active', true).order('name')
      if (qErr) return FALLBACK_TYPES.map((name) => ({ name }))
      return (data?.length ? data : FALLBACK_TYPES.map((name) => ({ name }))) as { name: string }[]
    },
    enabled: isSupabaseConfigured,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { membershipType: membershipTypes[0]?.name ?? 'Regular Member' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setMessage(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        data: { full_name: values.fullName.trim() },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    const userId = signUpData.user?.id
    const hasSession = !!signUpData.session

    if (hasSession && userId) {
      const { error: appErr } = await supabase.rpc('submit_membership_application', {
        payload: {
          full_name: values.fullName.trim(),
          email: values.email.trim(),
          contact_number: values.contactNumber.trim(),
          membership_type: values.membershipType,
        },
      })
      if (appErr) {
        setError(appErr.message)
        return
      }
      setMessage('Registration submitted. Your application is pending review.')
      setTimeout(() => navigate('/pending-approval', { replace: true }), 1500)
      return
    }

    setMessage(
      'Account created. If email confirmation is enabled, check your inbox first, then sign in — staff will review your application after you log in.',
    )
    setTimeout(() => navigate('/login', { replace: true }), 4000)
  })

  return (
    <div className="-mx-4 w-[calc(100%+2rem)] max-w-lg sm:mx-0 sm:w-full">
      <Card className="border-slate-200 shadow-lg">
        <CardContent className="space-y-5 p-8">
          <div className="text-center">
            <BrandLogo variant="full" size="hd" className="mb-4" />
            <p className="mb-1 text-xs text-slate-500">Cooperative Management System</p>
            <h2 className="text-2xl font-bold text-navy">Membership registration</h2>
            <p className="text-sm text-slate-600">Apply to join KAAGAPAY Cooperative online</p>
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Field icon={User} label="Full Name" id="fullName" error={errors.fullName?.message}>
              <Input id="fullName" autoComplete="name" {...register('fullName')} />
            </Field>
            <Field icon={Mail} label="Email Address" id="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
            </Field>
            <Field icon={Phone} label="Contact Number" id="contactNumber" error={errors.contactNumber?.message}>
              <Input id="contactNumber" type="tel" autoComplete="tel" {...register('contactNumber')} />
            </Field>
            <Field icon={User} label="Password" id="password" error={errors.password?.message}>
              <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...register('password')} />
              <button
                type="button"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>
            <Field icon={User} label="Confirm Password" id="confirmPassword" error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
            </Field>
            <Field icon={Layers} label="Membership type" id="membershipType" error={errors.membershipType?.message}>
              <select
                id="membershipType"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...register('membershipType')}
              >
                {membershipTypes.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" className="mt-0.5 accent-brand-blue" {...register('agreeTerms')} />
              <span>I agree to the cooperative membership terms and privacy policy.</span>
            </label>
            {errors.agreeTerms ? <p className="text-sm text-red-600">{errors.agreeTerms.message}</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <UserPlus className="h-4 w-4" />
              Submit application
            </Button>
          </form>
          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-blue hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  id,
  error,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  id: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <div className="[&_input]:pl-9 [&_select]:pl-9">{children}</div>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}