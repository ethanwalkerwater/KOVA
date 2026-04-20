/**
 * Supabase database type definitions.
 *
 * This is the hand-authored type contract that matches the schema in
 * supabase/migrations/001_initial.sql. In Phase 2, replace with the
 * auto-generated version from `supabase gen types typescript`.
 *
 * Shape: Database["public"]["Tables"][TableName]["Row" | "Insert" | "Update"]
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          subscription_tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string;
          updated_at?: string;
        };
        // Required by Supabase's GenericTable constraint
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          owner_id: string;
          // Identity
          name: string;
          title: string | null;
          company: string | null;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          location: string | null;
          // Pipeline
          stage: string;
          importance: string;
          tags: string[];
          source: string | null;
          last_interaction_at: string | null;
          next_followup_at: string | null;
          followup_reason: string | null;
          // Company intelligence
          company_industry: string | null;
          company_size: string | null;
          company_stage: string | null;
          company_hq: string | null;
          company_description: string | null;
          // Deal tracking
          deal_value: number | null;
          deal_currency: string;
          deal_probability: number | null;
          expected_close_date: string | null;
          // AI-generated
          ai_summary: string | null;
          relationship_score: number | null;
          key_topics: string[];
          suggested_next_step: string | null;
          // System
          created_at: string;
          updated_at: string;
          // Production hardening (migration 002)
          last_tier1_at: string | null;
          tier1_count: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          title?: string | null;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          stage?: string;
          importance?: string;
          tags?: string[];
          source?: string | null;
          last_interaction_at?: string | null;
          next_followup_at?: string | null;
          followup_reason?: string | null;
          company_industry?: string | null;
          company_size?: string | null;
          company_stage?: string | null;
          company_hq?: string | null;
          company_description?: string | null;
          deal_value?: number | null;
          deal_currency?: string;
          deal_probability?: number | null;
          expected_close_date?: string | null;
          ai_summary?: string | null;
          relationship_score?: number | null;
          key_topics?: string[];
          suggested_next_step?: string | null;
          created_at?: string;
          updated_at?: string;
          last_tier1_at?: string | null;
          tier1_count?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          title?: string | null;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          stage?: string;
          importance?: string;
          tags?: string[];
          source?: string | null;
          last_interaction_at?: string | null;
          next_followup_at?: string | null;
          followup_reason?: string | null;
          company_industry?: string | null;
          company_size?: string | null;
          company_stage?: string | null;
          company_hq?: string | null;
          company_description?: string | null;
          deal_value?: number | null;
          deal_currency?: string;
          deal_probability?: number | null;
          expected_close_date?: string | null;
          ai_summary?: string | null;
          relationship_score?: number | null;
          key_topics?: string[];
          suggested_next_step?: string | null;
          created_at?: string;
          updated_at?: string;
          last_tier1_at?: string | null;
          tier1_count?: number;
        };
        // Required by Supabase's GenericTable constraint
        Relationships: [];
      };
      interactions: {
        Row: {
          id: string;
          contact_id: string;
          owner_id: string;
          type: string;
          raw_content: string;
          media_url: string | null;
          source_context: string | null;
          ai_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          owner_id: string;
          type: string;
          raw_content: string;
          media_url?: string | null;
          source_context?: string | null;
          ai_generated?: boolean;
          created_at?: string;
        };
        Update: never; // interactions are immutable
        // Required by Supabase's GenericTable constraint
        Relationships: [];
      };
      sections: {
        Row: {
          id: string;
          contact_id: string;
          slug: string;
          title: string;
          content_md: string;
          summary: string | null;
          regenerated_at: string;
          interaction_count: number;
          source_interaction_ids: string[] | null;
          user_overrides_md: string | null;
          overridden_at: string | null;
          override_reason: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          slug: string;
          title: string;
          content_md?: string;
          summary?: string | null;
          regenerated_at?: string;
          interaction_count?: number;
          source_interaction_ids?: string[] | null;
          user_overrides_md?: string | null;
          overridden_at?: string | null;
          override_reason?: string | null;
        };
        Update: {
          id?: string;
          contact_id?: string;
          slug?: string;
          title?: string;
          content_md?: string;
          summary?: string | null;
          regenerated_at?: string;
          interaction_count?: number;
          source_interaction_ids?: string[] | null;
          user_overrides_md?: string | null;
          overridden_at?: string | null;
          override_reason?: string | null;
        };
        // Required by Supabase's GenericTable constraint
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      touch_contact: {
        Args: { p_contact_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
