import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export function useSystemSetting<T extends Record<string, unknown>>(key: string, defaults: T) {
  return useQuery({
    queryKey: ['system-settings', key],
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()
      if (error) throw error
      const stored = (data?.value as T | undefined) ?? {}
      return { ...defaults, ...stored }
    },
  })
}

export function useSaveSystemSetting(key: string) {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (value: Record<string, unknown>) => {
      const { error } = await supabase.from('system_settings').upsert({
        key,
        value,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-settings', key] }),
  })
}