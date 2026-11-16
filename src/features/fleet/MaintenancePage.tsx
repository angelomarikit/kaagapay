import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'

export function MaintenancePage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [maintenanceType, setMaintenanceType] = useState('preventive')
  const [status, setStatus] = useState('scheduled')
  const [provider, setProvider] = useState('')
  const [laborCost, setLaborCost] = useState('0')
  const [partsCost, setPartsCost] = useState('0')
  const [notes, setNotes] = useState('')
  const [odometer, setOdometer] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*, vehicles(plate_number)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('id, plate_number').order('plate_number')
      if (error) throw error
      return data as { id: string; plate_number: string }[]
    },
    enabled: open,
  })

  const create = useMutation({
    mutationFn: async () => {
      if (!vehicleId) throw new Error('Select a vehicle.')
      const { error } = await supabase.from('maintenance_records').insert({
        vehicle_id: vehicleId,
        maintenance_type: maintenanceType,
        status,
        service_provider: provider || null,
        labor_cost: Number(laborCost) || 0,
        parts_cost: Number(partsCost) || 0,
        notes: notes || null,
        odometer_reading: odometer ? Number(odometer) : null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['maintenance'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Schedule and track preventive and corrective vehicle maintenance."
        icon={<Wrench className="h-7 w-7" />}
        actions={<Button onClick={() => setOpen(true)}>New Maintenance Record</Button>}
      />

      {open ? (
        <Card className="mb-6 border-brand-blue">
          <CardHeader>
            <CardTitle>New maintenance record</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-xl gap-4">
            <div>
              <Label htmlFor="vehicle">Vehicle</Label>
              <select
                id="vehicle"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
              >
                <option value="preventive">Preventive maintenance</option>
                <option value="corrective">Corrective</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <Label htmlFor="provider">Service provider</Label>
              <Input id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="labor">Labor cost</Label>
                <Input id="labor" inputMode="decimal" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="parts">Parts cost</Label>
                <Input id="parts" inputMode="decimal" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="odometer">Odometer reading (km)</Label>
              <Input id="odometer" inputMode="decimal" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                Save record
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
            {create.error ? <p className="text-sm text-red-600">{(create.error as Error).message}</p> : null}
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
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const r = row as {
                    id: string
                    maintenance_type: string
                    status: string
                    total_cost: string
                    vehicles: { plate_number: string } | null
                  }
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3">{r.vehicles?.plate_number}</td>
                      <td className="px-4 py-3">{r.maintenance_type}</td>
                      <td className="px-4 py-3">{r.status}</td>
                      <td className="px-4 py-3">
                        <CurrencyDisplay amount={r.total_cost} />
                      </td>
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