export type UserType = 'staff' | 'member' | 'pending'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          user_type: UserType
          member_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          user_type?: UserType
          member_id?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      members: {
        Row: {
          id: string
          member_code: string
          full_name: string
          email: string | null
          contact_number: string | null
          address: string | null
          membership_type: string | null
          status: string
          date_of_membership: string | null
          user_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'created_at' | 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['members']['Insert']>
      }
      membership_applications: {
        Row: {
          id: string
          applicant_user_id: string | null
          full_name: string
          email: string | null
          contact_number: string | null
          membership_type: string | null
          status: string
          rejection_reason: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['membership_applications']['Row'],
          'id' | 'created_at'
        > & { id?: string }
        Update: Partial<Database['public']['Tables']['membership_applications']['Insert']>
      }
      vehicles: {
        Row: {
          id: string
          plate_number: string
          unit_number: string | null
          vehicle_type: string | null
          model: string | null
          capacity: number | null
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
      }
      dispatches: {
        Row: {
          id: string
          dispatch_number: string
          vehicle_id: string | null
          driver_id: string | null
          route_id: string | null
          scheduled_departure: string | null
          estimated_arrival: string | null
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['dispatches']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['dispatches']['Insert']>
      }
      collection_transactions: {
        Row: {
          id: string
          receipt_number: string | null
          dispatch_id: string | null
          total_amount: string
          payment_method: string
          status: string
          client_request_id: string | null
          collected_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['collection_transactions']['Row'],
          'id' | 'collected_at'
        > & { id?: string }
        Update: Partial<Database['public']['Tables']['collection_transactions']['Insert']>
      }
      journal_entries: {
        Row: {
          id: string
          reference: string
          description: string | null
          entry_date: string
          status: string
          source_type: string | null
          source_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: Record<string, never>
    Functions: {
      approve_membership_application: {
        Args: { application_id: string; reviewer_notes?: string }
        Returns: Json
      }
      confirm_collection: { Args: Json; Returns: Json }
      create_dispatch: { Args: Json; Returns: Json }
      post_journal_entry: { Args: Json; Returns: Json }
      bootstrap_admin: { Args: { admin_user_id: string }; Returns: undefined }
    }
    Enums: Record<string, never>
  }
}