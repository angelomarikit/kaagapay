import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calculator, PieChart, Plus, Receipt, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { formatPeso, parseMoneyInput } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type BudgetRow = {
  id: string
  name: string
  period_start: string
  period_end: string
  department: string | null
  category: string | null
  budget_amount: string
  actual_amount: string
}

type ExpenseRow = {
  id: string
  reference_number: string
  expense_category: string
  description: string | null
  amount: string
  expense_date: string
}

const EXPENSE_CATEGORIES = ['operating', 'maintenance', 'administrative', 'utilities', 'payroll', 'other'] as const

function expenseInBudgetPeriod(e: ExpenseRow, b: BudgetRow) {
  if (e.expense_date < b.period_start || e.expense_date > b.period_end) return false
  if (b.category && b.category.trim()) {
    return e.expense_category.toLowerCase() === b.category.toLowerCase()
  }
  return true
}

function actualSpendForBudget(b: BudgetRow, expenses: ExpenseRow[]) {
  return expenses.filter((e) => expenseInBudgetPeriod(e, b)).reduce((s, e) => s + Number(e.amount), 0)
}

function utilizationPct(budget: number, actual: number) {
  if (budget <= 0) return actual > 0 ? 100 : 0
  return Math.min(150, Math.round((actual / budget) * 100))
}

function nextExpenseRef() {
  const y = new Date().getFullYear()
  return `EXP-${y}-${Math.floor(Math.random() * 9000) + 1000}`
}

