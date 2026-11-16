import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HandCoins, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { addMoney, formatPeso, multiplyMoney } from '@/lib/money'
import { supabase } from '@/lib/supabase'

type CartItem = { item_type: string; description: string; unit_price: string; quantity: number }

export function CollectionsPosPage() {
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [dispatchId, setDispatchId] = useState('')
  const [lastReceipt, setLastReceipt] = useState<string | null>(null)
  const [lastStatus, setLastStatus] = useState<string | null>(null)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [sessionNo, setSessionNo] = useState(1)

  useEffect(() => {
    if (!sessionNotice) return
    const t = window.setTimeout(() => setSessionNotice(null), 6000)
    return () => window.clearTimeout(t)
  }, [sessionNotice])

  const { data: products = [] } = useQuery({
    queryKey: ['pos-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_products')
        .select('id, name, unit_price, is_default')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as { id: string; name: string; unit_price: string; is_default: boolean }[]
    },
  })

  const { data: dispatches = [] } = useQuery({
    queryKey: ['dispatches', 'pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatches')
        .select('id, dispatch_number, status, vehicle_id, driver_id, vehicles(plate_number), drivers(full_name)')
        .in('status', ['scheduled', 'ongoing'])
        .order('scheduled_departure', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as unknown as {
        id: string
        dispatch_number: string
        status: string
        vehicle_id: string
        driver_id: string
        vehicles: { plate_number: string } | null
        drivers: { full_name: string } | null
      }[]
    },
  })

  const { data: recentCollections = [] } = useQuery({
    queryKey: ['collection-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_transactions')
        .select('receipt_number, total_amount, payment_method, verification_status, collected_at')
        .order('collected_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as {
        receipt_number: string | null
        total_amount: string
        payment_method: string
        verification_status: string
        collected_at: string
      }[]
    },
  })

  const selectedDispatch = dispatches.find((d) => d.id === dispatchId)

  const subtotal = useMemo(
    () => cart.reduce((s, item) => addMoney(s, multiplyMoney(item.unit_price, item.quantity)), '0.00'),
    [cart],
  )

  const change =
    amountTendered && paymentMethod === 'cash' ? addMoney(amountTendered, `-${subtotal}`) : '0.00'

  function addProduct(id: string, name: string, price: string, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((p) => p.item_type === id)
      if (existing) {
        return prev.map((p) => (p.item_type === id ? { ...p, quantity: p.quantity + qty } : p))
      }
      return [...prev, { item_type: id, description: name, unit_price: price, quantity: qty }]
    })
  }

  function setQty(code: string, delta: number) {
    setCart((prev) =>
      prev
        .map((p) => (p.item_type === code ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p))
        .filter((p) => p.quantity > 0),
    )
  }

  const confirm = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error('Add at least one product.')
      const clientRequestId = crypto.randomUUID()
      const payload = {
        client_request_id: clientRequestId,
        dispatch_id: dispatchId || null,
        vehicle_id: selectedDispatch?.vehicle_id ?? null,
        driver_id: selectedDispatch?.driver_id ?? null,
        subtotal,
        discount_amount: '0.00',
        total_amount: subtotal,
        amount_tendered: amountTendered || subtotal,
        change_amount: change,
        payment_method: paymentMethod,
        payment_reference: paymentRef || null,
        verification_status: ['gcash', 'maya', 'qrph', 'bank_transfer'].includes(paymentMethod)
          ? 'pending'
          : 'confirmed',
        items: cart.map((c) => ({
          item_type: c.item_type,
          description: c.description,
          unit_price: c.unit_price,
          quantity: String(c.quantity),
        })),
      }
      const { data, error } = await supabase.rpc('confirm_collection', { payload })
      if (error) throw error
      return data as { receipt_number?: string; verification_status?: string; idempotent?: boolean }
    },
    onSuccess: (data) => {
      setLastReceipt(data?.receipt_number ?? 'Posted')
      setLastStatus(data?.verification_status ?? null)
      clearCartForNextSale({
        keepDispatch: true,
        notice: data?.receipt_number
          ? `Receipt ${data.receipt_number} posted. Add products for the next sale.`
          : 'Collection saved.',
      })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['collection-history'] })
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] })
    },
  })

  function clearCartForNextSale(options?: { keepDispatch?: boolean; notice?: string }) {
    setCart([])
    setPaymentMethod('cash')
    setAmountTendered('')
    setPaymentRef('')
    if (!options?.keepDispatch) setDispatchId('')
    setLastStatus(null)
    confirm.reset()
    setSessionNo((n) => n + 1)
    if (options?.notice) setSessionNotice(options.notice)
  }

  function startNewCollection() {
    clearCartForNextSale({ notice: 'New collection started — tap a product to add it to the cart.' })
  }

  const todayTotal = recentCollections
    .filter((r) => r.collected_at.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((s, r) => s + Number(r.total_amount), 0)

  return (
    <div>
      <PageHeader
        title="Daily Collections (POS)"
        description="Record product sales and collections, issue receipts, and track daily earnings."
        icon={<HandCoins className="h-7 w-7" />}
        actions={
          <Button type="button" onClick={startNewCollection}>
            + New Collection
          </Button>
        }
      />
      {sessionNotice ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          {sessionNotice}
        </div>
      ) : null}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard label="Posted today (DB)" value={formatPeso(todayTotal)} icon={HandCoins} />
        <KpiCard label="Cart total" value={formatPeso(subtotal)} icon={ShoppingCart} />
        <KpiCard label="Payment" value={paymentMethod.toUpperCase()} icon={HandCoins} />
        <KpiCard label="Last receipt" value={lastReceipt ?? '—'} icon={HandCoins} />
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {products.map((p) => (
              <Button
                key={p.id}
                variant={p.is_default ? 'default' : 'outline'}
                className="w-full justify-between"
                onClick={() => addProduct(p.id, p.name, p.unit_price)}
              >
                {p.name}
                <CurrencyDisplay amount={p.unit_price} />
              </Button>
            ))}
            {!products.length ? (
              <p className="text-sm text-slate-500">Run migration 025 to seed POS products or add products in the database.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Link to trip (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="dispatch">Active dispatch</Label>
            <select
              id="dispatch"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={dispatchId}
              onChange={(e) => setDispatchId(e.target.value)}
            >
              <option value="">No dispatch linked</option>
              {dispatches.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dispatch_number} — {d.vehicles?.plate_number ?? ''} / {d.drivers?.full_name ?? ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current cart · Sale #{sessionNo}</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">Add products from the list above.</p>
            ) : (
              <ul className="mb-4 space-y-2 text-sm">
                {cart.map((item) => (
                  <li key={item.item_type} className="flex items-center justify-between gap-2">
                    <span>
                      {item.description} — <CurrencyDisplay amount={item.unit_price} />
                    </span>
                    <span className="flex items-center gap-2">
                      <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(item.item_type, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(item.item_type, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <CurrencyDisplay amount={multiplyMoney(item.unit_price, item.quantity)} />
                      <button type="button" onClick={() => setCart((c) => c.filter((x) => x.item_type !== item.item_type))}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex justify-between text-lg font-bold text-green-700">
              <span>Total</span>
              <CurrencyDisplay amount={subtotal} />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['cash', 'qrph', 'gcash', 'maya'] as const).map((m) => (
                <Button key={m} size="sm" variant={paymentMethod === m ? 'default' : 'outline'} onClick={() => setPaymentMethod(m)}>
                  {m.toUpperCase()}
                </Button>
              ))}
            </div>
            {paymentMethod === 'cash' ? (
              <Input
                className="mt-3"
                placeholder="Amount tendered"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
              />
            ) : (
              <Input
                className="mt-3"
                placeholder="Payment reference / txn ID"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            )}
            <Button className="mt-4 w-full" disabled={!cart.length || confirm.isPending} onClick={() => confirm.mutate()}>
              Record collection
            </Button>
            {confirm.error ? <p className="mt-2 text-sm text-red-600">{(confirm.error as Error).message}</p> : null}
            {lastStatus === 'pending' ? (
              <p className="mt-2 text-sm text-amber-800">Digital payment saved as pending verification (no GL post until confirmed).</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent collections</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Receipt</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCollections.map((r) => (
                <tr key={`${r.receipt_number}-${r.collected_at}`} className="border-t">
                  <td className="px-4 py-2">{r.receipt_number ?? '—'}</td>
                  <td className="px-4 py-2">
                    <CurrencyDisplay amount={r.total_amount} />
                  </td>
                  <td className="px-4 py-2">{r.payment_method}</td>
                  <td className="px-4 py-2">{r.verification_status}</td>
                  <td className="px-4 py-2">{new Date(r.collected_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}