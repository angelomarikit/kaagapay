import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'

const meta: Record<string, { title: string; table: string }> = {
  'general-ledger': { title: 'General Ledger', table: 'journal_entries' },
  'accounts-payable': { title: 'Accounts Payable', table: 'accounts_payable' },
  'accounts-receivable': { title: 'Accounts Receivable', table: 'accounts_receivable' },
  'cash-bank': { title: 'Cash & Bank', table: 'cash_bank_accounts' },
  reports: { title: 'Financial Reports', table: 'journal_entries' },
  budget: { title: 'Budget & Expenses', table: 'budgets' },
}

export function FinanceSubPage() {
  const { section = 'general-ledger' } = useParams()
  const cfg = meta[section] ?? meta['general-ledger']

  const { data = [] } = useQuery({
    queryKey: ['finance', section],
    queryFn: async () => {
      const { data, error } = await supabase.from(cfg.table).select('*').limit(50)
      if (error) throw error
      return data as Record<string, unknown>[]
    },
  })

  return (
    <div>
      <PageHeader title={cfg.title} description="Accounting data from centralized ledger and subledgers." />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-t">
                  {Object.entries(row)
                    .slice(0, 5)
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
          {!data.length ? <p className="p-6 text-sm text-slate-500">No records yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}