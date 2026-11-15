import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email(),
})

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  })

  return (
    <Card className="shadow-lg">
      <CardContent className="space-y-6 p-8">
        <div className="text-center">
          <BrandLogo variant="full" size="hd" className="mb-4" />
          <h2 className="text-xl font-bold text-navy">Reset password</h2>
          <p className="text-sm text-slate-600">We will email you a recovery link</p>
        </div>
        {sent ? (
          <p className="text-sm text-green-700">Check your email for the reset link.</p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" className="pl-9" {...register('email')} />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Send reset link
            </Button>
          </form>
        )}
        <Link to="/login" className="block text-center text-sm text-brand-blue hover:underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  )
}