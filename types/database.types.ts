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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      job_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          job_id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          job_id: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          job_id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          created_at: string
          id: string
          job_id: string
          photo_type: string
          storage_url: string
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          photo_type: string
          storage_url: string
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: string
          storage_url?: string
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string
          assigned_at: string | null
          assigned_tech_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          lat: number | null
          lng: number | null
          location_type: string | null
          notes: string | null
          price_cents: number | null
          service_type: string
          service_variant: string | null
          source: string
          started_at: string | null
          status: string
          tenant_id: string
          tracking_expires_at: string | null
          tracking_token: string
          vehicle_class: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          address: string
          assigned_at?: string | null
          assigned_tech_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_type?: string | null
          notes?: string | null
          price_cents?: number | null
          service_type: string
          service_variant?: string | null
          source?: string
          started_at?: string | null
          status?: string
          tenant_id: string
          tracking_expires_at?: string | null
          tracking_token?: string
          vehicle_class?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          address?: string
          assigned_at?: string | null
          assigned_tech_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_type?: string | null
          notes?: string | null
          price_cents?: number | null
          service_type?: string
          service_variant?: string | null
          source?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          tracking_expires_at?: string | null
          tracking_token?: string
          vehicle_class?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_tech_id_fkey"
            columns: ["assigned_tech_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_fees: {
        Row: {
          city: string
          country_code: string
          created_at: string
          fee_cents: number
          fee_tier: number
          id: string
          is_active: boolean
          state_code: string
          tenant_id: string
        }
        Insert: {
          city: string
          country_code?: string
          created_at?: string
          fee_cents: number
          fee_tier: number
          id?: string
          is_active?: boolean
          state_code: string
          tenant_id: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          fee_cents?: number
          fee_tier?: number
          id?: string
          is_active?: boolean
          state_code?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          from_number: string
          id: string
          job_id: string | null
          status: string
          tenant_id: string
          to_number: string
          twilio_sid: string | null
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          from_number: string
          id?: string
          job_id?: string | null
          status?: string
          tenant_id: string
          to_number: string
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          from_number?: string
          id?: string
          job_id?: string | null
          status?: string
          tenant_id?: string
          to_number?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          base_price_cents: number
          created_at: string
          disposal_fee_cents: number
          id: string
          is_active: boolean
          location_type: string
          mobile_fee_cents: number
          service_type: string
          tax_rate: number
          tenant_id: string
          vehicle_class: string
        }
        Insert: {
          base_price_cents?: number
          created_at?: string
          disposal_fee_cents?: number
          id?: string
          is_active?: boolean
          location_type?: string
          mobile_fee_cents?: number
          service_type: string
          tax_rate?: number
          tenant_id: string
          vehicle_class?: string
        }
        Update: {
          base_price_cents?: number
          created_at?: string
          disposal_fee_cents?: number
          id?: string
          is_active?: boolean
          location_type?: string
          mobile_fee_cents?: number
          service_type?: string
          tax_rate?: number
          tenant_id?: string
          vehicle_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          clicked_at: string | null
          customer_phone: string
          id: string
          job_id: string
          review_url: string
          sent_at: string
          tenant_id: string
          twilio_sid: string | null
        }
        Insert: {
          clicked_at?: string | null
          customer_phone: string
          id?: string
          job_id: string
          review_url: string
          sent_at?: string
          tenant_id: string
          twilio_sid?: string | null
        }
        Update: {
          clicked_at?: string | null
          customer_phone?: string
          id?: string
          job_id?: string
          review_url?: string
          sent_at?: string
          tenant_id?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_documents: {
        Row: {
          category: string
          content_markdown: string
          created_at: string
          id: string
          is_published: boolean
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content_markdown?: string
          created_at?: string
          id?: string
          is_published?: boolean
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_markdown?: string
          created_at?: string
          id?: string
          is_published?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          after_hours_end: string
          after_hours_fee_cents: number
          after_hours_start: string
          created_at: string
          google_review_url: string | null
          highway_minimum_fee_cents: number
          id: string
          logo_url: string | null
          name: string
          plan_tier: string
          primary_color: string
          slug: string
          stripe_account_id: string | null
          twilio_number: string | null
        }
        Insert: {
          after_hours_end?: string
          after_hours_fee_cents?: number
          after_hours_start?: string
          created_at?: string
          google_review_url?: string | null
          highway_minimum_fee_cents?: number
          id?: string
          logo_url?: string | null
          name: string
          plan_tier?: string
          primary_color?: string
          slug: string
          stripe_account_id?: string | null
          twilio_number?: string | null
        }
        Update: {
          after_hours_end?: string
          after_hours_fee_cents?: number
          after_hours_start?: string
          created_at?: string
          google_review_url?: string | null
          highway_minimum_fee_cents?: number
          id?: string
          logo_url?: string | null
          name?: string
          plan_tier?: string
          primary_color?: string
          slug?: string
          stripe_account_id?: string | null
          twilio_number?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          role: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          name: string
          phone?: string | null
          role: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
