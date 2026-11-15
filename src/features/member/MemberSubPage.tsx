import { useCallback, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuth } from '@/features/auth/AuthProvider'
import { buildMemberStatementCsv, downloadTextFile, memberStatementFilename } from '@/lib/download'
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

type LoanApplicationRow = {
  id: string
  requested_principal: string
  term_months: number
  interest_rate: string
  purpose: string | null
  status: string
  rejection_reason: string | null
  created_at: string
  loan_types: { name: string } | { name: string }[] | null
}

export function MemberSubPage() {
  const { section = 'account' } = useParams()
  const qc = useQueryClient()
  const { profile, refreshProfile } = useAuth()
  const memberId = profile?.member_id
  const [loanFormOpen, setLoanFormOpen] = useState(false)
  const [loanTypeId, setLoanTypeId] = useState('')
  const [principal, setPrincipal] = useState('')
  const [termMonths, setTermMonths] = useState('12')
  const [purpose, setPurpose] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)

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

  const { data: loanApplications = [] } = useQuery({
    queryKey: ['member-loan-applications', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('id, requested_principal, term_months, interest_rate, purpose, status, rejection_reason, created_at, loan_types(name)')
        .eq('member_id', memberId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as LoanApplicationRow[]
    },
    enabled: !!memberId && section === 'loans',
  })

  const { data: loanTypes = [] } = useQuery({
    queryKey: ['loan-types', 'member'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loan_types').select('id, name, default_rate, default_term_months').eq('is_active', true)
      if (error) throw error
      return data as { id: string; name: string; default_rate: string; default_term_months: number }[]
    },
    enabled: !!memberId && section === 'loans' && loanFormOpen,
  })

  const selectedLoanType = useMemo(
    () => loanTypes.find((t) => t.id === loanTypeId),
    [loanTypes, loanTypeId],
  )

  const hasPendingApplication = loanApplications.some((a) => a.status === 'submitted')

  const submitLoanApplication = useMutation({
    mutationFn: async () => {
      const amount = Number(principal)
      if (!amount || amount <= 0) throw new Error('Enter a valid loan amount.')
      if (!loanTypeId) throw new Error('Select a loan type.')
      const { data, error } = await supabase.rpc('submit_loan_application', {
        payload: {
          requested_principal: amount.toFixed(2),
          term_months: Number(termMonths) || 12,
          purpose: purpose.trim(),
          loan_type_id: loanTypeId,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setApplyError(null)
      setLoanFormOpen(false)
      setPrincipal('')
      setPurpose('')
      qc.invalidateQueries({ queryKey: ['member-loan-applications', memberId] })
    },
    onError: (err: Error) => {
      setApplyError(err.message)
    },
  })

  const shareCapital = contributions.reduce((s, c) => s + Number(c.amount), 0)

  const downloadStatement = useCallback(() => {
    const memberCode = (member as { member_code?: string })?.member_code ?? 'member'
    const csv = buildMemberStatementCsv({
      memberName: member?.full_name ?? profile?.full_name ?? 'Member',
      memberCode,
      email: member?.email ?? profile?.email ?? '',
      shareCapital: shareCapital.toFixed(2),
      contributions,
    })
    downloadTextFile(memberStatementFilename(memberCode), csv)
  }, [contributions, member, profile, shareCapital])

  const memberStatus = (member as { status?: string } | null | undefined)?.status
  const canApplyLoan = memberStatus === 'active' && !hasPendingApplication

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
      <PageHeader
        title={titles[section] ?? 'Member Portal'}
        description={
          section === 'loans'
            ? 'Apply for financing and track active loan balances.'
            : section === 'statements'
              ? 'Download your contribution statement as a CSV file.'
              : 'Your records (restricted by RLS to your member ID).'
        }
        actions={
          section === 'statements' ? (
            <Button type="button" variant="outline" onClick={downloadStatement}>
              <Download className="mr-2 h-4 w-4" />
              Download statement
            </Button>
          ) : section === 'loans' ? (
            <Button
              type="button"
              disabled={!canApplyLoan || loanFormOpen}
              onClick={() => {
                setApplyError(null)
                setLoanFormOpen(true)
              }}
            >
              Apply for loan
            </Button>
          ) : undefined
        }
      />

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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Total contributions / share capital: <CurrencyDisplay amount={shareCapital.toFixed(2)} />
              </p>
              {section === 'statements' ? (
                <Button type="button" size="sm" variant="outline" className="w-fit" onClick={downloadStatement}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              ) : null}
            </div>
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

      {section === 'loans' && hasPendingApplication ? (
        <p className="mb-4 text-sm text-amber-800">
          You have a pending application. Staff will review it before a loan can be disbursed.
        </p>
      ) : null}

      {section === 'loans' && memberStatus && memberStatus !== 'active' ? (
        <p className="mb-4 text-sm text-slate-600">Loan applications are available when your membership status is active.</p>
      ) : null}

      {section === 'loans' && loanFormOpen ? (
        <Card className="mb-6 border-brand-blue">
          <CardHeader>
            <CardTitle>New loan application</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-lg gap-4">
            <div>
              <Label htmlFor="loan-type">Loan type</Label>
              <select
                id="loan-type"
                required
                className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={loanTypeId}
                onChange={(e) => {
                  const id = e.target.value
                  setLoanTypeId(id)
                  const picked = loanTypes.find((t) => t.id === id)
                  if (picked) {
                    setTermMonths(String(picked.default_term_months))
                  }
                }}
              >
                <option value="">Select loan type…</option>
                {loanTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Rates and terms are configured by cooperative staff under Loans → Loan Types.</p>
            </div>
            <div>
              <Label htmlFor="loan-amount">Amount requested (₱)</Label>
              <Input
                id="loan-amount"
                inputMode="decimal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <Label htmlFor="loan-term">Term requested (months)</Label>
              <Input id="loan-term" inputMode="numeric" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">Interest rate</span>
              <p className="font-semibold text-navy">
                {selectedLoanType ? `${Number(selectedLoanType.default_rate)}% per year` : 'Select a loan type to see the cooperative rate'}
              </p>
              <p className="text-xs text-slate-500">Set by admin for each loan type; you cannot change this when applying.</p>
            </div>
            <div>
              <Label htmlFor="loan-purpose">Purpose</Label>
              <Input id="loan-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Vehicle upgrade" />
            </div>
            {applyError ? <p className="text-sm text-red-700">{applyError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={submitLoanApplication.isPending || !loanTypeId}
                onClick={() => submitLoanApplication.mutate()}
              >
                {submitLoanApplication.isPending ? 'Submitting…' : 'Submit application'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLoanFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {section === 'loans' ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">My applications</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {loanApplications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No loan applications yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Requested</th>
                    <th className="px-4 py-2 text-left">Term</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loanApplications.map((a) => {
                    const lt = a.loan_types
                    const typeName = Array.isArray(lt) ? lt[0]?.name : lt?.name
                    return (
                      <tr key={a.id} className="border-t">
                        <td className="px-4 py-2">{new Date(a.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{typeName ?? '—'}</td>
                        <td className="px-4 py-2">
                          <CurrencyDisplay amount={a.requested_principal} />
                        </td>
                        <td className="px-4 py-2">{a.term_months} mo</td>
                        <td className="px-4 py-2">
                          <Badge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning'}>
                            {a.status}
                          </Badge>
                          {a.status === 'rejected' && a.rejection_reason ? (
                            <p className="mt-1 text-xs text-slate-500">{a.rejection_reason}</p>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {section === 'loans' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active loans</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {loans.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No disbursed loans yet.</p>
            ) : (
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
            )}
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