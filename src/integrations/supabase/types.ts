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
      farm_settings: {
        Row: {
          currency: string
          id: number
          kwh_price: number
        }
        Insert: {
          currency?: string
          id?: number
          kwh_price?: number
        }
        Update: {
          currency?: string
          id?: number
          kwh_price?: number
        }
        Relationships: []
      }
      filament_inventory: {
        Row: {
          brand: string
          color_hex: string
          cost_per_kg: number
          created_at: string
          id: string
          material: string
          remaining_g: number
          spool_weight_g: number
        }
        Insert: {
          brand?: string
          color_hex?: string
          cost_per_kg?: number
          created_at?: string
          id?: string
          material: string
          remaining_g?: number
          spool_weight_g?: number
        }
        Update: {
          brand?: string
          color_hex?: string
          cost_per_kg?: number
          created_at?: string
          id?: string
          material?: string
          remaining_g?: number
          spool_weight_g?: number
        }
        Relationships: []
      }
      operators: {
        Row: {
          active: boolean
          created_at: string
          hourly_cost: number
          id: string
          name: string
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          hourly_cost?: number
          id?: string
          name: string
          role?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          hourly_cost?: number
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      partner_splits: {
        Row: {
          created_at: string
          id: string
          partner_name: string
          share_percentage: number
        }
        Insert: {
          created_at?: string
          id?: string
          partner_name: string
          share_percentage?: number
        }
        Update: {
          created_at?: string
          id?: string
          partner_name?: string
          share_percentage?: number
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          assigned_printer_id: string | null
          created_at: string
          customer_name: string
          energy_cost: number
          filament_deducted: boolean
          filament_id: string | null
          id: string
          job_name: string
          material_cost: number
          print_time_hours: number
          profit_margin: number
          setup_fee: number
          status: string
          total_price: number
          weight_grams: number
        }
        Insert: {
          assigned_printer_id?: string | null
          created_at?: string
          customer_name?: string
          energy_cost?: number
          filament_deducted?: boolean
          filament_id?: string | null
          id?: string
          job_name: string
          material_cost?: number
          print_time_hours?: number
          profit_margin?: number
          setup_fee?: number
          status?: string
          total_price?: number
          weight_grams?: number
        }
        Update: {
          assigned_printer_id?: string | null
          created_at?: string
          customer_name?: string
          energy_cost?: number
          filament_deducted?: boolean
          filament_id?: string | null
          id?: string
          job_name?: string
          material_cost?: number
          print_time_hours?: number
          profit_margin?: number
          setup_fee?: number
          status?: string
          total_price?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_assigned_printer_id_fkey"
            columns: ["assigned_printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_filament_id_fkey"
            columns: ["filament_id"]
            isOneToOne: false
            referencedRelation: "filament_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          kwh_consumption: number
          model: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          kwh_consumption?: number
          model?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          kwh_consumption?: number
          model?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      production_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          job_id: string | null
          label: string
          notes: string
          operator_id: string | null
          paused_at: string | null
          paused_seconds: number
          printer_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          label?: string
          notes?: string
          operator_id?: string | null
          paused_at?: string | null
          paused_seconds?: number
          printer_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          job_id?: string | null
          label?: string
          notes?: string
          operator_id?: string | null
          paused_at?: string | null
          paused_seconds?: number
          printer_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "print_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sessions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sessions_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          color_hex: string
          cost_price: number
          created_at: string
          description: string
          id: string
          min_quantity: number
          name: string
          quantity: number
          sale_price: number
          sku: string
          updated_at: string
        }
        Insert: {
          category?: string
          color_hex?: string
          cost_price?: number
          created_at?: string
          description?: string
          id?: string
          min_quantity?: number
          name: string
          quantity?: number
          sale_price?: number
          sku?: string
          updated_at?: string
        }
        Update: {
          category?: string
          color_hex?: string
          cost_price?: number
          created_at?: string
          description?: string
          id?: string
          min_quantity?: number
          name?: string
          quantity?: number
          sale_price?: number
          sku?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
