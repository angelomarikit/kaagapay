import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { formatPeso } from '@/lib/money'
import { supabase } from '@/lib/supabase'

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

export function FinanceSubPage() {
  const { section = 'general-ledger' } = useParams()
  const cfg = meta[section] ?? meta['general-ledger']

  const { data: journals = [] } = useQuery({
    queryKey: ['finance-gl'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('id, reference, description, entry_date, status, source_type, posted_at')
        .eq('status', 'posted')
        .order('entry_date', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as {
        id: string
        reference: string
        description: string | null
        entry_date: string
        source_type: string | null
        posted_at: string | null
      }[]
    },
    enabled: section === 'general-ledger',
  })

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

  const { data: budgets = [] } = useQuery({
    queryKey: ['finance-budget'],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*').limit(50)
      if (error) throw error
      return data
    },
    enabled: section === 'budget',
  })

  return (
    <div>
      <PageHeader title={cfg.title} description={cfg.description} />

      {section === 'general-ledger' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {GL_BUCKETS.map((b) => (
              <span key={b.key} className="rounded-md border bg-white px-3 py-1 text-slate-600">
                {b.label}
              </span>
            ))}
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((j) => {
                    const bucket =
                      GL_BUCKETS.find((b) => b.match && (j.description?.match(b.match) || j.source_type?.match(b.match)))
                        ?.label ?? 'General'
                    return (
                      <tr key={j.id} className="border-t">
                        <td className="px-4 py-2">{j.entry_date}</td>
                        <td className="px-4 py-2">{j.reference}</td>
                        <td className="px-4 py-2">{j.description ?? '—'}</td>
                        <td className="px-4 py-2">{j.source_type ?? bucket}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!journals.length ? <p className="p-6 text-sm text-slate-500">No posted journals yet.</p> : null}
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

      {section === 'budget' ? (
        <LedgerTable rows={budgets as Record<string, unknown>[]} empty="No budget lines." />
      ) : null}

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