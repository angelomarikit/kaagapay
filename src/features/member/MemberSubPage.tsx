import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

const titles: Record<string, string> = {
  account: 'My Account',
  loans: 'My Loans',
  savings: 'My Savings',
  transactions: 'My Transactions',
  statements: 'Statements',
  services: 'Cooperative Services',
  settings: 'Profile & Settings',
}

export function MemberSubPage() {
  const { section = 'account' } = useParams()
  const { profile, refreshProfile } = useAuth()
  const memberId = profile?.member_id

  const { data: member } = useQuery({
    queryKey: ['member-self', memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from('members').select('*').eq('id', memberId!).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!memberId,
  })

  const { data: contributions = [] } = useQuery({
    queryKey: ['member-contributions', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('member_id', memberId!)
        .order('contributed_at', { ascending: false })
      if (error) throw error
      return data as { id: string; amount: string; contributed_at: string; receipt_reference: string | null }[]
    },
    enabled: !!memberId && (section === 'savings' || section === 'transactions' || section === 'statements'),
  })

  const { data: loans = [] } = useQuery({
    queryKey: ['member-loans', memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from('loans').select('*').eq('member_id', memberId!).order('disbursed_at', { ascending: false })
      if (error) throw error
      return data as { loan_number: string; outstanding_principal: string; status: string; principal: string }[]
    },
    enabled: !!memberId && section === 'loans',
  })

  const shareCapital = contributions.reduce((s, c) => s + Number(c.amount), 0)

  if (!memberId) {
    return (
      <div>
        <PageHeader title={titles[section] ?? 'Member Portal'} description="Member records are linked after staff approval." />
        <EmptyState
          title="No member profile linked"
          description="Your account is not yet linked to a member record. Contact the cooperative office if you recently registered."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={titles[section] ?? 'Member Portal'} description="Your records (restricted by RLS to your member ID)." />

      {section === 'account' || section === 'settings' ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd>{member?.full_name ?? profile?.full_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Member code</dt>
                <dd>{(member as { member_code?: string })?.member_code ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd>{member?.email ?? profile?.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>{(member as { status?: string })?.status ?? '—'}</dd>
              </div>
            </dl>
            {section === 'settings' ? (
              <form
                className="max-w-md space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const contact = String(fd.get('contact') ?? '')
                  const { error } = await supabase.from('members').update({ contact_number: contact || null }).eq('id', memberId)
                  if (!error) await refreshProfile()
                }}
              >
                <div>
                  <Label htmlFor="contact">Contact number</Label>
                  <Input id="contact" name="contact" defaultValue={(member as { contact_number?: string })?.contact_number ?? ''} />
                </div>
                <Button type="submit">Save profile</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {section === 'savings' || section === 'statements' ? (
        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm text-slate-600">
              Total contributions / share capital: <CurrencyDisplay amount={shareCapital.toFixed(2)} />
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Date</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{new Date(c.contributed_at).toLocaleDateString()}</td>
                    <td>
                      <CurrencyDisplay amount={c.amount} />
                    </td>
                    <td>{c.receipt_reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {section === 'loans' ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Loan No.</th>
                  <th className="px-4 py-2 text-left">Principal</th>
                  <th className="px-4 py-2 text-left">Balance</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.loan_number} className="border-t">
                    <td className="px-4 py-2">{l.loan_number}</td>
                    <td className="px-4 py-2">
                      <CurrencyDisplay amount={l.principal} />
                    </td>
                    <td className="px-4 py-2">
                      <CurrencyDisplay amount={l.outstanding_principal} />
                    </td>
                    <td className="px-4 py-2">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {section === 'transactions' ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Contributions</h3>
            {contributions.slice(0, 10).map((c) => (
              <div key={c.id} className="flex justify-between border-b pb-2 text-sm">
                <span>Contribution · {new Date(c.contributed_at).toLocaleDateString()}</span>
                <CurrencyDisplay amount={c.amount} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {section === 'services' ? (
        <EmptyState title="Cooperative services" description="Service requests will be added in a later release." />
      ) : null}
    </div>
  )
}