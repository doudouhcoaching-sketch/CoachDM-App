// ═══════════════════════════════════════════════════════════════
// COACH DM — Store onboarding
// 
// Accumule les réponses au fil des 4 étapes.
// Reset après finalisation.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type {
  ActivityLevel,
  BiologicalSex,
  NutritionGoal,
} from '@coachdm/shared';

interface OnboardingState {
  // Step 1 : profile
  full_name: string;
  date_of_birth: string;       // YYYY-MM-DD
  sex: BiologicalSex | null;

  // Step 2 : body
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  body_fat_percentage: number | null;

  // Step 3 : goal
  goal: NutritionGoal | null;

  // Step 4 : activity
  activity_level: ActivityLevel | null;

  // Actions
  set: <K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K],
  ) => void;
  reset: () => void;
}

const initialState = {
  full_name: '',
  date_of_birth: '',
  sex: null,
  height_cm: null,
  current_weight_kg: null,
  target_weight_kg: null,
  body_fat_percentage: null,
  goal: null,
  activity_level: null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  set: (key, value) => set({ [key]: value } as Partial<OnboardingState>),
  reset: () => set(initialState),
}));
