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
      app_settings: {
        Row: {
          id: boolean
          logo_url: string | null
          nightclub_name: string
          slogan: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          logo_url?: string | null
          nightclub_name?: string
          slogan?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          logo_url?: string | null
          nightclub_name?: string
          slogan?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bars: {
        Row: {
          active: boolean
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          password_hash: string
          subdomain: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          password_hash: string
          subdomain?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          password_hash?: string
          subdomain?: string | null
        }
        Relationships: []
      }
      complimentary_tickets: {
        Row: {
          created_at: string
          entry_id: string | null
          event_id: string | null
          guest_name: string
          id: string
          notes: string | null
          people_count: number
          quantity: number
          shift_id: string
          ticket_category: string
          ticket_type_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          event_id?: string | null
          guest_name: string
          id?: string
          notes?: string | null
          people_count?: number
          quantity?: number
          shift_id: string
          ticket_category: string
          ticket_type_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          event_id?: string | null
          guest_name?: string
          id?: string
          notes?: string | null
          people_count?: number
          quantity?: number
          shift_id?: string
          ticket_category?: string
          ticket_type_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complimentary_tickets_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_tickets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complimentary_tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          active: boolean
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          event_date: string | null
          event_time: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          event_date?: string | null
          event_time?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          event_date?: string | null
          event_time?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          cost: number | null
          created_at: string
          id: string
          name: string
          price: number
          stock: number | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          name: string
          price?: number
          stock?: number | null
        }
        Update: {
          active?: boolean
          category?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          name?: string
          price?: number
          stock?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          item_kind: string
          name: string
          people_count: number
          product_id: string | null
          quantity: number
          sale_id: string
          subtotal: number
          ticket_type_id: string | null
          unit_price: number
          wristband_id: string | null
        }
        Insert: {
          id?: string
          item_kind: string
          name: string
          people_count?: number
          product_id?: string | null
          quantity?: number
          sale_id: string
          subtotal?: number
          ticket_type_id?: string | null
          unit_price?: number
          wristband_id?: string | null
        }
        Update: {
          id?: string
          item_kind?: string
          name?: string
          people_count?: number
          product_id?: string | null
          quantity?: number
          sale_id?: string
          subtotal?: number
          ticket_type_id?: string | null
          unit_price?: number
          wristband_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_wristband_id_fkey"
            columns: ["wristband_id"]
            isOneToOne: false
            referencedRelation: "wristbands"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          bar_id: string | null
          cancelled: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          entry_id: string | null
          event_id: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_number: number
          shift_id: string
          total: number
          user_id: string
        }
        Insert: {
          bar_id?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          entry_id?: string | null
          event_id?: string | null
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_number?: number
          shift_id: string
          total?: number
          user_id: string
        }
        Update: {
          bar_id?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          entry_id?: string | null
          event_id?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_number?: number
          shift_id?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_cash: number | null
          bar_id: string | null
          closed_at: string | null
          entry_id: string | null
          event_id: string | null
          id: string
          initial_cash: number
          kind: Database["public"]["Enums"]["shift_kind"]
          opened_at: string
          status: string
          user_id: string
        }
        Insert: {
          actual_cash?: number | null
          bar_id?: string | null
          closed_at?: string | null
          entry_id?: string | null
          event_id?: string | null
          id?: string
          initial_cash?: number
          kind: Database["public"]["Enums"]["shift_kind"]
          opened_at?: string
          status?: string
          user_id: string
        }
        Update: {
          actual_cash?: number | null
          bar_id?: string | null
          closed_at?: string | null
          entry_id?: string | null
          event_id?: string | null
          id?: string
          initial_cash?: number
          kind?: Database["public"]["Enums"]["shift_kind"]
          opened_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      staff_consumptions: {
        Row: {
          bar_id: string | null
          created_at: string
          event_id: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          shift_id: string
          staff_category: string
          staff_member_id: string
          staff_name: string
          user_id: string
        }
        Insert: {
          bar_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          shift_id: string
          staff_category: string
          staff_member_id: string
          staff_name: string
          user_id: string
        }
        Update: {
          bar_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          shift_id?: string
          staff_category?: string
          staff_member_id?: string
          staff_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_consumptions_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_consumptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_consumptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_consumptions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_consumptions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          category: string
          created_at: string
          full_name: string
          id: string
          notes: string | null
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          active: boolean
          id: string
          is_complimentary: boolean
          name: string
          people_per_ticket: number
          price: number
        }
        Insert: {
          active?: boolean
          id?: string
          is_complimentary?: boolean
          name: string
          people_per_ticket?: number
          price?: number
        }
        Update: {
          active?: boolean
          id?: string
          is_complimentary?: boolean
          name?: string
          people_per_ticket?: number
          price?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wristbands: {
        Row: {
          active: boolean
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_username: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "cashier" | "disabled" | "platform_admin"
      payment_method: "cash" | "qr" | "card"
      shift_kind: "bar" | "entry"
      staff_category:
        | "dj"
        | "technical"
        | "security"
        | "photography"
        | "rrpp"
        | "owner"
        | "management"
        | "guest"
      workstation_kind: "bar" | "entry"
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
      app_role: ["superadmin", "cashier", "disabled", "platform_admin"],
      payment_method: ["cash", "qr", "card"],
      shift_kind: ["bar", "entry"],
      staff_category: [
        "dj",
        "technical",
        "security",
        "photography",
        "rrpp",
        "owner",
        "management",
        "guest",
      ],
      workstation_kind: ["bar", "entry"],
    },
  },
} as const
