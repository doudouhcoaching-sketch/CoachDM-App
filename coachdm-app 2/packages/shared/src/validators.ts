// ═══════════════════════════════════════════════════════════════
// COACH DM — Validation Zod
// 
// Une seule source de vérité pour valider :
// - les formulaires (front)
// - les API routes (back, web)
// - les Edge Functions (Supabase)
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────
export const localeSchema = z.enum(['fr', 'en', 'nl']);
export const sexSchema = z.enum(['male', 'female']);
export const activityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);
export const nutritionGoalSchema = z.enum([
  'lose_fat',
  'maintain',
  'build_muscle',
  'recomp',
]);
export const mealTypeSchema = z.enum([
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'pre_workout',
  'post_workout',
]);

// ── Onboarding ─────────────────────────────────────────────────
export const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Nom trop court').max(100),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD')
    .refine((v) => {
      const date = new Date(v);
      const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 13 && age <= 100;
    }, 'Âge entre 13 et 100 ans'),
  sex: sexSchema,
  height_cm: z.number().min(100).max(250),
  current_weight_kg: z.number().min(30).max(300),
  target_weight_kg: z.number().min(30).max(300).optional(),
  body_fat_percentage: z.number().min(3).max(60).optional(),
  activity_level: activityLevelSchema,
  goal: nutritionGoalSchema,
  locale: localeSchema.default('fr'),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Auth ───────────────────────────────────────────────────────
export const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins 1 majuscule')
    .regex(/[a-z]/, 'Au moins 1 minuscule')
    .regex(/\d/, 'Au moins 1 chiffre'),
  full_name: z.string().min(2).max(100),
  locale: localeSchema.default('fr'),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Food log ───────────────────────────────────────────────────
export const foodLogInputSchema = z.object({
  food_id: z.string().uuid(),
  logged_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: mealTypeSchema,
  quantity_g: z.number().positive().max(10000),
  notes: z.string().max(500).optional(),
});

export type FoodLogInput = z.infer<typeof foodLogInputSchema>;

// ── Custom food creation ───────────────────────────────────────
export const customFoodSchema = z.object({
  name_fr: z.string().min(2).max(200),
  name_en: z.string().max(200).optional(),
  name_nl: z.string().max(200).optional(),
  brand: z.string().max(100).optional(),
  kcal_per_100g: z.number().min(0).max(900),
  protein_per_100g: z.number().min(0).max(100).default(0),
  carbs_per_100g: z.number().min(0).max(100).default(0),
  fat_per_100g: z.number().min(0).max(100).default(0),
  fiber_per_100g: z.number().min(0).max(100).optional(),
  default_serving_g: z.number().positive().max(2000).optional(),
});

// ── Water log ──────────────────────────────────────────────────
export const waterLogSchema = z.object({
  amount_ml: z.number().int().min(1).max(5000),
  logged_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ── Weight log ─────────────────────────────────────────────────
export const weightLogSchema = z.object({
  weight_kg: z.number().min(30).max(300),
  logged_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body_fat_percentage: z.number().min(3).max(60).optional(),
  notes: z.string().max(500).optional(),
});

// ── Barcode ────────────────────────────────────────────────────
export const barcodeSchema = z
  .string()
  .regex(/^\d{8,14}$/, 'Code-barres invalide (8-14 chiffres)');
