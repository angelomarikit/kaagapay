import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { supabase } from '@/lib/supabase'

export function DispatchDashboardPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [routeId, setRouteId] = useState('')
  const [departure, setDeparture] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data = [], error: listError } = useQuery({
    queryKey: ['dispatches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatches')
        .select('*, vehicles(plate_number, model), drivers(full_name), routes(name)')
        .order('scheduled_departure', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'dispatch'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('id, plate_number, model, status').eq('status', 'available')
      if (error) throw error
      return data as { id: string; plate_number: string; model: string | null; status: string }[]
    },
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('drivers').select('id, full_name, status').eq('status', 'available')
      if (error) throw error
      return data as { id: string; full_name: string; status: string }[]
    },
  })

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('routes').select('id, name').eq('is_active', true)
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  const { data: tripRecords = [] } = useQuery({
    queryKey: ['trip-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_records')
        .select('*, dispatches(dispatch_number, routes(name))')
        .order('completed_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data
    },
  })

  const stats = {
    today: data.filter((d) => (d as { scheduled_departure: string }).scheduled_departure?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    completed: data.filter((d) => (d as { status: string }).status === 'completed').length,
    ongoing: data.filter((d) => (d as { status: string }).status === 'ongoing').length,
    scheduled: data.filter((d) => (d as { status: string }).status === 'scheduled').length,
  }

  const createDispatch = useMutation({
    mutationFn: async () => {
      if (!vehicleId || !driverId || !departure) throw new Error('Vehicle, driver, and departure are required.')
      const { data, error } = await supabase.rpc('create_dispatch', {
        payload: {
          vehicle_id: vehicleId,
          driver_id: driverId,
          route_id: routeId || null,
          scheduled_departure: new Date(departure).toISOString(),
        },
      })
      if (error) throw error
      return data as { dispatch_number?: string }
    },
    onSuccess: () => {
      setFormError(null)
      setShowForm(false)
      setVehicleId('')
      setDriverId('')
      setRouteId('')
      setDeparture('')
      qc.invalidateQueries({ queryKey: ['dispatches'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const startTrip = useMutation({
    mutationFn: async (dispatchId: string) => {
      const { error } = await supabase
        .from('dispatches')
        .update({ status: 'ongoing', actual_departure: new Date().toISOString() })
        .eq('id', dispatchId)
        .eq('status', 'scheduled')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispatches'] }),
  })

  const completeTrip = useMutation({
    mutationFn: async (dispatchId: string) => {
      const tripNo = `TRP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const now = new Date().toISOString()
      const { error: dErr } = await supabase
        .from('dispatches')
        .update({ status: 'completed', actual_arrival: now })
        .eq('id', dispatchId)
      if (dErr) throw dErr
      const { error: tErr } = await supabase.from('trip_records').upsert(
        {
          dispatch_id: dispatchId,
          trip_number: tripNo,
          completed_at: now,
        },
        { onConflict: 'dispatch_id' },
      )
      if (tErr) throw tErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] })
      qc.invalidateQueries({ queryKey: ['trip-records'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Dispatch & Trips"
        description="Schedule dispatches, run trips, and review completed trip records — under Transport & Fleet."
        icon={<CalendarClock className="h-7 w-7" />}
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Create Dispatch
          </Button>
        }
      />
      {listError ? <p className="mb-4 text-sm text-red-600">{(listError as Error).message}</p> : null}

      {showForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New dispatch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Vehicle</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} {v.model ? `— ${v.model}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Driver</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">Select driver…</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Route</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
              >
                <option value="">Optional route…</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Scheduled departure</Label>
              <Input type="datetime-local" className="mt-1" value={departure} onChange={(e) => setDeparture(e.target.value)} />
            </div>
            {formError ? <p className="text-sm text-red-600 md:col-span-2">{formError}</p> : null}
            <div className="flex gap-2 md:col-span-2">
              <Button onClick={() => createDispatch.mutate()} disabled={createDispatch.isPending}>
                Save dispatch
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today's Trips" value={String(stats.today)} icon={CalendarClock} />
        <KpiCard label="Completed" value={String(stats.completed)} icon={CalendarClock} iconClassName="bg-green-50 text-green-700" />
        <KpiCard label="Ongoing" value={String(stats.ongoing)} icon={CalendarClock} iconClassName="bg-amber-50 text-amber-700" />
        <KpiCard label="Scheduled" value={String(stats.scheduled)} icon={CalendarClock} iconClassName="bg-purple-50 text-purple-700" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dispatches</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Dispatch No.</th>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-500">
                    No dispatches yet. Add vehicles, drivers, and routes (seed 014), then create a dispatch.
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const r = row as {
                    id: string
                    dispatch_number: string
                    status: string
                    vehicles: { plate_number: string; model: string | null } | null
                    drivers: { full_name: string } | null
                    routes: { name: string } | null
                  }
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 text-brand-blue">{r.dispatch_number}</td>
                      <td className="px-4 py-3">{r.routes?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {r.vehicles?.model} ({r.vehicles?.plate_number})
                      </td>
                      <td className="px-4 py-3">{r.drivers?.full_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === 'ongoing' ? 'warning' : r.status === 'completed' ? 'success' : 'info'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="space-x-2 px-4 py-3 text-right">
                        {r.status === 'scheduled' ? (
                          <Button size="sm" variant="outline" onClick={() => startTrip.mutate(r.id)} disabled={startTrip.isPending}>
                            Start
                          </Button>
                        ) : null}
                        {r.status !== 'completed' ? (
                          <Button size="sm" onClick={() => completeTrip.mutate(r.id)} disabled={completeTrip.isPending}>
                            Complete
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Completed trip records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Trip No.</th>
                <th className="px-4 py-3 text-left">Dispatch</th>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-left">Completed</th>
                <th className="px-4 py-3 text-left">Distance (km)</th>
              </tr>
            </thead>
            <tbody>
              {tripRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-500">
                    No completed trips yet. Mark a dispatch as completed to create a trip record.
                  </td>
                </tr>
              ) : (
                tripRecords.map((row) => {
                  const r = row as {
                    id: string
                    trip_number: string
                    completed_at: string | null
                    distance_km: string | null
                    dispatches: { dispatch_number: string; routes: { name: string } | null } | null
                  }
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3">{r.trip_number}</td>
                      <td className="px-4 py-3">{r.dispatches?.dispatch_number ?? '—'}</td>
                      <td className="px-4 py-3">{r.dispatches?.routes?.name ?? '—'}</td>
                      <td className="px-4 py-3">{r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">{r.distance_km ?? '—'}</td>
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