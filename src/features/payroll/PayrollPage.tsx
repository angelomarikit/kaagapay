import { useState } from 'react'
import { Coins } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'

export function PayrollPage() {
  const qc = useQueryClient()
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
      return data as { id: string; full_name: string; position: string | null; basic_salary: string | null; status: string }[]
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

  const addEmployee = useMutation({
    mutationFn: async () => {
      const salary = Number(empSalary)
      if (!empName.trim()) throw new Error('Name is required.')
      const { error } = await supabase.from('employees').insert({
        full_name: empName.trim(),
        position: empPosition.trim() || null,
        department: empDepartment.trim() || null,
        email: empEmail.trim() || null,
        contact_number: empContact.trim() || null,
        benefits: empBenefits.trim() || null,
        hire_date: empHireDate || null,
        basic_salary: Number.isFinite(salary) ? salary : null,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setEmpName('')
      setEmpPosition('')
      setEmpSalary('')
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })

  const createPayroll = useMutation({
    mutationFn: async () => {
      if (!periodStart || !periodEnd) throw new Error('Period start and end are required.')
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
    <div>
      <PageHeader
        title="Payroll & Benefits"
        description="Employee records with position, benefits, and payroll runs."
        icon={<Coins className="h-7 w-7" />}
      />
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="payroll">Payroll runs</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add employee</CardTitle>
            </CardHeader>
            <CardContent className="grid max-w-3xl gap-4 md:grid-cols-2">
              <Input placeholder="Full name *" value={empName} onChange={(e) => setEmpName(e.target.value)} />
              <Input placeholder="Position" value={empPosition} onChange={(e) => setEmpPosition(e.target.value)} />
              <Input placeholder="Department" value={empDepartment} onChange={(e) => setEmpDepartment(e.target.value)} />
              <Input placeholder="Basic salary (₱)" inputMode="decimal" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} />
              <Input placeholder="Email" type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} />
              <Input placeholder="Contact number" value={empContact} onChange={(e) => setEmpContact(e.target.value)} />
              <Input placeholder="Benefits (e.g. SSS, PhilHealth, allowance)" value={empBenefits} onChange={(e) => setEmpBenefits(e.target.value)} />
              <div>
                <Label className="text-xs text-slate-500">Hire date</Label>
                <Input type="date" value={empHireDate} onChange={(e) => setEmpHireDate(e.target.value)} />
              </div>
              <Button className="w-fit md:col-span-2" onClick={() => addEmployee.mutate()} disabled={addEmployee.isPending}>
                Add employee
              </Button>
              {addEmployee.error ? <p className="text-sm text-red-600 md:col-span-3">{(addEmployee.error as Error).message}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              {loadingEmp ? (
                <p className="p-4 text-sm text-slate-500">Loading…</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Position</th>
                      <th className="px-4 py-2 text-left">Salary</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-4 py-2">{e.full_name}</td>
                        <td className="px-4 py-2">{e.position ?? '—'}</td>
                        <td className="px-4 py-2">
                          <CurrencyDisplay amount={e.basic_salary ?? '0'} />
                        </td>
                        <td className="px-4 py-2">{e.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payroll" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create payroll run</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div>
                <Label>Period start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <Button className="self-end" onClick={() => createPayroll.mutate()} disabled={createPayroll.isPending}>
                Generate draft
              </Button>
              {createPayroll.error ? <p className="w-full text-sm text-red-600">{(createPayroll.error as Error).message}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Period</th>
                    <th className="px-4 py-2 text-left">Gross</th>
                    <th className="px-4 py-2 text-left">Net</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2">
                        {r.period_start} → {r.period_end}
                      </td>
                      <td className="px-4 py-2">
                        <CurrencyDisplay amount={r.total_gross} />
                      </td>
                      <td className="px-4 py-2">
                        <CurrencyDisplay amount={r.total_net} />
                      </td>
                      <td className="px-4 py-2">{r.status}</td>
                      <td className="px-4 py-2 text-right">
                        {r.status === 'draft' ? (
                          <Button size="sm" onClick={() => approveRun.mutate(r.id)} disabled={approveRun.isPending}>
                            Approve
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}