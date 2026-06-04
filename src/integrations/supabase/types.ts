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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent_hash: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      graine_franchise_applications: {
        Row: {
          address: string
          admin_notes: string | null
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          monthly_revenue: number | null
          neighborhood: string
          owner_id_url: string | null
          phone: string
          reviewed_at: string | null
          selected_product_ids: string[]
          shop_name: string
          shop_photo_url: string | null
          shop_type: string
          status: Database["public"]["Enums"]["graine_franchise_status"]
          user_id: string
        }
        Insert: {
          address: string
          admin_notes?: string | null
          city: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_revenue?: number | null
          neighborhood: string
          owner_id_url?: string | null
          phone: string
          reviewed_at?: string | null
          selected_product_ids?: string[]
          shop_name: string
          shop_photo_url?: string | null
          shop_type: string
          status?: Database["public"]["Enums"]["graine_franchise_status"]
          user_id: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_revenue?: number | null
          neighborhood?: string
          owner_id_url?: string | null
          phone?: string
          reviewed_at?: string | null
          selected_product_ids?: string[]
          shop_name?: string
          shop_photo_url?: string | null
          shop_type?: string
          status?: Database["public"]["Enums"]["graine_franchise_status"]
          user_id?: string
        }
        Relationships: []
      }
      graine_franchise_contracts: {
        Row: {
          address: string
          application_id: string
          city: string
          contract_number: string
          created_at: string
          franchisee_name: string
          franchisee_signature: string | null
          franchisee_signed_at: string | null
          id: string
          neighborhood: string
          resupply_quota_pct: number
          shop_name: string
          signed_by_admin: string
          user_id: string
        }
        Insert: {
          address: string
          application_id: string
          city: string
          contract_number?: string
          created_at?: string
          franchisee_name: string
          franchisee_signature?: string | null
          franchisee_signed_at?: string | null
          id?: string
          neighborhood: string
          resupply_quota_pct?: number
          shop_name: string
          signed_by_admin?: string
          user_id: string
        }
        Update: {
          address?: string
          application_id?: string
          city?: string
          contract_number?: string
          created_at?: string
          franchisee_name?: string
          franchisee_signature?: string | null
          franchisee_signed_at?: string | null
          id?: string
          neighborhood?: string
          resupply_quota_pct?: number
          shop_name?: string
          signed_by_admin?: string
          user_id?: string
        }
        Relationships: []
      }
      graine_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          quantity: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      msn_broadcasts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          link_label: string | null
          link_url: string | null
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_label?: string | null
          link_url?: string | null
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_label?: string | null
          link_url?: string | null
          title?: string
        }
        Relationships: []
      }
      msn_contracts: {
        Row: {
          address: string
          application_id: string
          city: string
          contract_number: string
          created_at: string
          id: string
          neighborhood: string
          partner_name: string
          partner_signature: string | null
          partner_signed_at: string | null
          relay_point_id: string | null
          signed_by_admin: string
          space_name: string
          user_id: string
        }
        Insert: {
          address: string
          application_id: string
          city: string
          contract_number?: string
          created_at?: string
          id?: string
          neighborhood: string
          partner_name: string
          partner_signature?: string | null
          partner_signed_at?: string | null
          relay_point_id?: string | null
          signed_by_admin?: string
          space_name: string
          user_id: string
        }
        Update: {
          address?: string
          application_id?: string
          city?: string
          contract_number?: string
          created_at?: string
          id?: string
          neighborhood?: string
          partner_name?: string
          partner_signature?: string | null
          partner_signed_at?: string | null
          relay_point_id?: string | null
          signed_by_admin?: string
          space_name?: string
          user_id?: string
        }
        Relationships: []
      }
      msn_deliveries: {
        Row: {
          at_relay_at: string | null
          circumstances: Json | null
          created_at: string
          delivered_at: string | null
          delivery_price: number
          estimated_distance_km: number | null
          id: string
          notes: string | null
          order_code: string | null
          order_image_url: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          picked_up_at: string | null
          provider_location: string | null
          provider_name: string
          provider_phone: string | null
          relay_point_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string | null
          user_id: string
        }
        Insert: {
          at_relay_at?: string | null
          circumstances?: Json | null
          created_at?: string
          delivered_at?: string | null
          delivery_price?: number
          estimated_distance_km?: number | null
          id?: string
          notes?: string | null
          order_code?: string | null
          order_image_url?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          picked_up_at?: string | null
          provider_location?: string | null
          provider_name: string
          provider_phone?: string | null
          relay_point_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code?: string | null
          user_id: string
        }
        Update: {
          at_relay_at?: string | null
          circumstances?: Json | null
          created_at?: string
          delivered_at?: string | null
          delivery_price?: number
          estimated_distance_km?: number | null
          id?: string
          notes?: string | null
          order_code?: string | null
          order_image_url?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          picked_up_at?: string | null
          provider_location?: string | null
          provider_name?: string
          provider_phone?: string | null
          relay_point_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "msn_deliveries_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "msn_relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      msn_delivery_scans: {
        Row: {
          action: string
          created_at: string
          delivery_id: string
          id: string
          note: string | null
          scanned_by: string
          scanner_role: string
        }
        Insert: {
          action: string
          created_at?: string
          delivery_id: string
          id?: string
          note?: string | null
          scanned_by: string
          scanner_role: string
        }
        Update: {
          action?: string
          created_at?: string
          delivery_id?: string
          id?: string
          note?: string | null
          scanned_by?: string
          scanner_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "msn_delivery_scans_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "msn_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      msn_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link_url: string | null
          recipient_id: string
          related_delivery_id: string | null
          related_relay_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link_url?: string | null
          recipient_id: string
          related_delivery_id?: string | null
          related_relay_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link_url?: string | null
          recipient_id?: string
          related_delivery_id?: string | null
          related_relay_id?: string | null
          title?: string
        }
        Relationships: []
      }
      msn_payment_services: {
        Row: {
          created_at: string
          id: string
          identifier: string
          instructions: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["payment_service_kind"]
          label: string
          link_url: string | null
          logo_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          instructions?: string | null
          is_active?: boolean
          kind: Database["public"]["Enums"]["payment_service_kind"]
          label: string
          link_url?: string | null
          logo_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          instructions?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["payment_service_kind"]
          label?: string
          link_url?: string | null
          logo_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      msn_pricing_config: {
        Row: {
          base_price: number
          holiday_active: boolean
          holiday_multiplier: number
          id: number
          price_per_km: number
          rain_active: boolean
          rain_multiplier: number
          strike_active: boolean
          strike_multiplier: number
          updated_at: string
          weekend_multiplier: number
        }
        Insert: {
          base_price?: number
          holiday_active?: boolean
          holiday_multiplier?: number
          id?: number
          price_per_km?: number
          rain_active?: boolean
          rain_multiplier?: number
          strike_active?: boolean
          strike_multiplier?: number
          updated_at?: string
          weekend_multiplier?: number
        }
        Update: {
          base_price?: number
          holiday_active?: boolean
          holiday_multiplier?: number
          id?: number
          price_per_km?: number
          rain_active?: boolean
          rain_multiplier?: number
          strike_active?: boolean
          strike_multiplier?: number
          updated_at?: string
          weekend_multiplier?: number
        }
        Relationships: []
      }
      msn_relay_applications: {
        Row: {
          address: string
          admin_notes: string | null
          city: string
          country: string
          created_at: string
          description: string | null
          id: string
          id_photo_url: string | null
          neighborhood: string
          phone: string
          reviewed_at: string | null
          space_name: string
          space_photo_url: string | null
          space_type: Database["public"]["Enums"]["relay_space_type"]
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          address: string
          admin_notes?: string | null
          city: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          id_photo_url?: string | null
          neighborhood: string
          phone: string
          reviewed_at?: string | null
          space_name: string
          space_photo_url?: string | null
          space_type: Database["public"]["Enums"]["relay_space_type"]
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          id_photo_url?: string | null
          neighborhood?: string
          phone?: string
          reviewed_at?: string | null
          space_name?: string
          space_photo_url?: string | null
          space_type?: Database["public"]["Enums"]["relay_space_type"]
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: []
      }
      msn_relay_points: {
        Row: {
          address: string | null
          city: string
          country: string
          created_at: string
          id: string
          is_blocked: boolean
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string
          owner_id: string | null
          phone: string | null
          rating: number | null
          space_type: Database["public"]["Enums"]["relay_space_type"]
          status: Database["public"]["Enums"]["relay_status"]
          total_reviews: number
          trust_level: Database["public"]["Enums"]["trust_level"]
        }
        Insert: {
          address?: string | null
          city: string
          country?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          space_type: Database["public"]["Enums"]["relay_space_type"]
          status?: Database["public"]["Enums"]["relay_status"]
          total_reviews?: number
          trust_level?: Database["public"]["Enums"]["trust_level"]
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          space_type?: Database["public"]["Enums"]["relay_space_type"]
          status?: Database["public"]["Enums"]["relay_status"]
          total_reviews?: number
          trust_level?: Database["public"]["Enums"]["trust_level"]
        }
        Relationships: []
      }
      msn_relay_reviews: {
        Row: {
          comment: string | null
          created_at: string
          delivery_id: string | null
          id: string
          rating: number
          relay_point_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          rating: number
          relay_point_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          rating?: number
          relay_point_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "msn_relay_reviews_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "msn_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msn_relay_reviews_relay_point_id_fkey"
            columns: ["relay_point_id"]
            isOneToOne: false
            referencedRelation: "msn_relay_points"
            referencedColumns: ["id"]
          },
        ]
      }
      msn_wallet_recharge_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          operator: string
          reviewed_at: string | null
          sender_phone: string
          status: Database["public"]["Enums"]["recharge_status"]
          transaction_id: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          operator: string
          reviewed_at?: string | null
          sender_phone: string
          status?: Database["public"]["Enums"]["recharge_status"]
          transaction_id: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          operator?: string
          reviewed_at?: string | null
          sender_phone?: string
          status?: Database["public"]["Enums"]["recharge_status"]
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          phone: string | null
          updated_at: string
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
          wallet_balance?: number
        }
        Relationships: []
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
      vtc_drivers: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          id: string
          id_photo_url: string | null
          is_approved: boolean
          is_blocked: boolean
          last_location_at: string | null
          phone: string
          rating: number
          status: Database["public"]["Enums"]["vtc_driver_status"]
          total_earnings: number
          total_rides: number
          user_id: string
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_plate: string | null
          vehicle_type: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          id?: string
          id_photo_url?: string | null
          is_approved?: boolean
          is_blocked?: boolean
          last_location_at?: string | null
          phone: string
          rating?: number
          status?: Database["public"]["Enums"]["vtc_driver_status"]
          total_earnings?: number
          total_rides?: number
          user_id: string
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          id?: string
          id_photo_url?: string | null
          is_approved?: boolean
          is_blocked?: boolean
          last_location_at?: string | null
          phone?: string
          rating?: number
          status?: Database["public"]["Enums"]["vtc_driver_status"]
          total_earnings?: number
          total_rides?: number
          user_id?: string
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type?: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Relationships: []
      }
      vtc_pricing_modifiers: {
        Row: {
          holiday_active: boolean
          holiday_mult: number
          id: number
          night_mult: number
          rain_active: boolean
          rain_mult: number
          rush_active: boolean
          rush_mult: number
          strike_active: boolean
          strike_mult: number
          updated_at: string
        }
        Insert: {
          holiday_active?: boolean
          holiday_mult?: number
          id?: number
          night_mult?: number
          rain_active?: boolean
          rain_mult?: number
          rush_active?: boolean
          rush_mult?: number
          strike_active?: boolean
          strike_mult?: number
          updated_at?: string
        }
        Update: {
          holiday_active?: boolean
          holiday_mult?: number
          id?: number
          night_mult?: number
          rain_active?: boolean
          rain_mult?: number
          rush_active?: boolean
          rush_mult?: number
          strike_active?: boolean
          strike_mult?: number
          updated_at?: string
        }
        Relationships: []
      }
      vtc_rides: {
        Row: {
          accepted_at: string | null
          applied_modifiers: Json
          base_price: number
          cancel_reason: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          distance_km: number
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_min: number
          final_price: number
          id: string
          notes: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          ride_code: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["vtc_ride_status"]
          vehicle_type: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Insert: {
          accepted_at?: string | null
          applied_modifiers?: Json
          base_price: number
          cancel_reason?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          distance_km: number
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_min: number
          final_price: number
          id?: string
          notes?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          ride_code?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["vtc_ride_status"]
          vehicle_type: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Update: {
          accepted_at?: string | null
          applied_modifiers?: Json
          base_price?: number
          cancel_reason?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          distance_km?: number
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          duration_min?: number
          final_price?: number
          id?: string
          notes?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          ride_code?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["vtc_ride_status"]
          vehicle_type?: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vtc_rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "vtc_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      vtc_settings: {
        Row: {
          base_price: number
          is_active: boolean
          price_per_km: number
          price_per_min: number
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Insert: {
          base_price?: number
          is_active?: boolean
          price_per_km?: number
          price_per_min?: number
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Update: {
          base_price?: number
          is_active?: boolean
          price_per_km?: number
          price_per_min?: number
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vtc_vehicle_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_tracking_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "relay_owner" | "user" | "super_admin" | "driver"
      application_status: "pending" | "approved" | "rejected"
      delivery_status:
        | "pending"
        | "picked_up"
        | "at_relay"
        | "delivered"
        | "cancelled"
      graine_franchise_status: "pending" | "approved" | "rejected"
      mobile_operator: "orange" | "moov" | "mtn" | "wave"
      payment_mode: "msn_delivery" | "direct_provider"
      payment_service_kind: "mobile_money" | "payment_link" | "crypto"
      recharge_status: "pending" | "approved" | "rejected"
      relay_space_type:
        | "shop"
        | "restaurant"
        | "maquis"
        | "establishment"
        | "individual"
        | "other"
      relay_status: "active" | "pending" | "suspended"
      trust_level: "standard" | "verified" | "premium"
      vtc_driver_status: "hors_ligne" | "en_ligne" | "occupe"
      vtc_ride_status:
        | "en_attente"
        | "accepte"
        | "en_cours"
        | "termine"
        | "annule"
      vtc_vehicle_type: "moto" | "voiture" | "tricycle" | "camion"
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
      app_role: ["admin", "relay_owner", "user", "super_admin", "driver"],
      application_status: ["pending", "approved", "rejected"],
      delivery_status: [
        "pending",
        "picked_up",
        "at_relay",
        "delivered",
        "cancelled",
      ],
      graine_franchise_status: ["pending", "approved", "rejected"],
      mobile_operator: ["orange", "moov", "mtn", "wave"],
      payment_mode: ["msn_delivery", "direct_provider"],
      payment_service_kind: ["mobile_money", "payment_link", "crypto"],
      recharge_status: ["pending", "approved", "rejected"],
      relay_space_type: [
        "shop",
        "restaurant",
        "maquis",
        "establishment",
        "individual",
        "other",
      ],
      relay_status: ["active", "pending", "suspended"],
      trust_level: ["standard", "verified", "premium"],
      vtc_driver_status: ["hors_ligne", "en_ligne", "occupe"],
      vtc_ride_status: [
        "en_attente",
        "accepte",
        "en_cours",
        "termine",
        "annule",
      ],
      vtc_vehicle_type: ["moto", "voiture", "tricycle", "camion"],
    },
  },
} as const
