import { BarChart3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatPeso } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function ReportsPage() {
  const [reportType, setReportType] = useState('Income Statement')

  const { data: stats } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => {
      const [
        { count: members },
        { data: collections },
        { data: fuel },
        { data: opex },
        { data: loans },
        { data: contrib },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('collection_transactions').select('total_amount, collected_at').eq('verification_status', 'confirmed'),
        supabase.from('fuel_transactions').select('total_cost, transaction_date'),
        supabase.from('operating_expenses').select('amount, expense_date'),
        supabase.from('loans').select('outstanding_principal, status').eq('status', 'active'),
        supabase.from('contributions').select('amount, contributed_at'),
      ])
      const sum = (rows: { total_amount?: string; amount?: string; total_cost?: string }[], key: 'total_amount' | 'amount' | 'total_cost') =>
        (rows ?? []).reduce((s, r) => s + Number(r[key] ?? 0), 0)
      const income = sum(collections ?? [], 'total_amount') + sum(contrib ?? [], 'amount')
      const expense = sum(fuel ?? [], 'total_cost') + sum(opex ?? [], 'amount')
      const loanBal = (loans ?? []).reduce((s, r) => s + Number((r as { outstanding_principal: string }).outstanding_principal), 0)

      const monthly = new Map<string, { income: number; expense: number }>()
      const touch = (d: string, kind: 'income' | 'expense', amt: number) => {
        const key = d.slice(0, 7)
        const row = monthly.get(key) ?? { income: 0, expense: 0 }
        row[kind] += amt
        monthly.set(key, row)
      }
      for (const c of collections ?? []) {
        touch((c as { collected_at: string }).collected_at, 'income', Number((c as { total_amount: string }).total_amount))
      }
      for (const c of contrib ?? []) {
        touch((c as { contributed_at: string }).contributed_at, 'income', Number((c as { amount: string }).amount))
      }
      for (const f of fuel ?? []) {
        touch((f as { transaction_date: string }).transaction_date, 'expense', Number((f as { total_cost: string }).total_cost))
      }
      for (const e of opex ?? []) {
        touch((e as { expense_date: string }).expense_date, 'expense', Number((e as { amount: string }).amount))
      }
      const trend = [...monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([key, v]) => ({
          month: new Date(key + '-01').toLocaleString('en-PH', { month: 'short' }),
          income: Math.round(v.income),
          expense: Math.round(v.expense),
        }))

      return {
        totalMembers: members ?? 0,
        income,
        expense,
        surplus: income - expense,
        loanBal,
        trend,
        fuelTotal: sum(fuel ?? [], 'total_cost'),
        maintenanceHint: sum(opex ?? [], 'amount'),
      }
    },
  })

  const expenseBreakdown = useMemo(() => {
    if (!stats) return []
    const total = stats.fuelTotal + stats.maintenanceHint || 1
    return [
      { name: 'Fuel', value: Math.round((stats.fuelTotal / total) * 100), color: '#1565c0' },
      { name: 'Operating', value: Math.round((stats.maintenanceHint / total) * 100), color: '#e53935' },
    ].filter((x) => x.value > 0)
  }, [stats])

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Live cooperative metrics from Supabase — no sample data."
        icon={<BarChart3 className="h-7 w-7" />}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <KpiCard label="Total income" value={formatPeso(stats?.income ?? 0)} icon={BarChart3} />
        <KpiCard label="Total expenses" value={formatPeso(stats?.expense ?? 0)} icon={BarChart3} />
        <KpiCard label="Net surplus" value={formatPeso(stats?.surplus ?? 0)} icon={BarChart3} iconClassName="bg-green-50 text-green-700" />
        <KpiCard label="Total members" value={String(stats?.totalMembers ?? '—')} icon={BarChart3} />
        <KpiCard label="Outstanding loans" value={formatPeso(stats?.loanBal ?? 0)} icon={BarChart3} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Select report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="h-10 w-full rounded-md border px-2 text-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option>Income Statement</option>
              <option>Operational Summary</option>
              <option>Loan Portfolio</option>
            </select>
            <p className="text-xs text-slate-500">
              Showing live <strong>{reportType}</strong> figures from collections, contributions, fuel, and expenses.
            </p>
            <Button className="w-full" variant="outline" onClick={() => window.print()}>
              Print / save PDF
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Income vs expenses (6 mo)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {(stats?.trend.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.trend}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatPeso(Number(v))} />
                  <Bar dataKey="income" fill="#43a047" name="Income" />
                  <Bar dataKey="expense" fill="#e53935" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500">Post collections or record expenses to see trends.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {expenseBreakdown.length ? (
              expenseBreakdown.map((e) => (
                <div key={e.name} className="flex justify-between">
                  <span>{e.name}</span>
                  <span>{e.value}%</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No operating expenses yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}