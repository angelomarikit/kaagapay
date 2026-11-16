import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Download, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { downloadTextFile } from '@/lib/download'
import { formatPeso } from '@/lib/money'
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
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editTypeId, setEditTypeId] = useState<string | null>(null)
  const [editTypeName, setEditTypeName] = useState('')
  const [editTypeRate, setEditTypeRate] = useState('')
  const [editTypeTerm, setEditTypeTerm] = useState('12')
  const [editTypeActive, setEditTypeActive] = useState(true)
  const [typeFormError, setTypeFormError] = useState<string | null>(null)

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
    enabled: section === 'applications' || section === 'reports',
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
    enabled: section === 'active' || section === 'repayments' || section === 'reports',
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
      const q = supabase.from('loan_types').select('*').order('name')
      const { data, error } = section === 'types' ? await q : await q.eq('is_active', true)
      if (error) throw error
      return data as {
        id: string
        name: string
        default_rate: string
        default_term_months: number
        is_active: boolean
      }[]
    },
    enabled: section === 'types' || openApp,
  })

  function openLoanTypeModal(type?: {
    id: string
    name: string
    default_rate: string
    default_term_months: number
    is_active: boolean
  }) {
    if (type) {
      setEditTypeId(type.id)
      setEditTypeName(type.name)
      setEditTypeRate(String(type.default_rate))
      setEditTypeTerm(String(type.default_term_months))
      setEditTypeActive(type.is_active)
    } else {
      setEditTypeId(null)
      setEditTypeName('')
      setEditTypeRate('8')
      setEditTypeTerm('12')
      setEditTypeActive(true)
    }
    setTypeFormError(null)
    setTypeModalOpen(true)
  }

  const saveLoanType = useMutation({
    mutationFn: async () => {
      const name = editTypeName.trim()
      const rate = Number(editTypeRate)
      const term = Number(editTypeTerm)
      if (!name) throw new Error('Name is required.')
      if (!Number.isFinite(rate) || rate < 0) throw new Error('Enter a valid interest rate.')
      if (!Number.isFinite(term) || term < 1) throw new Error('Term must be at least 1 month.')
      const row = {
        name,
        default_rate: rate,
        default_term_months: Math.round(term),
        is_active: editTypeActive,
      }
      if (editTypeId) {
        const { error } = await supabase.from('loan_types').update(row).eq('id', editTypeId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('loan_types').insert(row)
        if (error) throw error
      }
    },
    onSuccess: () => {
      setTypeModalOpen(false)
      qc.invalidateQueries({ queryKey: ['loan-types'] })
    },
    onError: (e: Error) => setTypeFormError(e.message),
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
    enabled: section === 'repayments' || section === 'reports',
  })

  const { data: agingRows = [] } = useQuery({
    queryKey: ['loan-reports-aging'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('loan_schedules')
        .select('payment_no, due_date, amount_due, status, loans(loan_number, member_id, members(full_name, member_code))')
        .lte('due_date', today)
        .neq('status', 'paid')
        .order('due_date', { ascending: true })
        .limit(50)
      if (error) throw error
      return (data ?? []).map((row) => {
        const rawLoan = row.loans as
          | { loan_number: string; members: { full_name: string; member_code: string } | { full_name: string; member_code: string }[] | null }
          | { loan_number: string; members: { full_name: string; member_code: string } | { full_name: string; member_code: string }[] | null }[]
          | null
        const loan = Array.isArray(rawLoan) ? rawLoan[0] : rawLoan
        const rawM = loan?.members
        const members = rawM == null ? null : Array.isArray(rawM) ? rawM[0] ?? null : rawM
        return {
          payment_no: row.payment_no as number,
          due_date: row.due_date as string,
          amount_due: String(row.amount_due),
          status: row.status as string,
          loans: loan ? { loan_number: loan.loan_number, members } : null,
        }
      })
    },
    enabled: section === 'reports',
  })

  const reportStats = useMemo(() => {
    const portfolio = loans as {
      status: string
      principal: string
      outstanding_principal: string
    }[]
    const active = portfolio.filter((l) => ['active', 'delinquent'].includes(l.status))
    const outstanding = active.reduce((s, l) => s + Number(l.outstanding_principal), 0)
    const totalPrincipal = active.reduce((s, l) => s + Number(l.principal), 0)
    const apps = applications as { status: string }[]
    const pendingApps = apps.filter((a) => ['submitted', 'pending', 'under_review'].includes(a.status)).length
    const repayTotal = (repayments as { amount: string }[]).reduce((s, r) => s + Number(r.amount), 0)
    return {
      activeCount: active.length,
      outstanding,
      totalPrincipal,
      pendingApps,
      repayTotal,
      overdueCount: agingRows.length,
    }
  }, [loans, applications, repayments, agingRows])

  const downloadPortfolioCsv = useCallback(() => {
    const lines = ['KAAGAPAY Loan Portfolio', `Generated,${new Date().toISOString().slice(0, 10)}`, '']
    lines.push('Loan No.,Member,Principal,Outstanding,Rate %,Term,Status')
    for (const row of loans as {
      loan_number: string
      principal: string
      outstanding_principal: string
      interest_rate: string
      term_months: number
      status: string
      members: { full_name: string; member_code: string } | { full_name: string; member_code: string }[] | null
    }[]) {
      const raw = row.members
      const m = Array.isArray(raw) ? raw[0] : raw
      lines.push(
        [
          row.loan_number,
          m ? `${m.full_name} (${m.member_code})` : '',
          row.principal,
          row.outstanding_principal,
          String(row.interest_rate),
          String(row.term_months),
          row.status,
        ].join(','),
      )
    }
    downloadTextFile(`kaagapay-loan-portfolio-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\r\n'))
  }, [loans])

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
          section === 'types' ? (
            <Button type="button" onClick={() => openLoanTypeModal()}>
              Add loan type
            </Button>
          ) : section === 'applications' ? (
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

      {typeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editTypeId ? 'Edit loan type' : 'Add loan type'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label htmlFor="lt-name">Name</Label>
                <Input id="lt-name" value={editTypeName} onChange={(e) => setEditTypeName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="lt-rate">Default rate (%)</Label>
                  <Input id="lt-rate" inputMode="decimal" value={editTypeRate} onChange={(e) => setEditTypeRate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lt-term">Term (months)</Label>
                  <Input id="lt-term" inputMode="numeric" value={editTypeTerm} onChange={(e) => setEditTypeTerm(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editTypeActive}
                  onChange={(e) => setEditTypeActive(e.target.checked)}
                />
                Active (shown to members when applying)
              </label>
              <p className="text-xs text-slate-500">Members see this rate when they apply; only staff can change it here.</p>
              {typeFormError ? <p className="text-sm text-red-600">{typeFormError}</p> : null}
              <div className="flex gap-2">
                <Button type="button" onClick={() => saveLoanType.mutate()} disabled={saveLoanType.isPending}>
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setTypeModalOpen(false)}>
                  Cancel
                </Button>
              </div>
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
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loanTypes.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 font-medium text-navy">{t.name}</td>
                    <td className="px-4 py-2">{Number(t.default_rate)}%</td>
                    <td className="px-4 py-2">{t.default_term_months}</td>
                    <td className="px-4 py-2">{t.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-2 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => openLoanTypeModal(t)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loanTypes.length ? (
              <p className="p-6 text-sm text-slate-500">No loan types yet. Use Add loan type to create Regular or Product loan.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {section === 'reports' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Active loans" value={String(reportStats.activeCount)} icon={Wallet} />
            <KpiCard label="Outstanding" value={formatPeso(reportStats.outstanding)} icon={Wallet} />
            <KpiCard label="Principal disbursed" value={formatPeso(reportStats.totalPrincipal)} icon={Wallet} />
            <KpiCard label="Pending applications" value={String(reportStats.pendingApps)} icon={Wallet} />
            <KpiCard label="Due / overdue items" value={String(reportStats.overdueCount)} icon={Wallet} iconClassName="bg-amber-50 text-amber-700" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadPortfolioCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export portfolio CSV
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aging — schedules due or overdue</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {agingRows.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No overdue or due installments right now.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Loan</th>
                      <th className="px-4 py-2 text-left">Member</th>
                      <th className="px-4 py-2 text-left">Due date</th>
                      <th className="px-4 py-2 text-left">Amount due</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingRows.map((row, i) => {
                      const loan = row.loans
                      const m = loan?.members
                      const member = Array.isArray(m) ? m[0] : m
                      return (
                        <tr key={`${row.due_date}-${i}`} className="border-t">
                          <td className="px-4 py-2">{loan?.loan_number ?? '—'}</td>
                          <td className="px-4 py-2">{member ? `${member.full_name} (${member.member_code})` : '—'}</td>
                          <td className="px-4 py-2">{new Date(row.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">
                            <CurrencyDisplay amount={row.amount_due} />
                          </td>
                          <td className="px-4 py-2">{row.status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {(loans as []).length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No loans disbursed yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Loan</th>
                      <th className="px-4 py-2 text-left">Member</th>
                      <th className="px-4 py-2 text-left">Outstanding</th>
                      <th className="px-4 py-2 text-left">Rate</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loans as { loan_number: string; outstanding_principal: string; interest_rate: string; status: string; members: { full_name: string } | { full_name: string }[] | null }[]).map((row) => {
                      const m = row.members
                      const member = Array.isArray(m) ? m[0] : m
                      return (
                      <tr key={row.loan_number} className="border-t">
                        <td className="px-4 py-2">{row.loan_number}</td>
                        <td className="px-4 py-2">{member?.full_name ?? '—'}</td>
                        <td className="px-4 py-2">
                          <CurrencyDisplay amount={row.outstanding_principal} />
                        </td>
                        <td className="px-4 py-2">{Number(row.interest_rate)}%</td>
                        <td className="px-4 py-2">{row.status}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent repayments (loaded)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Total recorded on this page: <strong>{formatPeso(reportStats.repayTotal)}</strong>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!['applications', 'active', 'repayments', 'types', 'reports'].includes(section) ? (
        <EmptyState title={title} description="Choose a section from the Loans dashboard tabs." />
      ) : null}
    </div>
  )
}