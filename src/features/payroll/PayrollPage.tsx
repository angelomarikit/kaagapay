import { useMemo, useState } from 'react'
import { Coins, Plus, UserPlus, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { formatPeso, parseMoneyInput } from '@/lib/money'
import { supabase } from '@/lib/supabase'

type EmployeeRow = {
  id: string
  full_name: string
  position: string | null
  department: string | null
  basic_salary: string | null
  status: string
  email: string | null
  hire_date: string | null
}

function clearEmployeeForm(setters: {
  setEmpName: (v: string) => void
  setEmpPosition: (v: string) => void
  setEmpSalary: (v: string) => void
  setEmpDepartment: (v: string) => void
  setEmpEmail: (v: string) => void
  setEmpContact: (v: string) => void
  setEmpBenefits: (v: string) => void
  setEmpHireDate: (v: string) => void
}) {
  setters.setEmpName('')
  setters.setEmpPosition('')
  setters.setEmpSalary('')
  setters.setEmpDepartment('')
  setters.setEmpEmail('')
  setters.setEmpContact('')
  setters.setEmpBenefits('')
  setters.setEmpHireDate('')
}

export function PayrollPage() {
  const qc = useQueryClient()
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [empName, setEmpName] = useState('')
  const [empPosition, setEmpPosition] = useState('')
  const [empSalary, setEmpSalary] = useState('')
  const [empDepartment, setEmpDepartment] = useState('')
  const [empEmail, setEmpEmail] = useState('')
  const [empContact, setEmpContact] = useState('')
  const [empBenefits, setEmpBenefits] = useState('')
  const [empHireDate, setEmpHireDate] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').order('full_name')
      if (error) throw error
      return (data ?? []) as EmployeeRow[]
    },
  })

  const { data: runs = [] } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll_runs').select('*').order('period_start', { ascending: false }).limit(20)
      if (error) throw error
      return data as {
        id: string
        period_start: string
        period_end: string
        status: string
        total_gross: string
        total_net: string
      }[]
    },
  })

  const employeeStats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'active')
    const monthlyPayroll = active.reduce((s, e) => s + Number(e.basic_salary ?? 0), 0)
    return { total: employees.length, active: active.length, monthlyPayroll }
  }, [employees])

  const addEmployee = useMutation({
    mutationFn: async () => {
      if (!empName.trim()) throw new Error('Name is required.')
      let salary: number | null = null
      if (empSalary.trim()) {
        salary = Number(parseMoneyInput(empSalary))
        if (!Number.isFinite(salary) || salary < 0) throw new Error('Enter a valid basic salary.')
      }
      const { error } = await supabase.from('employees').insert({
        full_name: empName.trim(),
        position: empPosition.trim() || null,
        department: empDepartment.trim() || null,
        email: empEmail.trim() || null,
        contact_number: empContact.trim() || null,
        benefits: empBenefits.trim() || null,
        hire_date: empHireDate || null,
        basic_salary: salary,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFormError(null)
      setShowEmployeeForm(false)
      clearEmployeeForm({
        setEmpName,
        setEmpPosition,
        setEmpSalary,
        setEmpDepartment,
        setEmpEmail,
        setEmpContact,
        setEmpBenefits,
        setEmpHireDate,
      })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const createPayroll = useMutation({
    mutationFn: async () => {
      if (!periodStart || !periodEnd) throw new Error('Period start and end are required.')
      if (periodEnd < periodStart) throw new Error('Period end must be on or after start.')
      const active = employees.filter((e) => e.status === 'active')
      if (!active.length) throw new Error('Add at least one active employee.')

      let totalGross = 0
      let totalNet = 0
      const items = active.map((e) => {
        const gross = Number(e.basic_salary ?? 0)
        totalGross += gross
        totalNet += gross
        return { employee_id: e.id, gross_pay: gross, deductions: 0, net_pay: gross }
      })

      const { data: run, error: runErr } = await supabase
        .from('payroll_runs')
        .insert({
          period_start: periodStart,
          period_end: periodEnd,
          status: 'draft',
          total_gross: totalGross,
          total_deductions: 0,
          total_net: totalNet,
        })
        .select('id')
        .single()
      if (runErr) throw runErr

      const { error: itemsErr } = await supabase.from('payroll_items').insert(
        items.map((i) => ({ ...i, payroll_run_id: run.id })),
      )
      if (itemsErr) throw itemsErr
    },
    onSuccess: () => {
      setPeriodStart('')
      setPeriodEnd('')
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })

  const approveRun = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'draft')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Benefits"
        description="Employee records with position, benefits, and payroll runs."
        icon={<Coins className="h-7 w-7" />}
        actions={
          <Button
            type="button"
            onClick={() => {
              setFormError(null)
              setShowEmployeeForm(true)
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add employee
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Employees" value={String(employeeStats.total)} hint={`${employeeStats.active} active`} icon={Users} />
        <KpiCard
          label="Active headcount"
          value={String(employeeStats.active)}
          icon={UserPlus}
          iconClassName="bg-green-50 text-green-700"
        />
        <KpiCard
          label="Monthly basic pay"
          value={formatPeso(employeeStats.monthlyPayroll)}
          hint="Sum of active salaries"
          icon={Coins}
          iconClassName="bg-amber-50 text-amber-700"
        />
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="payroll">Payroll runs</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <CardTitle className="text-base text-navy">Employee directory</CardTitle>
              <p className="text-sm text-slate-500">Contact, department, and compensation records.</p>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEmp ? (
                <p className="p-6 text-sm text-slate-500">Loading…</p>
              ) : employees.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No employees yet"
                    description="Add your first employee to generate payroll runs."
                    action={
                      <Button type="button" onClick={() => setShowEmployeeForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add employee
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="bg-navy text-white">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Position</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Department</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Salary</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.map((e) => (
                        <tr key={e.id} className="transition-colors hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="font-medium text-navy">{e.full_name}</p>
                            {e.email ? <p className="text-xs text-slate-500">{e.email}</p> : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{e.position ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{e.department ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            <CurrencyDisplay amount={e.basic_salary ?? '0'} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={e.status === 'active' ? 'success' : 'default'}>{e.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base text-navy">Create payroll run</CardTitle>
              <p className="text-sm text-slate-500">Build a draft from all active employees’ basic salary.</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="pay-start">Period start</Label>
                  <Input id="pay-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-end">Period end</Label>
                  <Input id="pay-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => createPayroll.mutate()}
                  disabled={createPayroll.isPending}
                >
                  Generate draft
                </Button>
              </div>
              {createPayroll.error ? (
                <p className="mt-3 text-sm text-red-600">{(createPayroll.error as Error).message}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base text-navy">Payroll history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {runs.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No payroll runs yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-navy text-white">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Period</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Gross</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Net</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/90">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/90">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {runs.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {r.period_start} → {r.period_end}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={r.total_gross} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay amount={r.total_net} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={r.status === 'approved' ? 'success' : 'warning'}>{r.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.status === 'draft' ? (
                              <Button size="sm" variant="outline" onClick={() => approveRun.mutate(r.id)} disabled={approveRun.isPending}>
                                Approve
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showEmployeeForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-xl">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <CardTitle className="text-lg text-navy">Add employee</CardTitle>
              <p className="text-sm text-slate-500">Fields marked with * are required.</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {formError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="emp-name">Full name *</Label>
                  <Input id="emp-name" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Juan Dela Cruz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-position">Position</Label>
                  <Input id="emp-position" value={empPosition} onChange={(e) => setEmpPosition(e.target.value)} placeholder="Driver" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-dept">Department</Label>
                  <Input id="emp-dept" value={empDepartment} onChange={(e) => setEmpDepartment(e.target.value)} placeholder="Transport" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-salary">Basic salary (₱)</Label>
                  <Input
                    id="emp-salary"
                    inputMode="decimal"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-hire">Hire date</Label>
                  <Input id="emp-hire" type="date" value={empHireDate} onChange={(e) => setEmpHireDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-email">Email</Label>
                  <Input id="emp-email" type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="name@coop.ph" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-contact">Contact number</Label>
                  <Input id="emp-contact" value={empContact} onChange={(e) => setEmpContact(e.target.value)} placeholder="09XX XXX XXXX" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="emp-benefits">Benefits</Label>
                  <Input
                    id="emp-benefits"
                    value={empBenefits}
                    onChange={(e) => setEmpBenefits(e.target.value)}
                    placeholder="SSS, PhilHealth, Pag-IBIG, allowance…"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEmployeeForm(false)
                    setFormError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={addEmployee.isPending} onClick={() => addEmployee.mutate()}>
                  Save employee
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}