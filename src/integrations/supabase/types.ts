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
      ai_agents: {
        Row: {
          created_at: string
          id: string
          knowledge: string
          model: string
          name: string
          role: string | null
          system_prompt: string
          temperature: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          knowledge?: string
          model?: string
          name: string
          role?: string | null
          system_prompt?: string
          temperature?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          knowledge?: string
          model?: string
          name?: string
          role?: string | null
          system_prompt?: string
          temperature?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          case_summary: string | null
          city: string | null
          client_name: string
          created_at: string
          email: string | null
          id: string
          legal_area: string | null
          phone: string | null
          raw_payload: Json
          session_id: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          case_summary?: string | null
          city?: string | null
          client_name: string
          created_at?: string
          email?: string | null
          id?: string
          legal_area?: string | null
          phone?: string | null
          raw_payload?: Json
          session_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          case_summary?: string | null
          city?: string | null
          client_name?: string
          created_at?: string
          email?: string | null
          id?: string
          legal_area?: string | null
          phone?: string | null
          raw_payload?: Json
          session_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      case_analyses: {
        Row: {
          acertividade: number
          admin_notes: string
          area: string
          chance_exito: number
          created_at: string
          fundamentos: Json
          id: string
          motivo: string | null
          proxima_pergunta: string | null
          qualificacao: string
          resumo: string | null
          session_id: string | null
          updated_at: string
          user_id: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          acertividade?: number
          admin_notes?: string
          area?: string
          chance_exito?: number
          created_at?: string
          fundamentos?: Json
          id: string
          motivo?: string | null
          proxima_pergunta?: string | null
          qualificacao?: string
          resumo?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          acertividade?: number
          admin_notes?: string
          area?: string
          chance_exito?: number
          created_at?: string
          fundamentos?: Json
          id?: string
          motivo?: string | null
          proxima_pergunta?: string | null
          qualificacao?: string
          resumo?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: []
      }
      case_transcripts: {
        Row: {
          analysis_id: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_transcripts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "case_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_objects: {
        Row: {
          created_at: string
          id: string
          mime: string | null
          name: string
          path: string
          size: number
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime?: string | null
          name: string
          path: string
          size?: number
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string | null
          name?: string
          path?: string
          size?: number
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      cloud_sites: {
        Row: {
          created_at: string
          html: string
          id: string
          is_public: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html?: string
          id?: string
          is_public?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          is_public?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          message: string
          response: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          response?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          response?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      creative_assets: {
        Row: {
          created_at: string
          description: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          tags: string[]
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      debug_instructions: {
        Row: {
          applied_at: string | null
          attachments: Json
          created_at: string
          id: string
          instruction: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          applied_at?: string | null
          attachments?: Json
          created_at?: string
          id?: string
          instruction: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          applied_at?: string | null
          attachments?: Json
          created_at?: string
          id?: string
          instruction?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          kind: string
          paid: boolean
          prompt: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          paid?: boolean
          prompt?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          paid?: boolean
          prompt?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          ig_user_id: string
          ig_username: string | null
          page_id: string
          page_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_user_id: string
          ig_username?: string | null
          page_id: string
          page_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_user_id?: string
          ig_username?: string | null
          page_id?: string
          page_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          patient_id: string
          session_id: string
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          patient_id: string
          session_id: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          patient_id?: string
          session_id?: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          caption: string
          created_at: string
          error_message: string | null
          external_post_id: string | null
          id: string
          image_url: string
          platforms: string[]
          scheduled_at: string
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          image_url: string
          platforms?: string[]
          scheduled_at: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          image_url?: string
          platforms?: string[]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          patient_id: string
          price: number
          room_url: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["session_status"] | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          price: number
          room_url?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["session_status"] | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          price?: number
          room_url?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"] | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      therapist_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          therapist_id: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          therapist_id: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          therapist_id?: string
        }
        Relationships: []
      }
      therapist_profiles: {
        Row: {
          created_at: string
          crp: string | null
          education: string | null
          experience_years: number | null
          id: string
          is_available: boolean | null
          session_duration: number | null
          session_price: number | null
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crp?: string | null
          education?: string | null
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          session_duration?: number | null
          session_price?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crp?: string | null
          education?: string | null
          experience_years?: number | null
          id?: string
          is_available?: boolean | null
          session_duration?: number | null
          session_price?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
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
      whatsapp_messages: {
        Row: {
          contact_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          from_me: boolean
          id: string
          provider_message_id: string | null
          text: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          provider_message_id?: string | null
          text: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          provider_message_id?: string | null
          text?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "therapist" | "admin"
      post_status: "pending" | "posted" | "failed" | "cancelled"
      session_status: "scheduled" | "completed" | "cancelled" | "in_progress"
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
      app_role: ["patient", "therapist", "admin"],
      post_status: ["pending", "posted", "failed", "cancelled"],
      session_status: ["scheduled", "completed", "cancelled", "in_progress"],
    },
  },
} as const
