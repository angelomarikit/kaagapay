import { useMemo } from 'react'
import { Calculator } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPeso } from '@/lib/money'
import { supabase } from '@/lib/supabase'

type CoaRow = { id: string; account_type: string }
type EntryRow = { id: string; entry_date: string }
type LineRow = { journal_entry_id: string; account_id: string; debit: string; credit: string }

function monthKey(d: string) {
  return d.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-PH', { month: 'short' })
}

export function FinanceDashboardPage() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['cash-bank-balances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cash_bank_accounts').select('*')
      if (error) throw error
      return data
    },
  })

  const { data: financeStats } = useQuery({
    queryKey: ['finance-dashboard-stats'],
    queryFn: async () => {
      const [{ data: coa, error: coaErr }, { data: entries, error: entErr }] = await Promise.all([
        supabase.from('chart_of_accounts').select('id, account_type'),
        supabase.from('journal_entries').select('id, entry_date').eq('status', 'posted'),
      ])
      if (coaErr) throw coaErr
      if (entErr) throw entErr

      const typeById = new Map((coa as CoaRow[]).map((a) => [a.id, a.account_type]))
      const entryDates = new Map((entries as EntryRow[]).map((e) => [e.id, e.entry_date]))
      const entryIds = [...entryDates.keys()]

      if (!entryIds.length) {
        return {
          hasJournals: false,
          assets: 0,
          liabilities: 0,
          equity: 0,
          incomeMtd: 0,
          expenseMtd: 0,
          trend: [] as { month: string; income: number; expense: number }[],
        }
      }

      const { data: lines, error: lineErr } = await supabase
        .from('journal_lines')
        .select('journal_entry_id, account_id, debit, credit')
        .in('journal_entry_id', entryIds)
      if (lineErr) throw lineErr

      const now = new Date()
      const mtdKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      let assets = 0
      let liabilities = 0
      let equity = 0
      let incomeMtd = 0
      let expenseMtd = 0

      const monthly = new Map<string, { income: number; expense: number }>()

      for (const line of (lines ?? []) as LineRow[]) {
        const acctType = typeById.get(line.account_id)
        const entryDate = entryDates.get(line.journal_entry_id)
        if (!acctType || !entryDate) continue

        const debit = Number(line.debit)
        const credit = Number(line.credit)
        const mk = monthKey(entryDate)

        if (!monthly.has(mk)) monthly.set(mk, { income: 0, expense: 0 })

        if (acctType === 'asset') assets += debit - credit
        if (acctType === 'liability') liabilities += credit - debit
        if (acctType === 'equity') equity += credit - debit
        if (acctType === 'income') {
          monthly.get(mk)!.income += credit - debit
          if (monthKey(entryDate) === mtdKey) incomeMtd += credit - debit
        }
        if (acctType === 'expense') {
          monthly.get(mk)!.expense += debit - credit
          if (monthKey(entryDate) === mtdKey) expenseMtd += debit - credit
        }
      }

      const sortedMonths = [...monthly.keys()].sort().slice(-6)
      const trend = sortedMonths.map((key) => ({
        month: monthLabel(key),
        income: Math.round(monthly.get(key)!.income),
        expense: Math.round(monthly.get(key)!.expense),
      }))

      return {
        hasJournals: true,
        assets,
        liabilities,
        equity,
        incomeMtd,
        expenseMtd,
        trend,
      }
    },
  })

  const kpis = useMemo(
    () => ({
      assets: financeStats?.assets ?? 0,
      liabilities: financeStats?.liabilities ?? 0,
      equity: financeStats?.equity ?? 0,
      incomeMtd: financeStats?.incomeMtd ?? 0,
      expenseMtd: financeStats?.expenseMtd ?? 0,
    }),
    [financeStats],
  )

  const hasTrend = (financeStats?.trend.length ?? 0) > 0

  return (
    <div>
      <PageHeader
        title="Accounting & Finance"
        description="Record and manage financial transactions, payables, receivables, and reports."
        icon={<Calculator className="h-7 w-7" />}
        actions={
          <Button asChild>
            <Link to="/admin/finance/general-ledger">View ledger</Link>
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <KpiCard label="Total Assets" value={formatPeso(kpis.assets)} icon={Calculator} />
        <KpiCard label="Total Liabilities" value={formatPeso(kpis.liabilities)} icon={Calculator} />
        <KpiCard label="Total Equity" value={formatPeso(kpis.equity)} icon={Calculator} />
        <KpiCard label="Income (MTD)" value={formatPeso(kpis.incomeMtd)} icon={Calculator} />
        <KpiCard label="Expenses (MTD)" value={formatPeso(kpis.expenseMtd)} icon={Calculator} />
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="dashboard">Finance Dashboard</TabsTrigger>
          <TabsTrigger value="gl" asChild>
            <Link to="/admin/finance/general-ledger">General Ledger</Link>
          </TabsTrigger>
          <TabsTrigger value="ap" asChild>
            <Link to="/admin/finance/accounts-payable">Accounts Payable</Link>
          </TabsTrigger>
          <TabsTrigger value="ar" asChild>
            <Link to="/admin/finance/accounts-receivable">Accounts Receivable</Link>
          </TabsTrigger>
          <TabsTrigger value="cash" asChild>
            <Link to="/admin/finance/cash-bank">Cash & Bank</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income & Expense Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {hasTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeStats!.trend}>
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => formatPeso(v)} width={72} />
                  <Tooltip formatter={(v) => formatPeso(Number(v ?? 0))} />
                  <Bar dataKey="income" fill="#1565c0" name="Income" />
                  <Bar dataKey="expense" fill="#ab47bc" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No posted journal activity"
                description="Charts use posted journal entries. Post collections or contributions (with chart accounts seeded) to see income and expenses here."
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash & Bank Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((a) => {
              const row = a as { id: string; name: string; current_balance: string }
              return (
                <div key={row.id} className="flex justify-between rounded-lg border p-3 text-sm">
                  <span>{row.name}</span>
                  <strong>{formatPeso(row.current_balance)}</strong>
                </div>
              )
            })}
            {!accounts.length ? (
              <p className="text-sm text-slate-500">Run migration 014 for cash accounts or add one under Settings → Bank Accounts.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}