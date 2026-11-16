import { forwardRef, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

const BUCKET = 'member-docs'

export function DocumentsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [expires, setExpires] = useState('')
  const [cabinet, setCabinet] = useState('')

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      return data as {
        id: string
        title: string
        category: string
        storage_path: string
        expires_on: string | null
        cabinet_location: string | null
        created_at: string
      }[]
    },
  })

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0]
      if (!file) throw new Error('Choose a file.')
      if (!title.trim()) throw new Error('Title is required.')

      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (upErr) throw upErr

      const { error: insErr } = await supabase.from('documents').insert({
        title: title.trim(),
        category,
        storage_path: path,
        expires_on: expires || null,
        cabinet_location: cabinet.trim() || null,
        uploaded_by: user?.id ?? null,
      })
      if (insErr) throw insErr
    },
    onSuccess: () => {
      setTitle('')
      setExpires('')
      setCabinet('')
      if (fileRef.current) fileRef.current.value = ''
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const download = useMutation({
    mutationFn: async (storagePath: string) => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
    },
  })

  return (
    <div>
      <PageHeader title="Document Management" description="Upload, categorize, and download cooperative documents." icon={<FileText className="h-7 w-7" />} />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload document</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {['general', 'membership', 'vehicle', 'finance', 'legal'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Expires on (optional)</Label>
            <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <div>
            <Label>Cabinet / shelf (hard copy)</Label>
            <Input placeholder="e.g. Cabinet A-3, Drawer 2" value={cabinet} onChange={(e) => setCabinet(e.target.value)} />
          </div>
          <SignalFileInput ref={fileRef} />
          <Button onClick={() => upload.mutate()} disabled={upload.isPending}>
            Upload to storage
          </Button>
          {upload.error ? <p className="text-sm text-red-600">{(upload.error as Error).message}</p> : null}
          <p className="text-xs text-slate-500">
            Uses Supabase bucket <code className="text-xs">{BUCKET}</code>. Run migration 013 if upload fails.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No documents yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Cabinet</th>
                  <th className="px-4 py-2 text-left">Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-2">{d.title}</td>
                    <td className="px-4 py-2">{d.category}</td>
                    <td className="px-4 py-2">{d.cabinet_location ?? '—'}</td>
                    <td className="px-4 py-2">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => download.mutate(d.storage_path)} disabled={download.isPending}>
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const SignalFileInput = forwardRef<HTMLInputElement>(function SignalFileInput(_, ref) {
  return (
    <div>
      <Label>File</Label>
      <Input ref={ref} type="file" className="mt-1" />
    </div>
  )
})