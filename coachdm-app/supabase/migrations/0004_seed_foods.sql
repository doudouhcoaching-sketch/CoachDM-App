-- ═══════════════════════════════════════════════════════════════
-- COACH DM — Migration 0004 : Seed catalogue aliments
-- 30 aliments de base courants en Belgique/France pour démarrer
-- (Le reste sera complété via OpenFoodFacts au scan)
-- ═══════════════════════════════════════════════════════════════

insert into public.foods (
  name_fr, name_en, name_nl, brand,
  kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
  default_serving_g, default_serving_label_fr, default_serving_label_en, default_serving_label_nl,
  is_custom, is_verified
) values
-- Protéines animales
('Blanc de poulet cru', 'Chicken breast raw', 'Kipfilet rauw', null, 110, 23, 0, 1.5, 0, 150, '1 blanc', '1 breast', '1 filet', false, true),
('Œuf entier', 'Whole egg', 'Heel ei', null, 143, 12.6, 0.7, 9.5, 0, 50, '1 œuf', '1 egg', '1 ei', false, true),
('Saumon frais', 'Fresh salmon', 'Verse zalm', null, 208, 20, 0, 13, 0, 130, '1 pavé', '1 fillet', '1 stuk', false, true),
('Thon au naturel', 'Tuna in water', 'Tonijn in water', null, 116, 26, 0, 1, 0, 80, '1 boîte', '1 can', '1 blik', false, true),
('Bœuf haché 5%', 'Lean ground beef 5%', 'Mager rundergehakt 5%', null, 130, 21, 0, 5, 0, 100, '100g', '100g', '100g', false, true),
('Yaourt grec 0%', 'Greek yogurt 0%', 'Griekse yoghurt 0%', null, 59, 10, 4, 0.4, 0, 150, '1 pot', '1 cup', '1 potje', false, true),
('Fromage blanc 0%', 'Quark 0%', 'Magere kwark', null, 47, 8, 4, 0.1, 0, 200, '1 portion', '1 serving', '1 portie', false, true),
('Whey protéine', 'Whey protein', 'Whey-eiwit', null, 380, 80, 5, 5, 0, 30, '1 dose', '1 scoop', '1 schep', false, true),

-- Féculents
('Riz basmati cuit', 'Cooked basmati rice', 'Gekookte basmatirijst', null, 121, 2.7, 25, 0.4, 0.4, 150, '1 portion', '1 serving', '1 portie', false, true),
('Pâtes complètes cuites', 'Cooked whole wheat pasta', 'Gekookte volkoren pasta', null, 124, 5, 25, 0.9, 3.5, 100, '1 portion', '1 serving', '1 portie', false, true),
('Patate douce cuite', 'Cooked sweet potato', 'Gekookte zoete aardappel', null, 86, 1.6, 20, 0.1, 3, 150, '1 patate', '1 potato', '1 aardappel', false, true),
('Avoine flocons', 'Rolled oats', 'Havervlokken', null, 379, 13, 67, 7, 10, 50, '1 bol', '1 bowl', '1 kom', false, true),
('Pain complet', 'Whole wheat bread', 'Volkorenbrood', null, 247, 9, 41, 3.5, 7, 30, '1 tranche', '1 slice', '1 sneetje', false, true),
('Quinoa cuit', 'Cooked quinoa', 'Gekookte quinoa', null, 120, 4.4, 21, 1.9, 2.8, 150, '1 portion', '1 serving', '1 portie', false, true),

-- Légumes
('Brocoli cuit', 'Cooked broccoli', 'Gekookte broccoli', null, 35, 2.4, 7, 0.4, 3.3, 150, '1 portion', '1 serving', '1 portie', false, true),
('Épinards crus', 'Raw spinach', 'Rauwe spinazie', null, 23, 2.9, 3.6, 0.4, 2.2, 100, '1 bol', '1 bowl', '1 kom', false, true),
('Tomate', 'Tomato', 'Tomaat', null, 18, 0.9, 3.9, 0.2, 1.2, 120, '1 tomate', '1 tomato', '1 tomaat', false, true),
('Concombre', 'Cucumber', 'Komkommer', null, 16, 0.7, 3.6, 0.1, 0.5, 100, '1 portion', '1 serving', '1 portie', false, true),
('Courgette', 'Zucchini', 'Courgette', null, 17, 1.2, 3.1, 0.3, 1, 150, '1 courgette', '1 zucchini', '1 courgette', false, true),

-- Fruits
('Banane', 'Banana', 'Banaan', null, 89, 1.1, 23, 0.3, 2.6, 120, '1 banane', '1 banana', '1 banaan', false, true),
('Pomme', 'Apple', 'Appel', null, 52, 0.3, 14, 0.2, 2.4, 180, '1 pomme', '1 apple', '1 appel', false, true),
('Myrtilles', 'Blueberries', 'Bosbessen', null, 57, 0.7, 14, 0.3, 2.4, 100, '1 poignée', '1 handful', '1 handvol', false, true),
('Avocat', 'Avocado', 'Avocado', null, 160, 2, 9, 15, 7, 100, '1/2 avocat', '1/2 avocado', '1/2 avocado', false, true),

-- Lipides bons
('Amandes', 'Almonds', 'Amandelen', null, 579, 21, 22, 50, 12, 30, '1 poignée', '1 handful', '1 handvol', false, true),
('Huile olive', 'Olive oil', 'Olijfolie', null, 884, 0, 0, 100, 0, 10, '1 c. à soupe', '1 tbsp', '1 eetlepel', false, true),
('Beurre de cacahuète', 'Peanut butter', 'Pindakaas', null, 588, 25, 20, 50, 6, 20, '1 c. à soupe', '1 tbsp', '1 eetlepel', false, true),

-- Légumineuses
('Lentilles cuites', 'Cooked lentils', 'Gekookte linzen', null, 116, 9, 20, 0.4, 8, 150, '1 portion', '1 serving', '1 portie', false, true),
('Pois chiches cuits', 'Cooked chickpeas', 'Gekookte kikkererwten', null, 164, 8.9, 27, 2.6, 7.6, 150, '1 portion', '1 serving', '1 portie', false, true),

-- Boissons
('Café noir', 'Black coffee', 'Zwarte koffie', null, 2, 0.3, 0, 0, 0, 240, '1 tasse', '1 cup', '1 kopje', false, true),
('Lait demi-écrémé', 'Semi-skimmed milk', 'Halfvolle melk', null, 47, 3.4, 4.7, 1.6, 0, 250, '1 verre', '1 glass', '1 glas', false, true);
