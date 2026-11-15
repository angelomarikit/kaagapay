import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'
import { SettingsSectionLayout } from './SettingsSectionLayout'
import { useSaveSystemSetting, useSystemSetting } from './useSystemSetting'

function SaveBar({
  onSave,
  pending,
  error,
  success,
}: {
  onSave: () => void
  pending: boolean
  error: Error | null
  success?: boolean
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Button onClick={onSave} disabled={pending}>
        Save changes
      </Button>
      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}
      {success ? <p className="text-sm text-green-700">Saved.</p> : null}
    </div>
  )
}

function JsonSettingForm<T extends Record<string, string>>({
  settingKey,
  defaults,
  fields,
  title,
  description,
}: {
  settingKey: string
  defaults: T
  fields: { key: keyof T; label: string; type?: string; placeholder?: string }[]
  title: string
  description: string
}) {
  const { data, isLoading } = useSystemSetting(settingKey, defaults)
  const save = useSaveSystemSetting(settingKey)
  const [form, setForm] = useState<T | null>(null)
  const values = form ?? data ?? defaults

  return (
    <SettingsSectionLayout title={title} description={description}>
      <Card>
        <CardContent className="grid max-w-2xl gap-4 p-6">
          {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          {fields.map((f) => (
            <div key={String(f.key)}>
              <Label htmlFor={String(f.key)}>{f.label}</Label>
              {f.type === 'textarea' ? (
                <textarea
                  id={String(f.key)}
                  className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setForm({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  id={String(f.key)}
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  className="mt-1"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setForm({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <SaveBar
            onSave={() => save.mutate(values as Record<string, unknown>)}
            pending={save.isPending}
            error={save.error as Error | null}
            success={save.isSuccess}
          />
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function OrganizationProfilePanel() {
  return (
    <JsonSettingForm
      settingKey="organization_profile"
      title="Organization Profile"
      description="Cooperative identity shown on reports and receipts."
      defaults={{
        legal_name: 'KAAGAPAY COOPERATIVE',
        registered_address: '',
        contact_phone: '',
        contact_email: '',
        registration_number: '',
      }}
      fields={[
        { key: 'legal_name', label: 'Legal name' },
        { key: 'registered_address', label: 'Registered address', type: 'textarea' },
        { key: 'contact_phone', label: 'Contact phone' },
        { key: 'contact_email', label: 'Contact email', type: 'email' },
        { key: 'registration_number', label: 'Registration / CDA number' },
      ]}
    />
  )
}

export function SystemPreferencesPanel() {
  return (
    <JsonSettingForm
      settingKey="system_preferences"
      title="System Preferences"
      description="Display and regional defaults."
      defaults={{ currency: 'PHP', locale: 'en-PH', timezone: 'Asia/Manila', date_format: 'YYYY-MM-DD' }}
      fields={[
        { key: 'currency', label: 'Currency code' },
        { key: 'locale', label: 'Locale' },
        { key: 'timezone', label: 'Timezone' },
        { key: 'date_format', label: 'Date format' },
      ]}
    />
  )
}

export function FiscalYearPanel() {
  return (
    <JsonSettingForm
      settingKey="fiscal_year"
      title="Fiscal Year & Periods"
      description="Define the cooperative fiscal calendar."
      defaults={{ fiscal_year_start_month: '1', current_fiscal_year: String(new Date().getFullYear()), period_close_day: 'last' }}
      fields={[
        { key: 'fiscal_year_start_month', label: 'Fiscal year start month (1–12)', type: 'number' },
        { key: 'current_fiscal_year', label: 'Current fiscal year', type: 'number' },
        { key: 'period_close_day', label: 'Period close rule (e.g. last or 25)' },
      ]}
    />
  )
}

export function ReferenceNumberingPanel() {
  return (
    <JsonSettingForm
      settingKey="reference_numbering"
      title="Reference Numbering"
      description="Prefixes for automated document numbers (RPCs may still use built-in patterns)."
      defaults={{ receipt_prefix: 'OR', dispatch_prefix: 'DSP', loan_prefix: 'LN', member_prefix: 'KAG' }}
      fields={[
        { key: 'receipt_prefix', label: 'Official receipt prefix' },
        { key: 'dispatch_prefix', label: 'Dispatch prefix' },
        { key: 'loan_prefix', label: 'Loan number prefix' },
        { key: 'member_prefix', label: 'Member code prefix' },
      ]}
    />
  )
}

export function AccountingRulesPanel() {
  return (
    <JsonSettingForm
      settingKey="accounting_rules"
      title="Accounting Rules"
      description="Controls enforced together with journal RPCs."
      defaults={{
        require_balanced_entries: 'true',
        block_edit_posted: 'true',
        auto_post_cash_collections: 'true',
      }}
      fields={[
        { key: 'require_balanced_entries', label: 'Require balanced journal entries (true/false)' },
        { key: 'block_edit_posted', label: 'Block editing posted entries (true/false)' },
        { key: 'auto_post_cash_collections', label: 'Auto-post confirmed cash collections (true/false)' },
      ]}
    />
  )
}

export function TaxesDeductionsPanel() {
  return (
    <JsonSettingForm
      settingKey="taxes_deductions"
      title="Taxes & Deductions"
      description="Default rates for payroll and withholding (stored for future payroll module)."
      defaults={{ vat_rate: '12', withholding_tax: '0', sss_employee: '0', philhealth: '0' }}
      fields={[
        { key: 'vat_rate', label: 'VAT rate %', type: 'number' },
        { key: 'withholding_tax', label: 'Withholding tax %', type: 'number' },
        { key: 'sss_employee', label: 'SSS employee share %', type: 'number' },
        { key: 'philhealth', label: 'PhilHealth %', type: 'number' },
      ]}
    />
  )
}

export function DividendsPatronagePanel() {
  return (
    <JsonSettingForm
      settingKey="dividends_patronage"
      title="Dividends & Patronage"
      description="Patronage refund and dividend allocation parameters."
      defaults={{ patronage_rate: '0', dividend_rate: '0', reserve_fund_pct: '10' }}
      fields={[
        { key: 'patronage_rate', label: 'Patronage refund %', type: 'number' },
        { key: 'dividend_rate', label: 'Dividend on share capital %', type: 'number' },
        { key: 'reserve_fund_pct', label: 'Reserve fund %', type: 'number' },
      ]}
    />
  )
}

export function PoliciesTermsPanel() {
  return (
    <JsonSettingForm
      settingKey="policies_terms"
      title="Policies & Terms"
      description="Text shown to applicants and members."
      defaults={{ membership_policy: '', loan_policy: '', code_of_conduct: '' }}
      fields={[
        { key: 'membership_policy', label: 'Membership policy', type: 'textarea' },
        { key: 'loan_policy', label: 'Loan policy', type: 'textarea' },
        { key: 'code_of_conduct', label: 'Code of conduct', type: 'textarea' },
      ]}
    />
  )
}

export function SecuritySettingsPanel() {
  return (
    <JsonSettingForm
      settingKey="security_settings"
      title="Security Settings"
      description="Policy flags (enforce MFA and password rules in Supabase Auth dashboard)."
      defaults={{ session_timeout_minutes: '480', require_staff_mfa: 'false', allow_member_self_register: 'true' }}
      fields={[
        { key: 'session_timeout_minutes', label: 'Advisory session timeout (minutes)', type: 'number' },
        { key: 'require_staff_mfa', label: 'Require MFA for staff (true/false)' },
        { key: 'allow_member_self_register', label: 'Allow public registration (true/false)' },
      ]}
    />
  )
}

export function ModuleSettingsPanel() {
  const qc = useQueryClient()
  const { data: settings, isLoading } = useSystemSetting('module_settings', {
    enable_pos: 'true',
    enable_loans: 'true',
    enable_fleet: 'true',
  })
  const save = useSaveSystemSetting('module_settings')
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const values = form ?? settings ?? {}

  const { data: fares = [] } = useQuery({
    queryKey: ['settings-fare-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fare_types').select('*').order('code')
      if (error) throw error
      return data as { id: string; code: string; name: string; unit_price: string; is_active: boolean }[]
    },
  })

  const updateFare = useMutation({
    mutationFn: async (row: { id: string; unit_price: string; is_active: boolean }) => {
      const { error } = await supabase.from('fare_types').update({ unit_price: row.unit_price, is_active: row.is_active }).eq('id', row.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-fare-types'] }),
  })

  return (
    <SettingsSectionLayout title="Module Settings" description="Feature toggles and POS fare configuration.">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Module toggles</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-md gap-4">
          {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          {(['enable_pos', 'enable_loans', 'enable_fleet'] as const).map((key) => (
            <ModuleToggleField key={key} label={key} values={values} setForm={setForm} />
          ))}
          <SaveBar onSave={() => save.mutate(values)} pending={save.isPending} error={save.error as Error | null} success={save.isSuccess} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fare types (POS)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fares.map((f) => (
                <FareRow key={f.id} fare={f} onSave={(row) => updateFare.mutate(row)} pending={updateFare.isPending} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

function ModuleToggleField({
  label,
  values,
  setForm,
}: {
  label: string
  values: Record<string, string>
  setForm: (v: Record<string, string>) => void
}) {
  return (
    <div>
      <Label>{label.replace(/_/g, ' ')}</Label>
      <select
        className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        value={values[label] ?? 'true'}
        onChange={(e) => setForm({ ...values, [label]: e.target.value })}
      >
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
    </div>
  )
}

function FareRow({
  fare,
  onSave,
  pending,
}: {
  fare: { id: string; code: string; name: string; unit_price: string; is_active: boolean }
  onSave: (row: { id: string; unit_price: string; is_active: boolean }) => void
  pending: boolean
}) {
  const [price, setPrice] = useState(fare.unit_price)
  const [active, setActive] = useState(fare.is_active)
  return (
    <tr className="border-t">
      <td className="px-4 py-2">{fare.code}</td>
      <td className="px-4 py-2">{fare.name}</td>
      <td className="px-4 py-2">
        <Input className="h-8 w-24" value={price} onChange={(e) => setPrice(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="px-4 py-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onSave({ id: fare.id, unit_price: price, is_active: active })}>
          Save
        </Button>
      </td>
    </tr>
  )
}

export function ChartOfAccountsPanel() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState('asset')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['settings-coa'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').order('code')
      if (error) throw error
      return data as { id: string; code: string; name: string; account_type: string; is_active: boolean }[]
    },
  })

  const addAccount = useMutation({
    mutationFn: async () => {
      if (!code.trim() || !name.trim()) throw new Error('Code and name are required.')
      const { error } = await supabase.from('chart_of_accounts').insert({
        code: code.trim(),
        name: name.trim(),
        account_type: accountType,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setCode('')
      setName('')
      qc.invalidateQueries({ queryKey: ['settings-coa'] })
    },
  })

  return (
    <SettingsSectionLayout title="Chart of Accounts" description="General ledger account master list.">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add account</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4 md:grid-cols-3">
          <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="h-10 rounded-md border px-3 text-sm" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            {['asset', 'liability', 'equity', 'income', 'expense'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button className="md:col-span-3 w-fit" onClick={() => addAccount.mutate()} disabled={addAccount.isPending}>
            Add account
          </Button>
          {addAccount.error ? <p className="text-sm text-red-600 md:col-span-3">{(addAccount.error as Error).message}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Type</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{a.code}</td>
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2">{a.account_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function BankAccountsPanel() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('cash')
  const [glId, setGlId] = useState('')

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['settings-coa', 'bank'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('id, code, name').eq('is_active', true).order('code')
      if (error) throw error
      return data as { id: string; code: string; name: string }[]
    },
  })

  const { data: banks = [] } = useQuery({
    queryKey: ['settings-cash-bank'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cash_bank_accounts').select('*, chart_of_accounts(code, name)')
      if (error) throw error
      return data
    },
  })

  const addBank = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name is required.')
      const { error } = await supabase.from('cash_bank_accounts').insert({
        name: name.trim(),
        account_type: type,
        gl_account_id: glId || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setName('')
      qc.invalidateQueries({ queryKey: ['settings-cash-bank'] })
    },
  })

  return (
    <SettingsSectionLayout title="Bank Accounts" description="Cash and bank subledgers linked to GL accounts.">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add cash / bank account</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <Input placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="h-10 rounded-md border px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={glId} onChange={(e) => setGlId(e.target.value)}>
            <option value="">Link GL account (optional)</option>
            {glAccounts.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} — {g.name}
              </option>
            ))}
          </select>
          <Button className="w-fit" onClick={() => addBank.mutate()} disabled={addBank.isPending}>
            Add account
          </Button>
          {addBank.error ? <p className="text-sm text-red-600">{(addBank.error as Error).message}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">GL</th>
                <th className="px-4 py-2 text-left">Balance</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((row) => {
                const b = row as {
                  id: string
                  name: string
                  account_type: string
                  current_balance: string
                  chart_of_accounts: { code: string; name: string } | null
                }
                return (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2">{b.account_type}</td>
                    <td className="px-4 py-2">{b.chart_of_accounts ? `${b.chart_of_accounts.code} ${b.chart_of_accounts.name}` : '—'}</td>
                    <td className="px-4 py-2">
                      <CurrencyDisplay amount={b.current_balance} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function MembershipConfigurationPanel() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const { data: types = [] } = useQuery({
    queryKey: ['settings-membership-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('membership_types').select('*').order('name')
      if (error) throw error
      return data as { id: string; name: string; is_active: boolean }[]
    },
  })
  const addType = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name required.')
      const { error } = await supabase.from('membership_types').insert({ name: name.trim() })
      if (error) throw error
    },
    onSuccess: () => {
      setName('')
      qc.invalidateQueries({ queryKey: ['settings-membership-types'] })
    },
  })
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('membership_types').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-membership-types'] }),
  })

  return (
    <SettingsSectionLayout title="Membership Configuration" description="Membership types available for applications and members.">
      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-2 p-6">
          <Input placeholder="New membership type" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button onClick={() => addType.mutate()} disabled={addType.isPending}>
            Add type
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y text-sm">
            {types.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3">
                <span>{t.name}</span>
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: t.id, is_active: !t.is_active })}>
                  {t.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function CapitalShareContributionsPanel() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const { data: rows = [] } = useQuery({
    queryKey: ['settings-contribution-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contribution_categories').select('*').order('code')
      if (error) throw error
      return data as { id: string; code: string; name: string }[]
    },
  })
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contribution_categories').insert({ code: code.trim(), name: name.trim() })
      if (error) throw error
    },
    onSuccess: () => {
      setCode('')
      setName('')
      qc.invalidateQueries({ queryKey: ['settings-contribution-categories'] })
    },
  })
  return (
    <SettingsSectionLayout title="Capital Share & Contributions" description="Contribution category codes for recording payments.">
      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-2 p-6">
          <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            Add category
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2">{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function UserManagementPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient()
  const { data: users = [] } = useQuery({
    queryKey: ['settings-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name, user_type, is_active').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const update = useMutation({
    mutationFn: async (row: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_active: row.is_active }).eq('id', row.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-users'] }),
  })
  const table = (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const row = u as { id: string; email: string | null; full_name: string | null; user_type: string; is_active: boolean }
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2">{row.full_name ?? '—'}</td>
                  <td className="px-4 py-2">{row.email}</td>
                  <td className="px-4 py-2">{row.user_type}</td>
                  <td className="px-4 py-2">{row.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: row.id, is_active: !row.is_active })}>
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )

  if (embedded) return table

  return (
    <SettingsSectionLayout title="User Management" description="Activate or deactivate login accounts.">
      {table}
    </SettingsSectionLayout>
  )
}

export function RolesPermissionsPanel() {
  const { data: roles = [] } = useQuery({
    queryKey: ['settings-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*, role_permissions(permissions(code, name))')
      if (error) throw error
      return data
    },
  })
  return (
    <SettingsSectionLayout title="Roles & Permissions" description="RBAC catalog (view only; change roles in SQL migrations).">
      <div className="space-y-4">
        {roles.map((role) => {
          const r = role as {
            id: string
            code: string
            name: string
            role_permissions: { permissions: { code: string; name: string } | null }[]
          }
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {r.name} <span className="text-slate-400">({r.code})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs">
                {r.role_permissions.length === 0 ? (
                  <span className="text-slate-500">No permissions linked</span>
                ) : (
                  r.role_permissions.map((rp, i) => (
                    <span key={i} className="rounded bg-slate-100 px-2 py-1">
                      {rp.permissions?.code ?? '—'}
                    </span>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </SettingsSectionLayout>
  )
}

export function ActivityLogsPanel() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['settings-audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return data as { id: string; action: string; entity_type: string | null; created_at: string; metadata: Record<string, unknown> | null }[]
    },
  })
  return (
    <SettingsSectionLayout title="Activity Logs" description="Recent audit events written by approval and workflow RPCs.">
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">When</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2">{log.entity_type ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function DataBackupPanel() {
  return (
    <SettingsSectionLayout
      title="Data Backup"
      description="Database backups are managed in the Supabase project dashboard (not from the browser)."
    >
      <Card>
        <CardContent className="space-y-4 p-6 text-sm text-slate-700">
          <p>
            For production, enable <strong>Point-in-Time Recovery</strong> and scheduled backups in your Supabase project
            settings. Use the SQL Editor to export schema; use Table Editor or CSV export below for operational data.
          </p>
          <p className="text-slate-500">This app does not store service-role keys and cannot trigger server backups directly.</p>
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function ImportExportPanel() {
  const exportMembers = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('members').select('member_code, full_name, email, contact_number, status, date_of_membership')
      if (error) throw error
      const header = ['member_code', 'full_name', 'email', 'contact_number', 'status', 'date_of_membership']
      const lines = [header.join(',')]
      for (const row of data ?? []) {
        const r = row as Record<string, string | null>
        lines.push(header.map((h) => JSON.stringify(r[h] ?? '')).join(','))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kaagapay-members-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
  return (
    <SettingsSectionLayout title="Import / Export" description="Export member directory to CSV. Import requires a controlled migration (not via browser).">
      <Card>
        <CardContent className="p-6">
          <Button onClick={() => exportMembers.mutate()} disabled={exportMembers.isPending}>
            Export members to CSV
          </Button>
          {exportMembers.error ? <p className="mt-2 text-sm text-red-600">{(exportMembers.error as Error).message}</p> : null}
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}

export function SystemMaintenancePanel() {
  const save = useSaveSystemSetting('system_maintenance')
  const { data } = useSystemSetting('system_maintenance', {
    last_migration_note: 'Run migrations 001–020 in SQL Editor per supabase/README.md',
    app_version: '0.0.0',
  })
  return (
    <SettingsSectionLayout title="System Maintenance" description="Reference notes for operators.">
      <Card>
        <CardContent className="space-y-4 p-6 text-sm">
          <p>
            <strong>App version:</strong> {data?.app_version}
          </p>
          <p>
            <strong>Database migrations:</strong> {data?.last_migration_note}
          </p>
          <Label htmlFor="note">Maintenance note</Label>
          <Input
            id="note"
            defaultValue={data?.last_migration_note}
            onBlur={(e) => save.mutate({ ...data, last_migration_note: e.target.value, app_version: data?.app_version ?? '0.0.0' })}
          />
        </CardContent>
      </Card>
    </SettingsSectionLayout>
  )
}