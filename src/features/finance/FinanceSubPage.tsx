import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { BookOpen, CalendarDays, FileStack, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { formatPeso } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { BudgetExpensesSection } from '@/features/finance/BudgetExpensesSection'

const meta: Record<string, { title: string; description: string }> = {
  'general-ledger': {
    title: 'General Ledger',
    description: 'Posted journals from collections, contributions, loans, payroll, and payables.',
  },
  'accounts-payable': { title: 'Accounts Payable', description: 'Vendor obligations and supplier invoices.' },
  'accounts-receivable': {
    title: 'Accounts Receivable',
    description: 'Loan repayments and verified POS collections.',
  },
  'cash-bank': { title: 'Cash & Bank', description: 'Cash and bank GL-linked accounts.' },
  reports: { title: 'Financial Reports', description: 'Income, expense, and balance summaries from posted journals.' },
  budget: { title: 'Budget & Expenses', description: 'Budget lines vs actual operating spend.' },
}

type GlBucket = { key: string; label: string; match?: RegExp }

const GL_BUCKETS: GlBucket[] = [
  { key: 'all', label: 'All posted' },
  { key: 'payable', label: 'Payables', match: /payable|supplier|ap/i },
  { key: 'loan', label: 'Loans', match: /loan|repayment|lending/i },
  { key: 'salary', label: 'Salary / payroll', match: /payroll|salary|wage|benefit/i },
]

type GlJournal = {
  id: string
  reference: string
  description: string | null
  entry_date: string
  source_type: string | null
  posted_at: string | null
}

function journalMatchesBucket(j: GlJournal, bucket: GlBucket): boolean {
  if (bucket.key === 'all') return true
  if (!bucket.match) return true
  const haystack = `${j.description ?? ''} ${j.source_type ?? ''}`
  return bucket.match.test(haystack)
}

function formatGlDate(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatSourceLabel(source: string | null) {
  if (!source) return 'General'
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function sourceBadgeVariant(source: string | null): 'default' | 'success' | 'warning' | 'info' | 'purple' {
  const s = (source ?? '').toLowerCase()
  if (s.includes('contribution')) return 'success'
  if (s.includes('loan') || s.includes('repayment')) return 'info'
  if (s.includes('payroll') || s.includes('salary') || s.includes('wage')) return 'purple'
  if (s.includes('payable') || s.includes('supplier')) return 'warning'
  if (s.includes('collection') || s.includes('pos')) return 'info'
  return 'default'
}

export function FinanceSubPage() {
  const { section = 'general-ledger' } = useParams()
  const cfg = meta[section] ?? meta['general-ledger']
  const [glBucket, setGlBucket] = useState('all')
  const [glSearch, setGlSearch] = useState('')

  const { data: glData } = useQuery({
    queryKey: ['finance-gl'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('id, reference, description, entry_date, status, source_type, posted_at')
        .eq('status', 'posted')
        .order('entry_date', { ascending: false })
        .limit(100)
      if (error) throw error
      const journals = (data ?? []) as GlJournal[]
      const totalsById: Record<string, { debit: number; credit: number }> = {}
      if (journals.length) {
        const { data: lines, error: lineErr } = await supabase
          .from('journal_lines')
          .select('journal_entry_id, debit, credit')
          .in(
            'journal_entry_id',
            journals.map((j) => j.id),
          )
        if (lineErr) throw lineErr
        for (const line of lines ?? []) {
          const l = line as { journal_entry_id: string; debit: string; credit: string }
          const cur = totalsById[l.journal_entry_id] ?? { debit: 0, credit: 0 }
          cur.debit += Number(l.debit)
          cur.credit += Number(l.credit)
          totalsById[l.journal_entry_id] = cur
        }
      }
      return { journals, totalsById }
    },
    enabled: section === 'general-ledger',
  })

  const journals = glData?.journals ?? []
  const glTotalsById = glData?.totalsById ?? {}

  const glFiltered = useMemo(() => {
    const bucket = GL_BUCKETS.find((b) => b.key === glBucket) ?? GL_BUCKETS[0]
    const q = glSearch.trim().toLowerCase()
    return journals.filter((j) => {
      if (!journalMatchesBucket(j, bucket)) return false
      if (!q) return true
      return (
        j.reference.toLowerCase().includes(q) ||
        (j.description ?? '').toLowerCase().includes(q) ||
        (j.source_type ?? '').toLowerCase().includes(q)
      )
    })
  }, [journals, glBucket, glSearch])

  const glMtdCount = useMemo(() => {
    const now = new Date()
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return journals.filter((j) => j.entry_date.startsWith(prefix)).length
  }, [journals])

  const { data: payables = [] } = useQuery({
    queryKey: ['finance-ap'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts_payable').select('*').order('due_date', { ascending: true }).limit(50)
      if (error) throw error
      return data as Record<string, unknown>[]
    },
    enabled: section === 'accounts-payable',
  })

  const { data: receivables } = useQuery({
    queryKey: ['finance-ar'],
    queryFn: async () => {
      const [repayments, collections] = await Promise.all([
        supabase
          .from('loan_repayments')
          .select('id, amount, paid_at, receipt_reference, loans(loan_number, members(full_name))')
          .order('paid_at', { ascending: false })
          .limit(40),
        supabase
          .from('collection_transactions')
          .select('id, receipt_number, total_amount, collected_at, verification_status')
          .eq('verification_status', 'confirmed')
          .order('collected_at', { ascending: false })
          .limit(40),
      ])
      if (repayments.error) throw repayments.error
      if (collections.error) throw collections.error
      return {
        loanPayments: repayments.data ?? [],
        posCollections: collections.data ?? [],
      }
    },
    enabled: section === 'accounts-receivable',
  })

  const { data: reportSummary } = useQuery({
    queryKey: ['finance-report-summary'],
    queryFn: async () => {
      const [{ data: coa }, { data: entries }] = await Promise.all([
        supabase.from('chart_of_accounts').select('id, account_type'),
        supabase.from('journal_entries').select('id').eq('status', 'posted'),
      ])
      if (!entries?.length) return { income: 0, expense: 0, assets: 0, liabilities: 0 }
      const typeById = new Map((coa ?? []).map((a) => [(a as { id: string }).id, (a as { account_type: string }).account_type]))
      const { data: lines, error } = await supabase
        .from('journal_lines')
        .select('journal_entry_id, account_id, debit, credit')
        .in('journal_entry_id', entries.map((e) => (e as { id: string }).id))
      if (error) throw error
      let income = 0
      let expense = 0
      let assets = 0
      let liabilities = 0
      for (const line of lines ?? []) {
        const l = line as { account_id: string; debit: string; credit: string }
        const t = typeById.get(l.account_id)
        const d = Number(l.debit)
        const c = Number(l.credit)
        if (t === 'income') income += c - d
        if (t === 'expense') expense += d - c
        if (t === 'asset') assets += d - c
        if (t === 'liability') liabilities += c - d
      }
      return { income, expense, assets, liabilities }
    },
    enabled: section === 'reports',
  })

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['finance-cash'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cash_bank_accounts').select('*')
      if (error) throw error
      return data
    },
    enabled: section === 'cash-bank',
  })

  return (
    <div>
      {section === 'budget' ? null : <PageHeader title={cfg.title} description={cfg.description} />}

      {section === 'general-ledger' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Posted entries" value={String(journals.length)} hint="Latest 100 journals" icon={BookOpen} />
            <KpiCard label="This month" value={String(glMtdCount)} hint="By entry date" icon={CalendarDays} iconClassName="bg-green-50 text-green-700" />
            <KpiCard
              label="In view"
              value={String(glFiltered.length)}
              hint={glSearch || glBucket !== 'all' ? 'Filtered list' : 'All sources'}
              icon={FileStack}
              iconClassName="bg-red-50 text-brand-red"
            />
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="space-y-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-lg text-navy">Posted journals</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Double-entry postings from operations modules. Use filters to focus payables, loans, or payroll.
                  </p>
                </div>
                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={glSearch}
                    onChange={(e) => setGlSearch(e.target.value)}
                    placeholder="Search reference, description, source…"
                    className="border-slate-200 bg-white pl-9 shadow-sm"
                  />
                </div>
              </div>
              <Tabs value={glBucket} onValueChange={setGlBucket}>
                <TabsList className="h-auto flex-wrap justify-start gap-1 p-1">
                  {GL_BUCKETS.map((b) => (
                    <TabsTrigger key={b.key} value={b.key} className="data-[state=active]:shadow-sm">
                      {b.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {!journals.length ? (
                <div className="p-6">
                  <EmptyState
                    title="No posted journals yet"
                    description="When collections, contributions, loans, or payroll post to the GL, they will appear here with debit and credit totals."
                  />
                </div>
              ) : glFiltered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No matches"
                    description="Try another filter or clear your search to see more entries."
                    action={
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-blue hover:underline"
                        onClick={() => {
                          setGlBucket('all')
                          setGlSearch('')
                        }}
                      >
                        Reset filters
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-navy text-white">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Source</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {glFiltered.map((j) => {
                        const totals = glTotalsById[j.id]
                        const source = j.source_type
                        return (
                          <tr key={j.id} className="transition-colors hover:bg-slate-50/80">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatGlDate(j.entry_date)}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{j.reference}</td>
                            <td className="max-w-xs px-4 py-3 text-slate-700">{j.description ?? '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={sourceBadgeVariant(source)}>{formatSourceLabel(source)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                              {totals ? <CurrencyDisplay amount={String(totals.debit)} /> : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                              {totals ? <CurrencyDisplay amount={String(totals.credit)} /> : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
                    Showing {glFiltered.length} of {journals.length} loaded entries · Status: posted
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === 'accounts-receivable' && receivables ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loan repayments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {receivables.loanPayments.map((r) => {
                const row = r as unknown as { id: string; amount: string; paid_at: string; loans: { loan_number: string } | null }
                return (
                  <div key={row.id} className="flex justify-between border-b pb-2">
                    <span>{row.loans?.loan_number ?? 'Loan'} · {new Date(row.paid_at).toLocaleDateString()}</span>
                    <CurrencyDisplay amount={row.amount} />
                  </div>
                )
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">POS collections (confirmed)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {receivables.posCollections.map((r) => {
                const row = r as { id: string; receipt_number: string | null; total_amount: string; collected_at: string }
                return (
                  <div key={row.id} className="flex justify-between border-b pb-2">
                    <span>{row.receipt_number ?? 'POS'} · {new Date(row.collected_at).toLocaleDateString()}</span>
                    <CurrencyDisplay amount={row.total_amount} />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === 'accounts-payable' ? (
        <LedgerTable rows={payables} empty="No payables recorded." />
      ) : null}

      {section === 'cash-bank' ? (
        <LedgerTable rows={cashAccounts as Record<string, unknown>[]} empty="No cash/bank accounts." />
      ) : null}

      {section === 'budget' ? <BudgetExpensesSection /> : null}

      {section === 'reports' && reportSummary ? (
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Income (posted GL)</p>
              <p className="text-xl font-bold text-navy">{formatPeso(reportSummary.income)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Expenses</p>
              <p className="text-xl font-bold text-navy">{formatPeso(reportSummary.expense)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Net</p>
              <p className="text-xl font-bold text-green-700">{formatPeso(reportSummary.income - reportSummary.expense)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Assets / Liabilities</p>
              <p className="text-sm font-medium text-navy">
                {formatPeso(reportSummary.assets)} / {formatPeso(reportSummary.liabilities)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function LedgerTable({ rows, empty }: { rows: Record<string, unknown>[]; empty: string }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                {Object.entries(row)
                  .slice(0, 6)
                  .map(([k, v]) => (
                    <td key={k} className="px-4 py-2">
                      <div className="text-xs text-slate-400">{k}</div>
                      {typeof v === 'number' || (typeof v === 'string' && /^\d+\.\d+$/.test(v)) ? (
                        <CurrencyDisplay amount={String(v)} />
                      ) : (
                        String(v ?? '—')
                      )}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-6 text-sm text-slate-500">{empty}</p> : null}
      </CardContent>
    </Card>
  )
}