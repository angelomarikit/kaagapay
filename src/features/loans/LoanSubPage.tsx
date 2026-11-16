import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </>
  )
}

const titles: Record<string, string> = {
  applications: 'Loan Applications',
  active: 'Active Loans',
  repayments: 'Loan Repayments',
  types: 'Loan Types & Terms',
  reports: 'Loan Reports',
}

export function LoanSubPage() {
  const { section = '' } = useParams()
  const title = titles[section] ?? 'Loans & Financing'
  const qc = useQueryClient()
  const [openApp, setOpenApp] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [principal, setPrincipal] = useState('')
  const [termMonths, setTermMonths] = useState('12')
  const [rate, setRate] = useState('8')
  const [purpose, setPurpose] = useState('')
  const [repayLoanId, setRepayLoanId] = useState('')
  const [repayAmount, setRepayAmount] = useState('')

  const { data: applications = [] } = useQuery({
    queryKey: ['loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*, members(full_name, member_code)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: section === 'applications',
  })

  const [detailLoanId, setDetailLoanId] = useState<string | null>(null)

  const { data: loans = [] } = useQuery({
    queryKey: ['loans', section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*, members(full_name, member_code)')
        .order('disbursed_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: section === 'active' || section === 'repayments',
  })

  const { data: loanSchedules = [] } = useQuery({
    queryKey: ['loan-schedules', detailLoanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_schedules')
        .select('*')
        .eq('loan_id', detailLoanId!)
        .order('payment_no', { ascending: true })
      if (error) throw error
      return data as {
        payment_no: number
        due_date: string
        amount_due: string
        principal_portion: string
        interest_portion: string
        status: string
      }[]
    },
    enabled: !!detailLoanId,
  })

  const detailLoan = useMemo(() => {
    if (!detailLoanId) return null
    return (loans as { id: string }[]).find((l) => l.id === detailLoanId) as
      | {
          id: string
          loan_number: string
          principal: string
          outstanding_principal: string
          interest_rate: string
          term_months: number
          first_due_date: string | null
          disbursed_at: string | null
          members: { full_name: string; member_code: string } | null
        }
      | undefined
  }, [detailLoanId, loans])

  const { data: loanTypes = [] } = useQuery({
    queryKey: ['loan-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loan_types').select('*').eq('is_active', true)
      if (error) throw error
      return data as { id: string; name: string; default_rate: string; default_term_months: number }[]
    },
    enabled: section === 'types' || openApp,
  })

  const { data: repayments = [] } = useQuery({
    queryKey: ['loan-repayments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_repayments')
        .select('*, loans(loan_number, members(full_name))')
        .order('paid_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: section === 'repayments',
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'loans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('members').select('id, full_name, member_code').eq('status', 'active').order('full_name')
      if (error) throw error
      return data as { id: string; full_name: string; member_code: string }[]
    },
    enabled: openApp,
  })

  const submitApplication = useMutation({
    mutationFn: async () => {
      const p = Number(principal)
      if (!memberId || !p || p <= 0) throw new Error('Member and valid principal required.')
      const { error } = await supabase.from('loan_applications').insert({
        member_id: memberId,
        requested_principal: p,
        term_months: Number(termMonths) || 12,
        interest_rate: Number(rate) || 8,
        purpose: purpose || null,
        status: 'submitted',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setOpenApp(false)
      qc.invalidateQueries({ queryKey: ['loan-applications'] })
    },
  })

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('approve_loan_application', { application_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-applications'] })
      qc.invalidateQueries({ queryKey: ['loans'] })
    },
  })

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('loan_applications')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-applications'] }),
  })

  const recordRepayment = useMutation({
    mutationFn: async () => {
      const amt = Number(repayAmount)
      if (!repayLoanId || !amt || amt <= 0) throw new Error('Select loan and enter amount.')
      const { error } = await supabase.rpc('record_loan_repayment', {
        payload: {
          loan_id: repayLoanId,
          amount: amt.toFixed(2),
          client_request_id: crypto.randomUUID(),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setRepayAmount('')
      qc.invalidateQueries({ queryKey: ['loan-repayments'] })
      qc.invalidateQueries({ queryKey: ['loans'] })
    },
  })

  const activeLoans = useMemo(() => loans.filter((l) => (l as { status: string }).status === 'active'), [loans])

  return (
    <div>
      {detailLoan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {detailLoan.loan_number} — {detailLoan.members?.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-2">
                <DetailRow label="Principal" value={<CurrencyDisplay amount={detailLoan.principal} />} />
                <DetailRow label="Balance" value={<CurrencyDisplay amount={detailLoan.outstanding_principal} />} />
                <DetailRow label="Interest rate" value={`${Number(detailLoan.interest_rate)}% per year`} />
                <DetailRow label="Term" value={`${detailLoan.term_months} months`} />
                <DetailRow
                  label="First due date"
                  value={
                    detailLoan.first_due_date
                      ? new Date(detailLoan.first_due_date).toLocaleDateString()
                      : loanSchedules[0]
                        ? new Date(loanSchedules[0].due_date).toLocaleDateString()
                        : '—'
                  }
                />
              </dl>
              <p className="text-slate-600">Monthly dues are scheduled on the same calendar day each month from disbursement.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-1">#</th>
                    <th>Due date</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Total due</th>
                  </tr>
                </thead>
                <tbody>
                  {loanSchedules.map((s) => (
                    <tr key={s.payment_no} className="border-b">
                      <td className="py-1">{s.payment_no}</td>
                      <td>{new Date(s.due_date).toLocaleDateString()}</td>
                      <td>
                        <CurrencyDisplay amount={s.principal_portion} />
                      </td>
                      <td>
                        <CurrencyDisplay amount={s.interest_portion} />
                      </td>
                      <td>
                        <CurrencyDisplay amount={s.amount_due} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button variant="outline" onClick={() => setDetailLoanId(null)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <PageHeader
        title={title}
        description="Loans & financing — applications, disbursement, and repayments via Supabase RPCs."
        actions={
          section === 'applications' ? (
            <Button onClick={() => setOpenApp(true)}>New application</Button>
          ) : section === 'repayments' ? (
            <Button variant="outline" asChild>
              <Link to="/admin/loans">Back to dashboard</Link>
            </Button>
          ) : undefined
        }
      />

      {openApp ? (
        <Card className="mb-6 border-brand-blue">
          <CardHeader>
            <CardTitle>Loan application</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-xl gap-4">
            <div>
              <Label>Member</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.member_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Requested principal</Label>
              <Input inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Term (months)</Label>
                <Input value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
              </div>
              <div>
                <Label>Interest rate %</Label>
                <Input value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <Button onClick={() => submitApplication.mutate()} disabled={submitApplication.isPending}>
              Submit application
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === 'applications' ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Member</th>
                  <th className="px-4 py-2 text-left">Principal</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((row) => {
                  const r = row as {
                    id: string
                    requested_principal: string
                    status: string
                    members: { full_name: string } | null
                  }
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2">{r.members?.full_name}</td>
                      <td className="px-4 py-2">
                        <CurrencyDisplay amount={r.requested_principal} />
                      </td>
                      <td className="px-4 py-2">{r.status}</td>
                      <td className="px-4 py-2 space-x-2">
                        {r.status === 'submitted' || r.status === 'pending' ? (
                          <>
                            <Button size="sm" onClick={() => approve.mutate(r.id)} disabled={approve.isPending}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = window.prompt('Rejection reason?') ?? 'Rejected'
                                reject.mutate({ id: r.id, reason })
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {section === 'active' ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Loan No.</th>
                  <th className="px-4 py-2 text-left">Member</th>
                  <th className="px-4 py-2 text-left">Outstanding</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((row) => {
                  const r = row as {
                    id: string
                    loan_number: string
                    outstanding_principal: string
                    status: string
                    members: { full_name: string } | null
                  }
                  return (
                    <tr key={r.loan_number} className="border-t cursor-pointer hover:bg-slate-50" onClick={() => setDetailLoanId(r.id)}>
                      <td className="px-4 py-2 text-brand-blue">{r.loan_number}</td>
                      <td className="px-4 py-2 font-medium text-navy">{r.members?.full_name}</td>
                      <td className="px-4 py-2">
                        <CurrencyDisplay amount={r.outstanding_principal} />
                      </td>
                      <td className="px-4 py-2">{r.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {section === 'repayments' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Record payment</CardTitle>
            </CardHeader>
            <CardContent className="grid max-w-xl gap-4">
              <div>
                <Label>Loan</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={repayLoanId}
                  onChange={(e) => setRepayLoanId(e.target.value)}
                >
                  <option value="">Select active loan…</option>
                  {activeLoans.map((row) => {
                    const r = row as { id: string; loan_number: string; members: { full_name: string } | null }
                    return (
                      <option key={r.id} value={r.id}>
                        {r.loan_number} — {r.members?.full_name}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input inputMode="decimal" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
              </div>
              <Button onClick={() => recordRepayment.mutate()} disabled={recordRepayment.isPending}>
                Record repayment
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Loan</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.map((row) => {
                    const r = row as {
                      id: string
                      amount: string
                      paid_at: string
                      loans: { loan_number: string; members: { full_name: string } | null } | null
                    }
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-4 py-2">{r.loans?.loan_number}</td>
                        <td className="px-4 py-2">
                          <CurrencyDisplay amount={r.amount} />
                        </td>
                        <td className="px-4 py-2">{new Date(r.paid_at).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === 'types' ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Default rate</th>
                  <th className="px-4 py-2 text-left">Term (months)</th>
                </tr>
              </thead>
              <tbody>
                {loanTypes.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2">{t.name}</td>
                    <td className="px-4 py-2">{t.default_rate}%</td>
                    <td className="px-4 py-2">{t.default_term_months}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {section === 'reports' ? (
        <EmptyState title="Loan reports" description="Export and aging reports will aggregate live loan tables in a future pass." />
      ) : null}

      {!['applications', 'active', 'repayments', 'types', 'reports'].includes(section) ? (
        <EmptyState title={title} description="Choose a section from the Loans dashboard tabs." />
      ) : null}
    </div>
  )
}