function defaultPeriod() {
  const now = new Date()
  const y = now.getFullYear()
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

export function BudgetExpensesSection() {
  const qc = useQueryClient()
  const period = defaultPeriod()

  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [bName, setBName] = useState('')
  const [bStart, setBStart] = useState(period.start)
  const [bEnd, setBEnd] = useState(period.end)
  const [bDept, setBDept] = useState('')
  const [bCategory, setBCategory] = useState('')
  const [bAmount, setBAmount] = useState('')

  const [expBudgetId, setExpBudgetId] = useState('')
  const [expCategory, setExpCategory] = useState<string>('operating')
  const [expDescription, setExpDescription] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['finance-budget'],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*').order('period_start', { ascending: false }).limit(50)
      if (error) throw error
      return (data ?? []) as BudgetRow[]
    },
  })

  const { data: expenses = [] } = useQuery({
    queryKey: ['finance-budget-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operating_expenses')
        .select('id, reference_number, expense_category, description, amount, expense_date')
        .order('expense_date', { ascending: false })
        .limit(120)
      if (error) throw error
      return (data ?? []) as ExpenseRow[]
    },
  })

  const budgetLines = useMemo(
    () =>
      budgets.map((b) => {
        const budgetAmt = Number(b.budget_amount)
        const actual = actualSpendForBudget(b, expenses)
        const remaining = budgetAmt - actual
        const pct = utilizationPct(budgetAmt, actual)
        return { ...b, budgetAmt, actual, remaining, pct }
      }),
    [budgets, expenses],
  )

  const totals = useMemo(() => {
    const totalBudget = budgetLines.reduce((s, b) => s + b.budgetAmt, 0)
    const totalActual = budgetLines.reduce((s, b) => s + b.actual, 0)
    return { totalBudget, totalActual, variance: totalBudget - totalActual }
  }, [budgetLines])

  const chartData = useMemo(
    () =>
      budgetLines.slice(0, 8).map((b) => ({
        name: b.name.length > 14 ? `${b.name.slice(0, 14)}…` : b.name,
        Budget: Math.round(b.budgetAmt),
        Actual: Math.round(b.actual),
      })),
    [budgetLines],
  )

  const saveBudget = useMutation({
    mutationFn: async () => {
      const amt = Number(parseMoneyInput(bAmount))
      const name = bName.trim()
      if (!name) throw new Error('Budget name is required.')
      if (!bAmount.trim() || amt <= 0) throw new Error('Enter a valid budget amount.')
      if (bEnd < bStart) throw new Error('Period end must be on or after start.')
      const { error } = await supabase.from('budgets').insert({
        name,
        period_start: bStart,
        period_end: bEnd,
        department: bDept.trim() || null,
        category: bCategory.trim() || null,
        budget_amount: parseMoneyInput(bAmount),
        actual_amount: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFormError(null)
      setShowBudgetForm(false)
      setBName('')
      setBAmount('')
      setBDept('')
      setBCategory('')
      qc.invalidateQueries({ queryKey: ['finance-budget'] })
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const saveExpense = useMutation({
    mutationFn: async () => {
      const amt = Number(parseMoneyInput(expAmount))
      if (!amt || amt <= 0) throw new Error('Enter a valid amount.')
      const { error } = await supabase.from('operating_expenses').insert({
        reference_number: nextExpenseRef(),
        vehicle_id: null,
        expense_category: expCategory,
        description: expDescription.trim() || null,
        amount: parseMoneyInput(expAmount),
        expense_date: expDate,
      })
      if (error) throw error

      if (expBudgetId) {
        const line = budgets.find((b) => b.id === expBudgetId)
        if (line) {
          const nextActual = Number(line.actual_amount) + amt
          const { error: upErr } = await supabase.from('budgets').update({ actual_amount: nextActual }).eq('id', expBudgetId)
          if (upErr) throw upErr
        }
      }
    },
    onSuccess: () => {
      setFormError(null)
      setShowExpenseForm(false)
      setExpAmount('')
      setExpDescription('')
      setExpBudgetId('')
      qc.invalidateQueries({ queryKey: ['finance-budget-expenses'] })
      qc.invalidateQueries({ queryKey: ['finance-budget'] })
      qc.invalidateQueries({ queryKey: ['operating-expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (e: Error) => setFormError(e.message),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget & Expenses"
        description="Budget lines vs actual operating spend."
        icon={<Calculator className="h-7 w-7" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => { setFormError(null); setShowBudgetForm(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add budget
            </Button>
            <Button type="button" variant="outline" onClick={() => { setFormError(null); setShowExpenseForm(true) }}>
              <Receipt className="mr-2 h-4 w-4" />
              Record expense
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total budget" value={formatPeso(totals.totalBudget)} hint="All active lines" icon={Wallet} />
        <KpiCard
          label="Actual spend"
          value={formatPeso(totals.totalActual)}
          hint="Expenses in each line’s period"
          icon={Receipt}
          iconClassName="bg-amber-50 text-amber-700"
        />
        <KpiCard
          label="Remaining"
          value={formatPeso(totals.variance)}
          hint={totals.variance < 0 ? 'Over budget' : 'Under budget'}
          icon={PieChart}
          iconClassName={totals.variance < 0 ? 'bg-red-50 text-brand-red' : 'bg-green-50 text-green-700'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <CardTitle className="text-base text-navy">Budget vs actual</CardTitle>
            <p className="text-sm text-slate-500">Compare planned amounts to recorded operating expenses.</p>
          </CardHeader>
          <CardContent className="pt-6">
            {chartData.length === 0 ? (
              <EmptyState
                title="No budget lines yet"
                description="Add a budget line to see bars comparing plan vs spend."
              />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => formatPeso(Number(v ?? 0))} />
                    <Legend />
                    <Bar dataKey="Budget" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base text-navy">Utilization by line</CardTitle>
            <p className="text-sm text-slate-500">Green under 85%, amber 85–100%, red over budget.</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {budgetLines.length === 0 ? (
              <p className="text-sm text-slate-500">Create budget lines to track utilization.</p>
            ) : (
              budgetLines.map((b) => (
                <div key={b.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-navy">{b.name}</p>
                      <p className="text-xs text-slate-500">
                        {b.period_start} → {b.period_end}
                        {b.category ? ` · ${b.category}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <CurrencyDisplay amount={String(b.actual)} />
                      <span className="text-slate-400"> / </span>
                      <CurrencyDisplay amount={String(b.budgetAmt)} />
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        b.pct > 100 ? 'bg-brand-red' : b.pct >= 85 ? 'bg-amber-500' : 'bg-green-600',
                      )}
                      style={{ width: `${Math.min(100, b.pct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{b.pct}% used · {formatPeso(b.remaining)} remaining</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base text-navy">Budget lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {budgetsLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : budgetLines.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No budget lines"
                description="Use Add budget to set department or category limits for the year."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Dept / category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Budget</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetLines.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-navy">{b.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {b.period_start} – {b.period_end}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {[b.department, b.category].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CurrencyDisplay amount={String(b.budgetAmt)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CurrencyDisplay amount={String(b.actual)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={b.pct > 100 ? 'danger' : b.pct >= 85 ? 'warning' : 'success'}>
                          {b.pct > 100 ? 'Over' : b.pct >= 85 ? 'Near limit' : 'On track'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base text-navy">Recent operating expenses</CardTitle>
          <p className="text-sm text-slate-500">Includes fleet entries; matched to budgets by date and category.</p>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No expenses recorded yet. Use Record expense or Fleet → Fuel & Expense.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 25).map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-2">{e.expense_date}</td>
                      <td className="px-4 py-2 font-mono text-xs">{e.reference_number}</td>
                      <td className="px-4 py-2">
                        <Badge variant="default">{e.expense_category}</Badge>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-slate-600">{e.description ?? '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <CurrencyDisplay amount={e.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showBudgetForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-navy">Add budget line</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              <div className="space-y-2">
                <Label htmlFor="b-name">Name</Label>
                <Input id="b-name" value={bName} onChange={(e) => setBName(e.target.value)} placeholder="e.g. Fleet maintenance 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="b-start">Period start</Label>
                  <Input id="b-start" type="date" value={bStart} onChange={(e) => setBStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-end">Period end</Label>
                  <Input id="b-end" type="date" value={bEnd} onChange={(e) => setBEnd(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="b-dept">Department</Label>
                  <Input id="b-dept" value={bDept} onChange={(e) => setBDept(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-cat">Category (matches expenses)</Label>
                  <Input id="b-cat" value={bCategory} onChange={(e) => setBCategory(e.target.value)} placeholder="e.g. maintenance" list="budget-cat-suggest" />
                  <datalist id="budget-cat-suggest">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-amt">Budget amount (₱)</Label>
                <Input id="b-amt" value={bAmount} onChange={(e) => setBAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowBudgetForm(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={saveBudget.isPending} onClick={() => saveBudget.mutate()}>
                  Save budget
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showExpenseForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-navy">Record expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              <div className="space-y-2">
                <Label htmlFor="exp-budget">Apply to budget line (optional)</Label>
                <select
                  id="exp-budget"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={expBudgetId}
                  onChange={(e) => setExpBudgetId(e.target.value)}
                >
                  <option value="">Auto-match by category &amp; date</option>
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-cat">Category</Label>
                <select
                  id="exp-cat"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-desc">Description</Label>
                <Input id="exp-desc" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} placeholder="What was purchased or paid" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="exp-amt">Amount (₱)</Label>
                  <Input id="exp-amt" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} inputMode="decimal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-date">Expense date</Label>
                  <Input id="exp-date" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={saveExpense.isPending} onClick={() => saveExpense.mutate()}>
                  Save expense
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}