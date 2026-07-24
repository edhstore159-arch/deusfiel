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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assistant_conversations: {
        Row: {
          church_id: string
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          church_id?: string
          created_at?: string
          created_by: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          church_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          church_id?: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          church_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          checkout_code_hash: string | null
          checkout_guardian_id: string | null
          child_id: string
          church_id: string | null
          created_at: string
          event_id: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          checkout_code_hash?: string | null
          checkout_guardian_id?: string | null
          child_id: string
          church_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          checkout_code_hash?: string | null
          checkout_guardian_id?: string | null
          child_id?: string
          church_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_checkout_guardian_id_fkey"
            columns: ["checkout_guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      child_guardians: {
        Row: {
          child_id: string
          created_at: string
          guardian_id: string
          id: string
          is_pickup_authorized: boolean
          relationship: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          guardian_id: string
          id?: string
          is_pickup_authorized?: boolean
          relationship?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          guardian_id?: string
          id?: string
          is_pickup_authorized?: boolean
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          active: boolean
          allergies: string | null
          birth_date: string | null
          church_id: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          allergies?: string | null
          birth_date?: string | null
          church_id?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          allergies?: string | null
          birth_date?: string | null
          church_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      couple_ministry_signups: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          source_slug: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source_slug?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source_slug?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          active: boolean
          church_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          church_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          church_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_monthly: {
        Row: {
          church_id: string
          created_at: string
          created_by: string
          donations: number
          expenses: number
          id: string
          month: string
          notes: string | null
          offerings: number
          tithes: number
          updated_at: string
        }
        Insert: {
          church_id?: string
          created_at?: string
          created_by: string
          donations?: number
          expenses?: number
          id?: string
          month: string
          notes?: string | null
          offerings?: number
          tithes?: number
          updated_at?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          created_by?: string
          donations?: number
          expenses?: number
          id?: string
          month?: string
          notes?: string | null
          offerings?: number
          tithes?: number
          updated_at?: string
        }
        Relationships: []
      }
      guardians: {
        Row: {
          church_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          church_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_ministry_signups: {
        Row: {
          child_age: number | null
          child_name: string
          created_at: string
          email: string | null
          id: string
          message: string | null
          parent_name: string
          phone: string | null
          source_slug: string
        }
        Insert: {
          child_age?: number | null
          child_name: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          parent_name: string
          phone?: string | null
          source_slug?: string
        }
        Update: {
          child_age?: number | null
          child_name?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          parent_name?: string
          phone?: string | null
          source_slug?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          birth_date: string | null
          church_id: string
          created_at: string
          created_by: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          ministry: string | null
          notes: string | null
          participation: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          church_id?: string
          created_at?: string
          created_by: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          ministry?: string | null
          notes?: string | null
          participation?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          church_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          ministry?: string | null
          notes?: string | null
          participation?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel: string
          child_id: string | null
          church_id: string | null
          content: string
          created_at: string
          guardian_id: string | null
          id: string
          sender_user_id: string | null
        }
        Insert: {
          channel?: string
          child_id?: string | null
          church_id?: string | null
          content: string
          created_at?: string
          guardian_id?: string | null
          id?: string
          sender_user_id?: string | null
        }
        Update: {
          channel?: string
          child_id?: string | null
          church_id?: string | null
          content?: string
          created_at?: string
          guardian_id?: string | null
          id?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          created_at: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ministry_image_cache: {
        Row: {
          id: string
          images: string[]
          ministry_id: string
          sources: Json
          updated_at: string
        }
        Insert: {
          id?: string
          images?: string[]
          ministry_id: string
          sources?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          images?: string[]
          ministry_id?: string
          sources?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_image_cache_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: true
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          church_id: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          church_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wa_conversations: {
        Row: {
          created_at: string
          current_strategy: string | null
          id: string
          member_name: string | null
          metadata: Json | null
          phone: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_strategy?: string | null
          id?: string
          member_name?: string | null
          metadata?: Json | null
          phone: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_strategy?: string | null
          id?: string
          member_name?: string | null
          metadata?: Json | null
          phone?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_type: string | null
          metadata: Json | null
          strategy_id: string | null
          strategy_name: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          strategy_id?: string | null
          strategy_name?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          strategy_id?: string | null
          strategy_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "wa_strategies"
            referencedColumns: ["id"]
          }
        ]
      }
      wa_strategies: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          label: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          label: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_church_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "leader" | "volunteer"
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
      app_role: ["admin", "user", "leader", "volunteer"],
    },
  },
} as const
