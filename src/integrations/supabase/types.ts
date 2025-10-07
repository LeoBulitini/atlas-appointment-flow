export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string | null
          id: string
          service_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          id?: string
          service_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          business_id: string
          client_id: string
          created_at: string | null
          end_time: string | null
          id: string
          notes: string | null
          reminder_sent: boolean
          service_id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
          used_loyalty_redemption: boolean | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          business_id: string
          client_id: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean
          service_id: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
          used_loyalty_redemption?: boolean | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          business_id?: string
          client_id?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean
          service_id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
          used_loyalty_redemption?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_clients: {
        Row: {
          business_id: string
          client_id: string
          created_at: string | null
          first_appointment_date: string | null
          id: string
          last_appointment_date: string | null
          total_appointments: number | null
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string | null
          first_appointment_date?: string | null
          id?: string
          last_appointment_date?: string | null
          total_appointments?: number | null
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string | null
          first_appointment_date?: string | null
          id?: string
          last_appointment_date?: string | null
          total_appointments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_portfolio: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          media_data: string
          media_type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          media_data: string
          media_type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          media_data?: string
          media_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_portfolio_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_special_hours: {
        Row: {
          breaks: Json | null
          business_id: string
          close_time: string | null
          created_at: string
          date: string
          id: string
          is_closed: boolean
          notes: string | null
          open_time: string | null
        }
        Insert: {
          breaks?: Json | null
          business_id: string
          close_time?: string | null
          created_at?: string
          date: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          open_time?: string | null
        }
        Update: {
          breaks?: Json | null
          business_id?: string
          close_time?: string | null
          created_at?: string
          date?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_special_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          auto_confirm_appointments: boolean | null
          category: string
          city: string
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_id: string
          payment_methods: string[] | null
          phone: string
          postal_code: string | null
          price_range: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          address: string
          auto_confirm_appointments?: boolean | null
          category: string
          city: string
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          payment_methods?: string[] | null
          phone: string
          postal_code?: string | null
          price_range?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          auto_confirm_appointments?: boolean | null
          category?: string
          city?: string
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          payment_methods?: string[] | null
          phone?: string
          postal_code?: string | null
          price_range?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_context: Json | null
          error_message: string
          error_stack: string | null
          id: string
          page_url: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_context?: Json | null
          error_message: string
          error_stack?: string | null
          id?: string
          page_url: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_context?: Json | null
          error_message?: string
          error_stack?: string | null
          id?: string
          page_url?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          business_id: string
          category: string
          created_at: string | null
          description: string
          id: string
          payment_method: string | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          business_id: string
          category: string
          created_at?: string | null
          description: string
          id?: string
          payment_method?: string | null
          transaction_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          business_id?: string
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          payment_method?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_balances: {
        Row: {
          business_id: string
          client_id: string
          created_at: string | null
          id: string
          last_redemption_date: string | null
          points: number | null
          redemptions_count: number | null
          updated_at: string | null
          visits: number | null
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string | null
          id?: string
          last_redemption_date?: string | null
          points?: number | null
          redemptions_count?: number | null
          updated_at?: string | null
          visits?: number | null
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          last_redemption_date?: string | null
          points?: number | null
          redemptions_count?: number | null
          updated_at?: string | null
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          points_per_real: number | null
          points_required: number | null
          points_validity_days: number | null
          program_type: string
          qualifying_services: string[] | null
          reward_services: string[] | null
          reward_value: number | null
          updated_at: string | null
          visits_required: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points_per_real?: number | null
          points_required?: number | null
          points_validity_days?: number | null
          program_type: string
          qualifying_services?: string[] | null
          reward_services?: string[] | null
          reward_value?: number | null
          updated_at?: string | null
          visits_required?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          points_per_real?: number | null
          points_required?: number | null
          points_validity_days?: number | null
          program_type?: string
          qualifying_services?: string[] | null
          reward_services?: string[] | null
          reward_value?: number | null
          updated_at?: string | null
          visits_required?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          appointment_id: string | null
          business_id: string
          client_id: string
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          points_change: number | null
          type: string
          visits_change: number | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          client_id: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          points_change?: number | null
          type: string
          visits_change?: number | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          client_id?: string
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          points_change?: number | null
          type?: string
          visits_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          business_id: string
          cost_price: number | null
          created_at: string | null
          current_quantity: number
          id: string
          is_active: boolean | null
          minimum_quantity: number | null
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          business_id: string
          cost_price?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean | null
          minimum_quantity?: number | null
          name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          business_id?: string
          cost_price?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean | null
          minimum_quantity?: number | null
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          business_id: string
          client_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          client_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          is_public: boolean
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          movement_date: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          movement_date: string
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          movement_date?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_past_appointments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_appointment_if_available: {
        Args:
          | {
              p_appointment_date: string
              p_appointment_time: string
              p_auto_confirm?: boolean
              p_business_id: string
              p_client_id: string
              p_end_time: string
              p_notes: string
              p_service_id: string
            }
          | {
              p_appointment_date: string
              p_appointment_time: string
              p_auto_confirm?: boolean
              p_business_id: string
              p_client_id: string
              p_end_time: string
              p_notes: string
              p_service_id: string
              p_used_loyalty_redemption?: boolean
            }
          | {
              p_appointment_date: string
              p_appointment_time: string
              p_business_id: string
              p_client_id: string
              p_end_time: string
              p_notes: string
              p_service_id: string
            }
        Returns: Json
      }
      gbt_bit_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bpchar_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bytea_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_inet_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_numeric_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_text_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_timetz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_tstz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_out: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      appointment_status: "pending" | "confirmed" | "completed" | "cancelled"
      user_type: "client" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: ["pending", "confirmed", "completed", "cancelled"],
      user_type: ["client", "business"],
    },
  },
} as const
