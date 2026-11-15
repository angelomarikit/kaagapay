import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const incomeExpense = [
  { month: 'Jun', income: 2100, expense: 1650 },
  { month: 'Jul', income: 2250, expense: 1700 },
  { month: 'Aug', income: 2400, expense: 1720 },
  { month: 'Sep', income: 2550, expense: 1750 },
  { month: 'Oct', income: 2680, expense: 1780 },
  { month: 'Nov', income: 2480, expense: 1685 },
]

const expenseBreakdown = [
  { name: 'Operations', value: 36.9, color: '#1565c0' },
  { name: 'Maintenance', value: 16.7, color: '#ec407a' },
  { name: 'Administration', value: 15.5, color: '#66bb6a' },
  { name: 'Personnel', value: 14.3, color: '#ffa726' },
]

export function ReportsPage() {
  const [reportType, setReportType] = useState('Income Statement')

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="View and export cooperative performance and financial reports."
        icon={<BarChart3 className="h-7 w-7" />}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <KpiCard label="Total Income" value="₱2,480,000.00" icon={BarChart3} />
        <KpiCard label="Total Expenses" value="₱1,685,000.00" icon={BarChart3} />
        <KpiCard label="Net Surplus" value="₱795,000.00" icon={BarChart3} />
        <KpiCard label="Total Members" value="—" icon={BarChart3} />
        <KpiCard label="Outstanding Loans" value="—" icon={BarChart3} />
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="overview">Reports Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Reports</TabsTrigger>
          <TabsTrigger value="membership">Membership Reports</TabsTrigger>
          <TabsTrigger value="operational">Operational Reports</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Select Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="h-10 w-full rounded-md border px-2 text-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option>Income Statement</option>
              <option>Balance Sheet</option>
              <option>Cash Flow</option>
              <option>Loan Portfolio</option>
            </select>
            <Button className="w-full">Generate Report</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Income vs. Expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeExpense}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="income" fill="#43a047" name="Income" />
                <Bar dataKey="expense" fill="#e53935" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {expenseBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}