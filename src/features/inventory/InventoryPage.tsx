import { useState } from 'react'
import { Package } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { supabase } from '@/lib/supabase'

export function InventoryPage() {
  const qc = useQueryClient()
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [unitCost, setUnitCost] = useState('0')
  const [reorder, setReorder] = useState('0')
  const [moveItemId, setMoveItemId] = useState('')
  const [moveQty, setMoveQty] = useState('')
  const [moveType, setMoveType] = useState<'receive' | 'issue'>('receive')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_items').select('*').order('name')
      if (error) throw error
      return data as {
        id: string
        sku: string
        name: string
        quantity_on_hand: string
        reorder_level: string
        unit_cost: string
      }[]
    },
  })

  const { data: movements = [] } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, inventory_items(name, sku)')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data
    },
  })

  const addItem = useMutation({
    mutationFn: async () => {
      if (!sku.trim() || !name.trim()) throw new Error('SKU and name are required.')
      const { error } = await supabase.from('inventory_items').insert({
        sku: sku.trim(),
        name: name.trim(),
        unit_cost: Number(unitCost) || 0,
        reorder_level: Number(reorder) || 0,
        quantity_on_hand: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setSku('')
      setName('')
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })

  const stockMove = useMutation({
    mutationFn: async () => {
      const qty = Number(moveQty)
      if (!moveItemId || !qty || qty <= 0) throw new Error('Select item and quantity.')
      const item = items.find((i) => i.id === moveItemId)
      if (!item) throw new Error('Item not found.')
      const { error } = await supabase.rpc('post_inventory_movement', {
        p_item_id: moveItemId,
        p_movement_type: moveType,
        p_quantity: qty,
        p_reference: moveType === 'receive' ? 'Stock receive' : 'Stock issue',
      })
      if (error) throw error
    },
    onSuccess: () => {
      setMoveQty('')
      qc.invalidateQueries({ queryKey: ['inventory-items'] })
      qc.invalidateQueries({ queryKey: ['inventory-movements'] })
    },
  })

  const lowStock = items.filter((i) => Number(i.quantity_on_hand) <= Number(i.reorder_level))

  return (
    <div>
      <PageHeader title="Inventory Management" description="Items, stock levels, and movement history." icon={<Package className="h-7 w-7" />} />
      {lowStock.length > 0 ? (
        <p className="mb-4 text-sm text-amber-800">
          Low stock: {lowStock.map((i) => `${i.name} (${i.quantity_on_hand})`).join(', ')}
        </p>
      ) : null}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add item</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Unit cost" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            <Input placeholder="Reorder level" inputMode="decimal" value={reorder} onChange={(e) => setReorder(e.target.value)} />
            <Button onClick={() => addItem.mutate()} disabled={addItem.isPending}>
              Save item
            </Button>
            {addItem.error ? <p className="text-sm text-red-600">{(addItem.error as Error).message}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock movement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <Label>Item</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={moveItemId}
                onChange={(e) => setMoveItemId(e.target.value)}
              >
                <option value="">Select…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} — {i.name} (on hand {i.quantity_on_hand})
                  </option>
                ))}
              </select>
            </div>
            <RequestMoveType moveType={moveType} setMoveType={setMoveType} />
            <Input placeholder="Quantity" inputMode="decimal" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
            <Button onClick={() => stockMove.mutate()} disabled={stockMove.isPending}>
              Post movement
            </Button>
            {stockMove.error ? <p className="text-sm text-red-600">{(stockMove.error as Error).message}</p> : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>On hand</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Qty</th>
                  <th className="px-4 py-2 text-left">Unit cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-2">{i.sku}</td>
                    <td className="px-4 py-2">{i.name}</td>
                    <td className="px-4 py-2">{i.quantity_on_hand}</td>
                    <td className="px-4 py-2">
                      <CurrencyDisplay amount={i.unit_cost} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent movements</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Qty</th>
                <th className="px-4 py-2 text-left">When</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((row) => {
                const m = row as {
                  id: string
                  movement_type: string
                  quantity: string
                  created_at: string
                  inventory_items: { name: string; sku: string } | null
                }
                return (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2">{m.inventory_items?.name ?? '—'}</td>
                    <td className="px-4 py-2">{m.movement_type}</td>
                    <td className="px-4 py-2">{m.quantity}</td>
                    <td className="px-4 py-2">{new Date(m.created_at).toLocaleString()}</td>
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

function RequestMoveType({
  moveType,
  setMoveType,
}: {
  moveType: 'receive' | 'issue'
  setMoveType: (v: 'receive' | 'issue') => void
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant={moveType === 'receive' ? 'default' : 'outline'} onClick={() => setMoveType('receive')}>
        Receive
      </Button>
      <Button type="button" size="sm" variant={moveType === 'issue' ? 'default' : 'outline'} onClick={() => setMoveType('issue')}>
        Issue
      </Button>
    </div>
  )
}