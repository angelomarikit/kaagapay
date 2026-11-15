import { Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { formatPeso } from '@/lib/money'
import { supabase } from '@/lib/supabase'

export function LoansDashboardPage() {
  const navigate = useNavigate()
  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loans').select('*, members(full_name)').limit(20)
      if (error) throw error
      return data
    },
  })

  const outstanding = loans.reduce((s, l) => s + Number((l as { outstanding_principal: string }).outstanding_principal), 0)

  return (
    <div>
      <PageHeader
        title="Loans & Financing"
        description="Manage member loans, financing, repayments, and loan status."
        icon={<Wallet className="h-7 w-7" />}
        actions={
          <Button onClick={() => navigate('/admin/loans/applications')}>+ New Loan Application</Button>
        }
      />
      <div className="mb-4 grid gap-4 md:grid-cols-5">
        <KpiCard label="Active Loans" value={String(loans.length)} icon={Wallet} />
        <KpiCard label="Outstanding" value={formatPeso(outstanding)} icon={Wallet} />
        <KpiCard label="Portfolio" value={formatPeso(outstanding)} icon={Wallet} />
        <KpiCard label="Collected (MTD)" value="₱0.00" icon={Wallet} />
        <KpiCard label="At Risk" value="0" icon={Wallet} iconClassName="bg-red-50 text-red-700" />
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Loan Dashboard</TabsTrigger>
          <TabsTrigger value="applications" asChild>
            <Link to="/admin/loans/applications">Loan Applications</Link>
          </TabsTrigger>
          <TabsTrigger value="active" asChild>
            <Link to="/admin/loans/active">Active Loans</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="mt-4">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Loan No.</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Balance</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((row) => {
                const r = row as { loan_number: string; outstanding_principal: string; status: string; members: { full_name: string } | null }
                return (
                  <tr key={r.loan_number} className="border-t">
                    <td className="px-4 py-3 text-brand-blue">{r.loan_number}</td>
                    <td className="px-4 py-3">{r.members?.full_name}</td>
                    <td className="px-4 py-3">
                      <CurrencyDisplay amount={r.outstanding_principal} />
                    </td>
                    <td className="px-4 py-3">{r.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}