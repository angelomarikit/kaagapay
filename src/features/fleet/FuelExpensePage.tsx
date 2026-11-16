import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fuel, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { formatPeso } from '@/lib/money'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const fuelSchema = z.object({
  vehicle_id: z.string().uuid('Select a vehicle'),
  fuel_type: z.string().min(1, 'Fuel type is required'),
  quantity_liters: z.number({ error: 'Quantity is required' }).positive('Quantity must be positive'),
  unit_price: z.number({ error: 'Unit price is required' }).positive('Unit price must be positive'),
  fuel_station: z.string().optional(),
  transaction_date: z.string().min(1),
  odometer_reading: z.number().nonnegative().optional(),
})

type FuelForm = z.infer<typeof fuelSchema>

type FuelRow = {
  id: string
  reference_number: string
  transaction_date: string
  fuel_type: string
  quantity_liters: string
  unit_price: string
  total_cost: string
  fuel_station: string | null
  vehicles: { plate_number: string; model: string | null } | null
}

function nextFuelRef() {
  const y = new Date().getFullYear()
  const n = Math.floor(Math.random() * 9000) + 1000
  return `FUEL-${y}-${n}`
}

export function FuelExpensePage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [expVehicleId, setExpVehicleId] = useState('')
  const [expCategory, setExpCategory] = useState('operating')
  const [expDescription, setExpDescription] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [expOdometer, setExpOdometer] = useState('')

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('id, plate_number, model').order('plate_number')
      if (error) throw error
      return data as { id: string; plate_number: string; model: string | null }[]
    },
  })

  const { data: fuelRows = [], isLoading, error: loadError } = useQuery({
    queryKey: ['fuel-transactions'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_transactions')
        .select('id, reference_number, transaction_date, fuel_type, quantity_liters, unit_price, total_cost, fuel_station, vehicles(plate_number, model)')
        .order('transaction_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as FuelRow[]
    },
  })

  const { data: expenseRows = [] } = useQuery({
    queryKey: ['operating-expenses'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operating_expenses')
        .select('id, reference_number, expense_date, expense_category, description, amount, vehicles(plate_number)')
        .order('expense_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as {
        id: string
        reference_number: string
        expense_date: string
        expense_category: string
        description: string | null
        amount: string
        vehicles: { plate_number: string } | null
      }[]
    },
  })

  const totalFuel = fuelRows.reduce((s, r) => s + Number(r.total_cost), 0)
  const totalOther = expenseRows.reduce((s, r) => s + Number(r.amount), 0)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FuelForm>({
    resolver: zodResolver(fuelSchema),
    defaultValues: { fuel_type: 'Diesel', transaction_date: new Date().toISOString().slice(0, 10) },
  })

  const saveFuel = useMutation({
    mutationFn: async (values: FuelForm) => {
      const { error } = await supabase.from('fuel_transactions').insert({
        reference_number: nextFuelRef(),
        vehicle_id: values.vehicle_id,
        fuel_type: values.fuel_type,
        quantity_liters: values.quantity_liters,
        unit_price: values.unit_price,
        fuel_station: values.fuel_station || null,
        transaction_date: values.transaction_date,
        odometer_reading: values.odometer_reading ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFormError(null)
      reset()
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['fuel-transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const saveExpense = useMutation({
    mutationFn: async () => {
      const amt = Number(expAmount)
      if (!amt || amt <= 0) throw new Error('Enter a valid amount.')
      const y = new Date().getFullYear()
      const ref = `EXP-${y}-${Math.floor(Math.random() * 9000) + 1000}`
      const { error } = await supabase.from('operating_expenses').insert({
        reference_number: ref,
        vehicle_id: expVehicleId || null,
        expense_category: expCategory,
        description: expDescription || null,
        amount: amt,
        expense_date: expDate,
        odometer_reading: expOdometer ? Number(expOdometer) : null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowExpenseForm(false)
      setExpAmount('')
      setExpDescription('')
      setExpOdometer('')
      qc.invalidateQueries({ queryKey: ['operating-expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Fuel & Expense"
        description="Record fuel purchases and view vehicle operating expenses from the database."
        icon={<Fuel className="h-7 w-7" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" />
              Record fuel
            </Button>
            <Button variant="outline" onClick={() => setShowExpenseForm((v) => !v)}>
              New expense
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Fuel (loaded)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-navy">{formatPeso(totalFuel)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Other expenses (loaded)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-navy">{formatPeso(totalOther)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total operating</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-navy">{formatPeso(totalFuel + totalOther)}</CardContent>
        </Card>
      </div>

      {showForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New fuel transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={handleSubmit((v) => saveFuel.mutate(v as FuelForm))}
            >
              <div>
                <Label htmlFor="vehicle_id">Vehicle</Label>
                <select
                  id="vehicle_id"
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  {...register('vehicle_id')}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} {v.model ? `— ${v.model}` : ''}
                    </option>
                  ))}
                </select>
                {errors.vehicle_id ? <p className="text-xs text-red-600">{errors.vehicle_id.message}</p> : null}
              </div>
              <div>
                <Label htmlFor="fuel_type">Fuel type</Label>
                <Input id="fuel_type" className="mt-1" {...register('fuel_type')} />
              </div>
              <div>
                <Label htmlFor="quantity_liters">Liters</Label>
                <Input
                  id="quantity_liters"
                  type="number"
                  step="0.001"
                  className="mt-1"
                  {...register('quantity_liters', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="unit_price">Price per liter (₱)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  className="mt-1"
                  {...register('unit_price', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="fuel_station">Station / vendor</Label>
                <Input id="fuel_station" className="mt-1" {...register('fuel_station')} />
              </div>
              <div>
                <Label htmlFor="transaction_date">Date</Label>
                <Input id="transaction_date" type="date" className="mt-1" {...register('transaction_date')} />
              </div>
              <div>
                <Label htmlFor="odometer_reading">Odometer (km)</Label>
                <Input
                  id="odometer_reading"
                  type="number"
                  step="0.1"
                  className="mt-1"
                  {...register('odometer_reading', { valueAsNumber: true })}
                />
              </div>
              {formError ? <p className="md:col-span-2 text-sm text-red-600">{formError}</p> : null}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSubmitting || saveFuel.isPending}>
                  Save fuel record
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showExpenseForm ? (
        <Card className="mb-6 border-brand-blue">
          <CardHeader>
            <CardTitle>New operating expense</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-xl gap-4">
            <div>
              <Label>Vehicle (optional)</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={expVehicleId}
                onChange={(e) => setExpVehicleId(e.target.value)}
              >
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number}
                  </option>
                ))}
              </select>
            </div>
            <Input placeholder="Category" value={expCategory} onChange={(e) => setExpCategory(e.target.value)} />
            <Input placeholder="Description" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} />
            <Input placeholder="Amount" inputMode="decimal" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            <Input placeholder="Odometer (km)" inputMode="decimal" value={expOdometer} onChange={(e) => setExpOdometer(e.target.value)} />
            <Button onClick={() => saveExpense.mutate()} disabled={saveExpense.isPending}>
              Save expense
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <p className="mb-4 text-sm text-red-600">{(loadError as Error).message}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fuel transactions</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Ref</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Vehicle</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                ) : fuelRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      No fuel records yet. Add a vehicle, then record fuel.
                    </td>
                  </tr>
                ) : (
                  fuelRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2 font-medium text-brand-blue">{row.reference_number}</td>
                      <td className="px-4 py-2">{row.transaction_date}</td>
                      <td className="px-4 py-2">{row.vehicles?.plate_number ?? '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <CurrencyDisplay amount={row.total_cost} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other operating expenses</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Ref</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Vehicle</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>
                      No operating expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenseRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2">{row.reference_number}</td>
                      <td className="px-4 py-2">{row.expense_category}</td>
                      <td className="px-4 py-2">{row.vehicles?.plate_number ?? '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <CurrencyDisplay amount={row.amount} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}