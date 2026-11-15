import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  member_code: string
  full_name: string
  email: string | null
  contact_number: string | null
  membership_type: string | null
  status: string
  date_of_membership: string | null
  address: string | null
}

type MemberForm = {
  full_name: string
  email: string
  contact_number: string
  membership_type: string
  address: string
  date_of_membership: string
  status: string
}

const emptyForm: MemberForm = {
  full_name: '',
  email: '',
  contact_number: '',
  membership_type: '',
  address: '',
  date_of_membership: new Date().toISOString().slice(0, 10),
  status: 'active',
}

export function MembersPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Member | null>(null)
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<MemberForm>(emptyForm)
  const [showContributions, setShowContributions] = useState(false)
  const qc = useQueryClient()

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', search],
    queryFn: async () => {
      let q = supabase.from('members').select('*').order('created_at', { ascending: false })
      if (search) {
        q = q.or(`full_name.ilike.%${search}%,member_code.ilike.%${search}%,contact_number.ilike.%${search}%`)
      }
      const { data, error } = await q.limit(50)
      if (error) throw error
      return data as Member[]
    },
  })

  const { data: counts } = useQuery({
    queryKey: ['member-counts'],
    queryFn: async () => {
      const [total, active, pending, inactive] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('membership_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
      ])
      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        pending: pending.count ?? 0,
        inactive: inactive.count ?? 0,
      }
    },
  })

  const selectedMember = useMemo(
    () => (selected ? members.find((m) => m.id === selected.id) ?? selected : null),
    [members, selected],
  )

  const { data: memberContributions = [], isLoading: loadingContributions } = useQuery({
    queryKey: ['member-contributions', selectedMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('id, amount, contributed_at, receipt_reference, notes')
        .eq('member_id', selectedMember!.id)
        .order('contributed_at', { ascending: false })
        .limit(25)
      if (error) throw error
      return data as { id: string; amount: string; contributed_at: string; receipt_reference: string | null; notes: string | null }[]
    },
    enabled: !!selectedMember?.id && showContributions,
  })

  const contributionTotal = memberContributions.reduce((s, c) => s + Number(c.amount), 0)

  function openAdd() {
    setForm(emptyForm)
    setMode('add')
  }

  function openEdit(m: Member) {
    setSelected(m)
    setForm({
      full_name: m.full_name,
      email: m.email ?? '',
      contact_number: m.contact_number ?? '',
      membership_type: m.membership_type ?? '',
      address: m.address ?? '',
      date_of_membership: m.date_of_membership ?? new Date().toISOString().slice(0, 10),
      status: m.status,
    })
    setMode('edit')
  }

  const saveMember = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error('Full name is required.')
      if (mode === 'add') {
        const { data: code, error: codeErr } = await supabase.rpc('next_member_code')
        if (codeErr) throw codeErr
        const { error } = await supabase.from('members').insert({
          member_code: code as string,
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          contact_number: form.contact_number.trim() || null,
          membership_type: form.membership_type.trim() || null,
          address: form.address.trim() || null,
          status: form.status,
          date_of_membership: form.date_of_membership || null,
        })
        if (error) throw error
      } else if (selectedMember) {
        const { error } = await supabase
          .from('members')
          .update({
            full_name: form.full_name.trim(),
            email: form.email.trim() || null,
            contact_number: form.contact_number.trim() || null,
            membership_type: form.membership_type.trim() || null,
            address: form.address.trim() || null,
            status: form.status,
            date_of_membership: form.date_of_membership || null,
          })
          .eq('id', selectedMember.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      setMode(null)
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['member-counts'] })
    },
  })

  const deactivateMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('members').update({ status: 'inactive' }).eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['member-counts'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Member Management"
        description="Manage cooperative members, profiles, contributions, and status."
        icon={<Users className="h-7 w-7" />}
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Members" value={String(counts?.total ?? 0)} icon={Users} />
        <KpiCard label="Active Members" value={String(counts?.active ?? 0)} icon={Users} iconClassName="bg-green-50 text-green-700" />
        <KpiCard label="Pending Applications" value={String(counts?.pending ?? 0)} icon={Users} iconClassName="bg-amber-50 text-amber-700" />
        <KpiCard label="Inactive Members" value={String(counts?.inactive ?? 0)} icon={Users} iconClassName="bg-red-50 text-red-700" />
      </div>

      {mode ? (
        <Card className="mb-6 border-brand-blue">
          <CardHeader>
            <CardTitle>{mode === 'add' ? 'Add member' : `Edit ${selectedMember?.member_code ?? ''}`}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="contact">Contact number</Label>
              <Input id="contact" value={form.contact_number} onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="membership_type">Membership type</Label>
              <Input id="membership_type" value={form.membership_type} onChange={(e) => setForm((f) => ({ ...f, membership_type: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dom">Date of membership</Label>
              <Input
                id="dom"
                type="date"
                value={form.date_of_membership}
                onChange={(e) => setForm((f) => ({ ...f, date_of_membership: e.target.value }))}
              />
            </div>
            {mode === 'edit' ? (
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
            ) : null}
            <div className="flex gap-2 md:col-span-2">
              <Button onClick={() => saveMember.mutate()} disabled={saveMember.isPending}>
                Save member
              </Button>
              <Button variant="outline" onClick={() => setMode(null)}>
                Cancel
              </Button>
              {saveMember.error ? <p className="text-sm text-red-600">{(saveMember.error as Error).message}</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Input placeholder="Search by ID, name, or contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : members.length === 0 ? (
              <EmptyState title="No members yet" description="Add a member or approve a membership application." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2">Member ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 font-medium text-brand-blue">{m.member_code}</td>
                        <td>{m.full_name}</td>
                        <td>{m.membership_type ?? '—'}</td>
                        <td>
                          <Badge variant={m.status === 'active' ? 'success' : 'danger'}>{m.status}</Badge>
                        </td>
                        <td className="space-x-1 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelected(m)
                              setShowContributions(false)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={deactivateMember.isPending || m.status === 'inactive'}
                            onClick={() => {
                              if (window.confirm(`Deactivate member ${m.full_name}?`)) deactivateMember.mutate(m.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            {selectedMember ? (
              <>
                <h3 className="text-lg font-semibold text-navy">{selectedMember.full_name}</h3>
                <Badge className="mt-2" variant={selectedMember.status === 'active' ? 'success' : 'danger'}>
                  {selectedMember.status}
                </Badge>
                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Member ID</dt>
                    <dd>{selectedMember.member_code}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd>{selectedMember.email ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Contact</dt>
                    <dd>{selectedMember.contact_number ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Date of membership</dt>
                    <dd>{selectedMember.date_of_membership ?? '—'}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="navy" onClick={() => openEdit(selectedMember)}>
                    Edit Member
                  </Button>
                  <Button variant="outline" onClick={() => setShowContributions((v) => !v)}>
                    {showContributions ? 'Hide contributions' : 'View contributions'}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/admin/membership/contributions?memberId=${selectedMember.id}`}>Record contribution</Link>
                  </Button>
                </div>
                {showContributions ? (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm font-medium text-navy">Contribution history</p>
                    <p className="mb-3 text-sm text-slate-600">
                      Total: <CurrencyDisplay amount={contributionTotal.toFixed(2)} />
                    </p>
                    {loadingContributions ? (
                      <p className="text-sm text-slate-500">Loading…</p>
                    ) : memberContributions.length === 0 ? (
                      <p className="text-sm text-slate-500">No contributions recorded for this member yet.</p>
                    ) : (
                      <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                        {memberContributions.map((c) => (
                          <li key={c.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-slate-600">{new Date(c.contributed_at).toLocaleDateString()}</span>
                            <CurrencyDisplay amount={c.amount} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a member to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}