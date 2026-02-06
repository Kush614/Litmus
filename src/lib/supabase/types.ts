export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      discovery_candidates: {
        Row: {
          id: string;
          name: string;
          vendor: string;
          website_url: string;
          category: string;
          description: string | null;
          capabilities: string[] | null;
          integrations: string[] | null;
          pricing_model: Json | null;
          yc_batch: string | null;
          yc_company_url: string | null;
          source: string;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          vendor: string;
          website_url: string;
          category?: string;
          description?: string | null;
          capabilities?: string[] | null;
          integrations?: string[] | null;
          pricing_model?: Json | null;
          yc_batch?: string | null;
          yc_company_url?: string | null;
          source?: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          vendor?: string;
          website_url?: string;
          category?: string;
          description?: string | null;
          capabilities?: string[] | null;
          integrations?: string[] | null;
          pricing_model?: Json | null;
          yc_batch?: string | null;
          yc_company_url?: string | null;
          source?: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      discovery_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: string;
          use_case_summary: string | null;
          extracted_requirements: Json | null;
          conversation_history: Json;
          matched_candidates: Json | null;
          custom_scenarios: Json | null;
          evaluation_results: Json | null;
          final_recommendation: Json | null;
          call_uuid: string | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_type?: string;
          use_case_summary?: string | null;
          extracted_requirements?: Json | null;
          conversation_history?: Json;
          matched_candidates?: Json | null;
          custom_scenarios?: Json | null;
          evaluation_results?: Json | null;
          final_recommendation?: Json | null;
          call_uuid?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_type?: string;
          use_case_summary?: string | null;
          extracted_requirements?: Json | null;
          conversation_history?: Json;
          matched_candidates?: Json | null;
          custom_scenarios?: Json | null;
          evaluation_results?: Json | null;
          final_recommendation?: Json | null;
          call_uuid?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          api_endpoint: string | null;
          capabilities: string[] | null;
          category: string;
          created_at: string | null;
          description: string | null;
          fts: unknown;
          id: string;
          integrations: string[] | null;
          name: string;
          overall_score: number | null;
          pricing_model: Json | null;
          slug: string;
          submitted_by: string | null;
          total_evaluations: number | null;
          updated_at: string | null;
          vendor: string;
          website_url: string | null;
        };
        Insert: {
          api_endpoint?: string | null;
          capabilities?: string[] | null;
          category: string;
          created_at?: string | null;
          description?: string | null;
          fts?: unknown;
          id?: string;
          integrations?: string[] | null;
          name: string;
          overall_score?: number | null;
          pricing_model?: Json | null;
          slug: string;
          submitted_by?: string | null;
          total_evaluations?: number | null;
          updated_at?: string | null;
          vendor: string;
          website_url?: string | null;
        };
        Update: {
          api_endpoint?: string | null;
          capabilities?: string[] | null;
          category?: string;
          created_at?: string | null;
          description?: string | null;
          fts?: unknown;
          id?: string;
          integrations?: string[] | null;
          name?: string;
          overall_score?: number | null;
          pricing_model?: Json | null;
          slug?: string;
          submitted_by?: string | null;
          total_evaluations?: number | null;
          updated_at?: string | null;
          vendor?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      benchmarks: {
        Row: {
          agent_id: string;
          agent_response: Json | null;
          benchmark_type: string;
          composite_score: number;
          created_at: string | null;
          evaluated_by: string | null;
          gemini_evaluation: Json | null;
          id: string;
          input_payload: Json;
          scores: Json;
          task_description: string;
        };
        Insert: {
          agent_id: string;
          agent_response?: Json | null;
          benchmark_type: string;
          composite_score?: number;
          created_at?: string | null;
          evaluated_by?: string | null;
          gemini_evaluation?: Json | null;
          id?: string;
          input_payload: Json;
          scores?: Json;
          task_description: string;
        };
        Update: {
          agent_id?: string;
          agent_response?: Json | null;
          benchmark_type?: string;
          composite_score?: number;
          created_at?: string | null;
          evaluated_by?: string | null;
          gemini_evaluation?: Json | null;
          id?: string;
          input_payload?: Json;
          scores?: Json;
          task_description?: string;
        };
        Relationships: [
          {
            foreignKeyName: "benchmarks_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_verifications: {
        Row: {
          agent_id: string;
          claimed: boolean;
          id: string;
          tool_name: string;
          verification_details: Json | null;
          verified: boolean | null;
          verified_at: string | null;
        };
        Insert: {
          agent_id: string;
          claimed: boolean;
          id?: string;
          tool_name: string;
          verification_details?: Json | null;
          verified?: boolean | null;
          verified_at?: string | null;
        };
        Update: {
          agent_id?: string;
          claimed?: boolean;
          id?: string;
          tool_name?: string;
          verification_details?: Json | null;
          verified?: boolean | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tool_verifications_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      user_reviews: {
        Row: {
          agent_id: string;
          created_at: string | null;
          id: string;
          rating: number;
          review_text: string | null;
          use_case: string | null;
          user_id: string;
          verified_usage: boolean | null;
        };
        Insert: {
          agent_id: string;
          created_at?: string | null;
          id?: string;
          rating: number;
          review_text?: string | null;
          use_case?: string | null;
          user_id: string;
          verified_usage?: boolean | null;
        };
        Update: {
          agent_id?: string;
          created_at?: string | null;
          id?: string;
          rating?: number;
          review_text?: string | null;
          use_case?: string | null;
          user_id?: string;
          verified_usage?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_reviews_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_evaluations: {
        Row: {
          agent_id: string;
          audio_url: string | null;
          call_uuid: string;
          composite_score: number | null;
          created_at: string | null;
          duration_seconds: number | null;
          evaluated_by: string;
          gemini_evaluation: Json | null;
          id: string;
          scores: Json | null;
          stream_id: string | null;
          transcript: Json | null;
        };
        Insert: {
          agent_id: string;
          audio_url?: string | null;
          call_uuid: string;
          composite_score?: number | null;
          created_at?: string | null;
          duration_seconds?: number | null;
          evaluated_by: string;
          gemini_evaluation?: Json | null;
          id?: string;
          scores?: Json | null;
          stream_id?: string | null;
          transcript?: Json | null;
        };
        Update: {
          agent_id?: string;
          audio_url?: string | null;
          call_uuid?: string;
          composite_score?: number | null;
          created_at?: string | null;
          duration_seconds?: number | null;
          evaluated_by?: string;
          gemini_evaluation?: Json | null;
          id?: string;
          scores?: Json | null;
          stream_id?: string | null;
          transcript?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "voice_evaluations_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      web_intelligence: {
        Row: {
          agent_id: string;
          fetched_at: string | null;
          id: string;
          raw_data: Json | null;
          relevance_score: number | null;
          sentiment: string | null;
          source_type: string;
          source_url: string;
          summary: string;
          title: string;
        };
        Insert: {
          agent_id: string;
          fetched_at?: string | null;
          id?: string;
          raw_data?: Json | null;
          relevance_score?: number | null;
          sentiment?: string | null;
          source_type: string;
          source_url: string;
          summary: string;
          title: string;
        };
        Update: {
          agent_id?: string;
          fetched_at?: string | null;
          id?: string;
          raw_data?: Json | null;
          relevance_score?: number | null;
          sentiment?: string | null;
          source_type?: string;
          source_url?: string;
          summary?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "web_intelligence_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_agents: {
        Args: { search_query: string };
        Returns: {
          api_endpoint: string | null;
          capabilities: string[] | null;
          category: string;
          created_at: string | null;
          description: string | null;
          fts: unknown;
          id: string;
          integrations: string[] | null;
          name: string;
          overall_score: number | null;
          pricing_model: Json | null;
          slug: string;
          submitted_by: string | null;
          total_evaluations: number | null;
          updated_at: string | null;
          vendor: string;
          website_url: string | null;
        }[];
      };
      update_agent_score: { Args: { agent_uuid: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience type aliases
export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];
export type Benchmark = Database["public"]["Tables"]["benchmarks"]["Row"];
export type BenchmarkInsert = Database["public"]["Tables"]["benchmarks"]["Insert"];
export type VoiceEvaluation = Database["public"]["Tables"]["voice_evaluations"]["Row"];
export type WebIntelligence = Database["public"]["Tables"]["web_intelligence"]["Row"];
export type ToolVerification = Database["public"]["Tables"]["tool_verifications"]["Row"];
export type UserReview = Database["public"]["Tables"]["user_reviews"]["Row"];
export type UserReviewInsert = Database["public"]["Tables"]["user_reviews"]["Insert"];
export type DiscoveryCandidateRow = Database["public"]["Tables"]["discovery_candidates"]["Row"];
export type DiscoveryCandidateInsert =
  Database["public"]["Tables"]["discovery_candidates"]["Insert"];
export type DiscoverySessionRow = Database["public"]["Tables"]["discovery_sessions"]["Row"];
export type DiscoverySessionInsert = Database["public"]["Tables"]["discovery_sessions"]["Insert"];
