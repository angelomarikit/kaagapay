import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'

export function ContributionsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectMember = searchParams.get('memberId') ?? ''
  const [open, setOpen] = useState(!!preselectMember)
  const [memberId, setMemberId] = useState(preselectMember)
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState('')
  const [notes, setNotes] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['contributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*, members(full_name, member_code)')
        .order('contributed_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, member_code, full_name, status')
        .order('full_name')
      if (error) throw error
      return data as { id: string; member_code: string; full_name: string; status: string }[]
    },
    enabled: open,
  })

  useEffect(() => {
    if (preselectMember) {
      setMemberId(preselectMember)
      setOpen(true)
    }
  }, [preselectMember])

  const record = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error('Select a member.')
      const amt = Number(amount)
      if (!amt || amt <= 0) throw new Error('Enter a valid amount.')
      const { data, error } = await supabase.rpc('record_contribution', {
        payload: {
          member_id: memberId,
          amount: amt.toFixed(2),
          receipt_reference: receipt || null,
          notes: notes || null,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setOpen(false)
      setMemberId('')
      setAmount('')
      setReceipt('')
      setNotes('')
      qc.invalidateQueries({ queryKey: ['contributions'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Membership Contributions"
        description="Record share capital, fees, and other member contributions."
        icon={<HandCoins className="h-7 w-7" />}
        actions={
          <Button onClick={() => setOpen(true)}>Record Contribution</Button>
        }
      />

      {open ? (
        <Card className="mb-6 border-brand-blue">
          <CardHeader>
            <CardTitle>Record contribution</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-xl gap-4">
            <div>
              <Label htmlFor="member">Member</Label>
              <select
                id="member"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.member_code}){m.status !== 'active' ? ` — ${m.status}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (PHP)</Label>
              <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="receipt">Receipt / OR reference</Label>
              <Input id="receipt" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => record.mutate()} disabled={record.isPending}>
                Save contribution
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
            {record.error ? <p className="text-sm text-red-600">{(record.error as Error).message}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const r = row as {
                    id: string
                    amount: string
                    contributed_at: string
                    receipt_reference: string | null
                    members: { full_name: string; member_code: string } | null
                  }
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3">
                        {r.members?.full_name ?? '—'} ({r.members?.member_code})
                      </td>
                      <td className="px-4 py-3">
                        <CurrencyDisplay amount={r.amount} />
                      </td>
                      <td className="px-4 py-3">{new Date(r.contributed_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{r.receipt_reference ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}