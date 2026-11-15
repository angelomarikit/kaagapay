import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bus, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { supabase } from '@/lib/supabase'

const vehicleSchema = z.object({
  plate_number: z.string().min(3, 'Plate number is required'),
  unit_number: z.string().optional(),
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  model: z.string().optional(),
  capacity: z.number().int().positive().optional(),
})

type VehicleForm = z.infer<typeof vehicleSchema>

export function VehiclesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data = [], error: loadError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('plate_number')
      if (error) throw error
      return data
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { vehicle_type: 'Bus' },
  })

  const createVehicle = useMutation({
    mutationFn: async (values: VehicleForm) => {
      const { error } = await supabase.from('vehicles').insert({
        plate_number: values.plate_number.toUpperCase(),
        unit_number: values.unit_number || null,
        vehicle_type: values.vehicle_type,
        model: values.model || null,
        capacity: values.capacity ?? null,
        status: 'available',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setSaveError(null)
      reset()
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (e: Error) => setSaveError(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Fleet Management"
        description="Register and manage cooperative vehicles, operators, and availability."
        icon={<Bus className="h-7 w-7" />}
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Register Vehicle
          </Button>
        }
      />
      {loadError ? <p className="mb-4 text-sm text-red-600">{(loadError as Error).message}</p> : null}

      {showForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((v) => createVehicle.mutate(v as VehicleForm))}>
              <div>
                <Label htmlFor="plate_number">Plate number</Label>
                <Input id="plate_number" className="mt-1" {...register('plate_number')} />
                {errors.plate_number ? <p className="text-xs text-red-600">{errors.plate_number.message}</p> : null}
              </div>
              <div>
                <Label htmlFor="unit_number">Unit number</Label>
                <Input id="unit_number" className="mt-1" {...register('unit_number')} />
              </div>
              <div>
                <Label htmlFor="vehicle_type">Type</Label>
                <Input id="vehicle_type" className="mt-1" {...register('vehicle_type')} />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input id="model" className="mt-1" {...register('model')} />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity (pax)</Label>
                <Input id="capacity" type="number" className="mt-1" {...register('capacity', { valueAsNumber: true })} />
              </div>
              {saveError ? <p className="md:col-span-2 text-sm text-red-600">{saveError}</p> : null}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSubmitting || createVehicle.isPending}>
                  Save vehicle
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Plate No.</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Type / Model</th>
                <th className="px-4 py-3 text-left">Capacity</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-500">
                    No vehicles registered yet.
                  </td>
                </tr>
              ) : (
                data.map((v) => {
                  const row = v as {
                    id: string
                    plate_number: string
                    unit_number: string | null
                    vehicle_type: string | null
                    model: string | null
                    capacity: number | null
                    status: string
                  }
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.plate_number}</td>
                      <td className="px-4 py-3">{row.unit_number ?? '—'}</td>
                      <td className="px-4 py-3">
                        {row.vehicle_type} {row.model}
                      </td>
                      <td className="px-4 py-3">{row.capacity ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.status === 'available' ? 'success' : 'warning'}>{row.status}</Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}