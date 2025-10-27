export type Database = {
  public: {
    Tables: {
      concepts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      connections: {
        Row: {
          id: string;
          concept_a_id: string;
          concept_b_id: string;
          connection_text: string;
          explanation: string;
          generated_at: string;
          prompt_version: string;
          model_used: string;
          status: 'unrated' | 'rated';
          rated_at: string | null;
        };
        Insert: {
          id?: string;
          concept_a_id: string;
          concept_b_id: string;
          connection_text: string;
          explanation: string;
          generated_at?: string;
          prompt_version?: string;
          model_used?: string;
          status?: 'unrated' | 'rated';
          rated_at?: string | null;
        };
        Update: {
          id?: string;
          concept_a_id?: string;
          concept_b_id?: string;
          connection_text?: string;
          explanation?: string;
          generated_at?: string;
          prompt_version?: string;
          model_used?: string;
          status?: 'unrated' | 'rated';
          rated_at?: string | null;
        };
      };
      critic_evaluations: {
        Row: {
          id: string;
          connection_id: string;
          critic_model: 'gpt-4-run-1' | 'gpt-4-run-2';
          novelty: number;
          coherence: number;
          usefulness: number;
          total: number;
          evaluated_at: string;
          correlation_with_ratings: number | null;
        };
        Insert: {
          id?: string;
          connection_id: string;
          critic_model: 'gpt-4-run-1' | 'gpt-4-run-2';
          novelty: number;
          coherence: number;
          usefulness: number;
          evaluated_at?: string;
          correlation_with_ratings?: number | null;
        };
        Update: {
          id?: string;
          connection_id?: string;
          critic_model?: 'gpt-4-run-1' | 'gpt-4-run-2';
          novelty?: number;
          coherence?: number;
          usefulness?: number;
          evaluated_at?: string;
          correlation_with_ratings?: number | null;
        };
      };
      ratings: {
        Row: {
          id: string;
          connection_id: string;
          rating: 'bad' | 'good' | 'wow';
          notes: string | null;
          rated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          rating: 'bad' | 'good' | 'wow';
          notes?: string | null;
          rated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          rating?: 'bad' | 'good' | 'wow';
          notes?: string | null;
          rated_at?: string;
        };
      };
      prompt_templates: {
        Row: {
          id: string;
          version: string;
          template_text: string;
          created_at: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          version: string;
          template_text: string;
          created_at?: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          version?: string;
          template_text?: string;
          created_at?: string;
          active?: boolean;
        };
      };
    };
    Functions: {
      increment_concept_usage: {
        Args: { concept_name: string };
        Returns: void;
      };
      get_fair_random_concept: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; usage_count: number }[];
      };
    };
  };
};
