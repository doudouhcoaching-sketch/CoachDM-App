// ═══════════════════════════════════════════════════════════════
// COACH DM — Types DB (généré par Supabase CLI)
// 
// REGENERATE AFTER ANY MIGRATION :
//   npm run supabase:types
// 
// Cette version est le bootstrap. Sera écrasée par la commande.
// ═══════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'client' | 'coach' | 'admin';
          locale: 'fr' | 'en' | 'nl';
          unit_system: 'metric' | 'imperial';
          date_of_birth: string | null;
          sex: 'male' | 'female' | null;
          height_cm: number | null;
          onboarding_completed: boolean;
          coach_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      nutrition_targets: {
        Row: {
          id: string;
          user_id: string;
          current_weight_kg: number;
          target_weight_kg: number | null;
          body_fat_percentage: number | null;
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal: 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp';
          bmr_kcal: number;
          tdee_kcal: number;
          daily_calories_kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          water_ml: number;
          is_active: boolean;
          calculation_method: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['nutrition_targets']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['nutrition_targets']['Row']>;
      };
      foods: {
        Row: {
          id: string;
          barcode: string | null;
          off_id: string | null;
          name_fr: string;
          name_en: string | null;
          name_nl: string | null;
          brand: string | null;
          kcal_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          sugars_per_100g: number | null;
          fat_per_100g: number;
          saturated_fat_per_100g: number | null;
          fiber_per_100g: number | null;
          salt_per_100g: number | null;
          default_serving_g: number | null;
          default_serving_label_fr: string | null;
          default_serving_label_en: string | null;
          default_serving_label_nl: string | null;
          image_url: string | null;
          is_custom: boolean;
          is_verified: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['foods']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['foods']['Row']>;
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_id: string;
          logged_date: string;
          logged_at: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
          quantity_g: number;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['food_logs']['Row'],
          'id' | 'created_at' | 'updated_at' | 'logged_at'
        > & { id?: string; logged_at?: string };
        Update: Partial<Database['public']['Tables']['food_logs']['Row']>;
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_date: string;
          logged_at: string;
          amount_ml: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['water_logs']['Row'], 'id' | 'created_at' | 'logged_at'> & {
          id?: string;
          logged_at?: string;
        };
        Update: Partial<Database['public']['Tables']['water_logs']['Row']>;
      };
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_date: string;
          weight_kg: number;
          body_fat_percentage: number | null;
          notes: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['weight_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['weight_logs']['Row']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          revenuecat_user_id: string | null;
          status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'paused';
          current_period_start: string | null;
          current_period_end: string | null;
          trial_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          amount_cents: number | null;
          currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['subscriptions']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
      };
    };
    Views: {
      daily_nutrition_summary: {
        Row: {
          user_id: string;
          logged_date: string;
          meals_logged: number;
          total_kcal: number;
          total_protein_g: number;
          total_carbs_g: number;
          total_fat_g: number;
          total_fiber_g: number;
        };
      };
    };
    Functions: {
      get_daily_dashboard: {
        Args: { p_date?: string };
        Returns: Json;
      };
      search_foods: {
        Args: { p_query?: string; p_barcode?: string; p_limit?: number };
        Returns: Database['public']['Tables']['foods']['Row'][];
      };
      has_active_subscription: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'client' | 'coach' | 'admin';
      biological_sex: 'male' | 'female';
      activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
      nutrition_goal: 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp';
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
      subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'paused';
      locale_code: 'fr' | 'en' | 'nl';
      unit_system: 'metric' | 'imperial';
    };
  };
}
