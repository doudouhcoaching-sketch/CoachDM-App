// ═══════════════════════════════════════════════════════════════
// COACH DM — Types métier
// Source unique de vérité pour web + mobile
// ═══════════════════════════════════════════════════════════════

export type UserRole = 'client' | 'coach' | 'admin';
export type BiologicalSex = 'male' | 'female';
export type LocaleCode = 'fr' | 'en' | 'nl';
export type UnitSystem = 'metric' | 'imperial';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type NutritionGoal = 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp';

export type MealType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'pre_workout'
  | 'post_workout';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'paused';

// ── Profile ─────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: LocaleCode;
  unit_system: UnitSystem;
  date_of_birth: string | null;
  sex: BiologicalSex | null;
  height_cm: number | null;
  onboarding_completed: boolean;
  coach_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Nutrition Target ───────────────────────────────────────────
export interface NutritionTarget {
  id: string;
  user_id: string;
  current_weight_kg: number;
  target_weight_kg: number | null;
  body_fat_percentage: number | null;
  activity_level: ActivityLevel;
  goal: NutritionGoal;
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
}

// ── Food ────────────────────────────────────────────────────────
export interface Food {
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
}

// ── Food Log ────────────────────────────────────────────────────
export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string;
  logged_date: string;       // YYYY-MM-DD
  logged_at: string;
  meal_type: MealType;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLogWithFood extends FoodLog {
  food: Food;
}

// ── Water / Weight ──────────────────────────────────────────────
export interface WaterLog {
  id: string;
  user_id: string;
  logged_date: string;
  logged_at: string;
  amount_ml: number;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  logged_date: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

// ── Subscription ────────────────────────────────────────────────
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  revenuecat_user_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

// ── Dashboard (retour de get_daily_dashboard) ──────────────────
export interface DailyDashboard {
  date: string;
  target: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    water_ml: number;
    goal: NutritionGoal;
  } | null;
  consumed: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    meals: number;
  };
  water_ml: number;
  last_weight_kg: number | null;
}

// ── Macros computed ─────────────────────────────────────────────
export interface MacroBreakdown {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}
