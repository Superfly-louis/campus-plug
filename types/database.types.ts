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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_requests: {
        Row: {
          body: string | null
          buyer_id: string
          buyer_name: string
          campus: string
          category_id: string
          created_at: string
          id: string
          removal_reason: string | null
          status: string
          target_vendor_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          buyer_id: string
          buyer_name: string
          campus: string
          category_id: string
          created_at?: string
          id?: string
          removal_reason?: string | null
          status?: string
          target_vendor_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          buyer_id?: string
          buyer_name?: string
          campus?: string
          category_id?: string
          created_at?: string
          id?: string
          removal_reason?: string | null
          status?: string
          target_vendor_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requests_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
          vendor_id: string
          vendor_user_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
          vendor_id: string
          vendor_user_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
          vendor_id?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          order_id: string | null
          read_at: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
          updated_at: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          read_at?: string | null
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          read_at?: string | null
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needing_refund"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          next_attempt_at: string
          push_attempts: number
          push_last_error: string | null
          push_receipt_checked_at: string | null
          push_sent_at: string | null
          push_status: Database["public"]["Enums"]["push_status"]
          push_tickets: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          next_attempt_at?: string
          push_attempts?: number
          push_last_error?: string | null
          push_receipt_checked_at?: string | null
          push_sent_at?: string | null
          push_status?: Database["public"]["Enums"]["push_status"]
          push_tickets?: Json | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          next_attempt_at?: string
          push_attempts?: number
          push_last_error?: string | null
          push_receipt_checked_at?: string | null
          push_sent_at?: string | null
          push_status?: Database["public"]["Enums"]["push_status"]
          push_tickets?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          title_snapshot: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          title_snapshot: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          title_snapshot?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needing_refund"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reviews: {
        Row: {
          body: string | null
          buyer_id: string
          buyer_name: string
          created_at: string
          id: string
          order_id: string
          rating: number
          vendor_id: string
        }
        Insert: {
          body?: string | null
          buyer_id: string
          buyer_name: string
          created_at?: string
          id?: string
          order_id: string
          rating: number
          vendor_id: string
        }
        Update: {
          body?: string | null
          buyer_id?: string
          buyer_name?: string
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_needing_refund"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string | null
          buyer_name_snapshot: string
          buyer_note: string | null
          conversation_id: string | null
          created_at: string
          id: string
          meeting_point: string | null
          payment_due_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shop_name_snapshot: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          vendor_id: string | null
          vendor_user_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name_snapshot: string
          buyer_note?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          meeting_point?: string | null
          payment_due_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shop_name_snapshot: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          vendor_id?: string | null
          vendor_user_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name_snapshot?: string
          buyer_note?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          meeting_point?: string | null
          payment_due_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shop_name_snapshot?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          reference: string
          result: string | null
        }
        Insert: {
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          reference: string
          result?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          reference?: string
          result?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          access_code: string | null
          amount_pesewas: number
          authorization_url: string | null
          buyer_id: string | null
          channel: string | null
          commission_percent: number | null
          created_at: string
          currency: string
          id: string
          needs_refund: boolean
          order_id: string | null
          paid_at: string | null
          paystack_fee_pesewas: number | null
          platform_fee_pesewas: number | null
          provider: string
          reference: string
          status: string
          updated_at: string
          vendor_amount_pesewas: number | null
          vendor_user_id: string | null
        }
        Insert: {
          access_code?: string | null
          amount_pesewas: number
          authorization_url?: string | null
          buyer_id?: string | null
          channel?: string | null
          commission_percent?: number | null
          created_at?: string
          currency?: string
          id?: string
          needs_refund?: boolean
          order_id?: string | null
          paid_at?: string | null
          paystack_fee_pesewas?: number | null
          platform_fee_pesewas?: number | null
          provider?: string
          reference: string
          status?: string
          updated_at?: string
          vendor_amount_pesewas?: number | null
          vendor_user_id?: string | null
        }
        Update: {
          access_code?: string | null
          amount_pesewas?: number
          authorization_url?: string | null
          buyer_id?: string | null
          channel?: string | null
          commission_percent?: number | null
          created_at?: string
          currency?: string
          id?: string
          needs_refund?: boolean
          order_id?: string | null
          paid_at?: string | null
          paystack_fee_pesewas?: number | null
          platform_fee_pesewas?: number | null
          provider?: string
          reference?: string
          status?: string
          updated_at?: string
          vendor_amount_pesewas?: number | null
          vendor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needing_refund"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          moderation_reason: string | null
          price: number
          search: unknown
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          moderation_reason?: string | null
          price: number
          search?: unknown
          status?: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          moderation_reason?: string | null
          price?: number
          search?: unknown
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          campus_location: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          campus_location?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          campus_location?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_offers: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          note: string
          request_id: string
          vendor_id: string
          vendor_user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          note: string
          request_id: string
          vendor_id: string
          vendor_user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          note?: string
          request_id?: string
          vendor_id?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_offers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buyer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_offers_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_offers_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_cleanup_queue: {
        Row: {
          attempts: number
          bucket: string
          created_at: string
          id: string
          path: string
          processed_at: string | null
        }
        Insert: {
          attempts?: number
          bucket: string
          created_at?: string
          id?: string
          path: string
          processed_at?: string | null
        }
        Update: {
          attempts?: number
          bucket?: string
          created_at?: string
          id?: string
          path?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      vendor_charges: {
        Row: {
          amount_pesewas: number
          created_at: string
          id: string
          order_id: string
          payment_id: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          amount_pesewas: number
          created_at?: string
          id?: string
          order_id: string
          payment_id?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          amount_pesewas?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_id?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_charges_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_charges_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_billing: {
        Row: {
          customer_code: string | null
          last_reference: string | null
          subaccount_code: string | null
          subscription_code: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          customer_code?: string | null
          last_reference?: string | null
          subaccount_code?: string | null
          subscription_code?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          customer_code?: string | null
          last_reference?: string | null
          subaccount_code?: string | null
          subscription_code?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_billing_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_paused: boolean
          logo_url: string | null
          owner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_name: string
          status: Database["public"]["Enums"]["vendor_status"]
          subscription_status: string
          updated_at: string
          verified_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_paused?: boolean
          logo_url?: string | null
          owner_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_name: string
          status?: Database["public"]["Enums"]["vendor_status"]
          subscription_status?: string
          updated_at?: string
          verified_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_paused?: boolean
          logo_url?: string | null
          owner_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_name?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          subscription_status?: string
          updated_at?: string
          verified_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      orders_needing_refund: {
        Row: {
          buyer_id: string | null
          buyer_name_snapshot: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          needs_refund: boolean | null
          payment_due_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          shop_name_snapshot: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          updated_at: string | null
          vendor_id: string | null
          vendor_user_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name_snapshot?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          needs_refund?: never
          payment_due_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shop_name_snapshot?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_user_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name_snapshot?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          needs_refund?: never
          payment_due_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shop_name_snapshot?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_user_id_fkey"
            columns: ["vendor_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_cancel_paid_order: {
        Args: { order_id: string; reason: string }
        Returns: {
          buyer_id: string | null
          buyer_name_snapshot: string
          buyer_note: string | null
          conversation_id: string | null
          created_at: string
          id: string
          meeting_point: string | null
          payment_due_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shop_name_snapshot: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          vendor_id: string | null
          vendor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_moderate_product: {
        Args: {
          new_status: Database["public"]["Enums"]["product_status"]
          product_id: string
          reason: string
        }
        Returns: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          moderation_reason: string | null
          price: number
          search: unknown
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_remove_request: {
        Args: { reason: string; request_id: string }
        Returns: undefined
      }
      admin_remove_vendor: {
        Args: { reason: string; vendor_id: string }
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_paused: boolean
          logo_url: string | null
          owner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_name: string
          status: Database["public"]["Enums"]["vendor_status"]
          subscription_status: string
          updated_at: string
          verified_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vendors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_vendor: {
        Args: { decision: string; reason: string; vendor_id: string }
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_paused: boolean
          logo_url: string | null
          owner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_name: string
          status: Database["public"]["Enums"]["vendor_status"]
          subscription_status: string
          updated_at: string
          verified_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vendors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auto_cancel_unpaid_orders: { Args: never; Returns: number }
      buyer_request_feed: {
        Args: {
          campus_name: string
          category_id: string
          only_buyer: boolean
          open_only: boolean
          request_id: string
        }
        Returns: {
          body: string
          buyer_id: string
          buyer_name: string
          campus: string
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          id: string
          mine: boolean
          offer_count: number
          offered: boolean
          removal_reason: string
          status: string
          target_shop_name: string
          target_vendor_id: string
          title: string
        }[]
      }
      claim_push_notifications: {
        Args: { notification_id?: string }
        Returns: {
          body: string
          created_at: string
          data: Json
          id: string
          next_attempt_at: string
          push_attempts: number
          push_last_error: string | null
          push_receipt_checked_at: string | null
          push_sent_at: string | null
          push_status: Database["public"]["Enums"]["push_status"]
          push_tickets: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      close_buyer_request: { Args: { request_id: string }; Returns: undefined }
      create_buyer_request: {
        Args: {
          body?: string
          category_id: string
          title: string
          vendor_id?: string
        }
        Returns: string
      }
      deactivate_push_token: { Args: { token: string }; Returns: undefined }
      dispatch_edge_function: {
        Args: { function_name: string; payload: Json; secret_name: string }
        Returns: undefined
      }
      enqueue_notification: {
        Args: {
          body: string
          data: Json
          title: string
          type: string
          user_id: string
        }
        Returns: undefined
      }
      enqueue_storage_cleanup: {
        Args: { stored_value: string; target_bucket: string }
        Returns: undefined
      }
      finalize_payment_failure: {
        Args: { reason: string; reference: string }
        Returns: {
          access_code: string | null
          amount_pesewas: number
          authorization_url: string | null
          buyer_id: string | null
          channel: string | null
          commission_percent: number | null
          created_at: string
          currency: string
          id: string
          needs_refund: boolean
          order_id: string | null
          paid_at: string | null
          paystack_fee_pesewas: number | null
          platform_fee_pesewas: number | null
          provider: string
          reference: string
          status: string
          updated_at: string
          vendor_amount_pesewas: number | null
          vendor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_payment_success: {
        Args: {
          amount_pesewas: number
          channel: string
          currency: string
          fees: Json
          reference: string
        }
        Returns: {
          access_code: string | null
          amount_pesewas: number
          authorization_url: string | null
          buyer_id: string | null
          channel: string | null
          commission_percent: number | null
          created_at: string
          currency: string
          id: string
          needs_refund: boolean
          order_id: string | null
          paid_at: string | null
          paystack_fee_pesewas: number | null
          platform_fee_pesewas: number | null
          provider: string
          reference: string
          status: string
          updated_at: string
          vendor_amount_pesewas: number | null
          vendor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_buyer_request: {
        Args: { request_id: string }
        Returns: {
          body: string
          buyer_id: string
          buyer_name: string
          campus: string
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          id: string
          mine: boolean
          offer_count: number
          offered: boolean
          removal_reason: string
          status: string
          target_shop_name: string
          target_vendor_id: string
          title: string
        }[]
      }
      get_public_payment_terms: {
        Args: never
        Returns: {
          commission_percent: number | null
          min_online_order_ghs: number | null
        }[]
      }
      get_or_create_conversation: {
        Args: { vendor_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      list_campus_requests: {
        Args: { filter_category_id?: string }
        Returns: {
          body: string
          buyer_id: string
          buyer_name: string
          campus: string
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          id: string
          mine: boolean
          offer_count: number
          offered: boolean
          removal_reason: string
          status: string
          target_shop_name: string
          target_vendor_id: string
          title: string
        }[]
      }
      list_campus_shops: {
        Args: never
        Returns: {
          id: string
          shop_name: string
        }[]
      }
      list_my_requests: {
        Args: never
        Returns: {
          body: string
          buyer_id: string
          buyer_name: string
          campus: string
          category_id: string
          category_name: string
          category_slug: string
          created_at: string
          id: string
          mine: boolean
          offer_count: number
          offered: boolean
          removal_reason: string
          status: string
          target_shop_name: string
          target_vendor_id: string
          title: string
        }[]
      }
      list_request_offers: {
        Args: { request_id: string }
        Returns: {
          conversation_id: string
          created_at: string
          id: string
          note: string
          shop_name: string
          vendor_id: string
        }[]
      }
      list_shop_reviews: {
        Args: { vendor_id: string }
        Returns: {
          body: string
          buyer_name: string
          created_at: string
          id: string
          rating: number
        }[]
      }
      mark_conversation_read: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      offer_on_request: {
        Args: { note: string; request_id: string }
        Returns: string
      }
      order_review: {
        Args: { order_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          rating: number
        }[]
      }
      place_order: {
        Args: {
          buyer_note: string
          items: Json
          meeting_point: string
          p_payment_method?: string
          vendor_id: string
        }
        Returns: {
          buyer_id: string | null
          buyer_name_snapshot: string
          buyer_note: string | null
          conversation_id: string | null
          created_at: string
          id: string
          meeting_point: string | null
          payment_due_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shop_name_snapshot: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          vendor_id: string | null
          vendor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_push_token: {
        Args: { platform: string; token: string }
        Returns: undefined
      }
      search_products: {
        Args: {
          category_id?: string
          limit?: number
          max_price?: number
          min_price?: number
          offset?: number
          q?: string
          sort?: string
        }
        Returns: Database["public"]["CompositeTypes"]["product_search_result"][]
        SetofOptions: {
          from: "*"
          to: "product_search_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      shop_review_summaries: {
        Args: never
        Returns: {
          rating_avg: number
          review_count: number
          vendor_id: string
        }[]
      }
      storage_object_path: {
        Args: { stored_value: string; target_bucket: string }
        Returns: string
      }
      submit_order_review: {
        Args: { body: string; order_id: string; rating: number }
        Returns: {
          body: string | null
          buyer_id: string
          buyer_name: string
          created_at: string
          id: string
          order_id: string
          rating: number
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "order_reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["order_status"]
          order_id: string
        }
        Returns: {
          buyer_id: string | null
          buyer_name_snapshot: string
          buyer_note: string | null
          conversation_id: string | null
          created_at: string
          id: string
          meeting_point: string | null
          payment_due_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shop_name_snapshot: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          vendor_id: string | null
          vendor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vendor_is_public: { Args: { vendor_id: string }; Returns: boolean }
    }
    Enums: {
      message_type: "text" | "order" | "system"
      order_status:
        | "pending"
        | "accepted"
        | "ready"
        | "completed"
        | "rejected"
        | "cancelled"
      payment_method: "cash_on_delivery" | "mobile_money" | "card" | "paystack"
      payment_status:
        | "unpaid"
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "refund_pending"
      product_status: "active" | "hidden" | "removed_by_admin"
      push_status: "pending" | "sent" | "failed" | "skipped"
      user_role: "buyer" | "vendor" | "admin"
      vendor_status: "pending" | "approved" | "rejected" | "removed"
    }
    CompositeTypes: {
      product_search_result: {
        id: string | null
        vendor_id: string | null
        category_id: string | null
        title: string | null
        description: string | null
        price: number | null
        is_available: boolean | null
        status: Database["public"]["Enums"]["product_status"] | null
        created_at: string | null
        image_path: string | null
        shop_name: string | null
      }
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
    Enums: {
      message_type: ["text", "order", "system"],
      order_status: [
        "pending",
        "accepted",
        "ready",
        "completed",
        "rejected",
        "cancelled",
      ],
      payment_method: ["cash_on_delivery", "mobile_money", "card", "paystack"],
      payment_status: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded",
        "refund_pending",
      ],
      product_status: ["active", "hidden", "removed_by_admin"],
      push_status: ["pending", "sent", "failed", "skipped"],
      user_role: ["buyer", "vendor", "admin"],
      vendor_status: ["pending", "approved", "rejected", "removed"],
    },
  },
} as const
