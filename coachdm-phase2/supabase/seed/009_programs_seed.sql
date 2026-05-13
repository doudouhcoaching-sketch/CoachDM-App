-- ============================================================================
-- COACH DM — Seed 009 : 22 programmes alignés sur coachdm.be
-- ============================================================================

insert into public.programs (
  slug, title_fr, title_en, title_nl, goal,
  duration_weeks, sessions_per_week,
  description_fr, description_en, description_nl,
  difficulty, is_recommended, display_order, payhip_url
) values

-- 🔥 PERTE DE POIDS
('fat-burner-10w', 'Fat Burner 10W', 'Fat Burner 10W', 'Fat Burner 10W', 'fat_loss',
 10, 5,
 'Perte de graisse intensive. 60 séances · 5/sem.',
 'Intensive fat loss. 60 sessions · 5/week.',
 'Intensieve vetverbranding. 60 sessies · 5/week.',
 'intermediate', true, 10, 'https://payhip.com/b/MPHyz'),

('body-transformation-12w', 'Body Transformation 12W', 'Body Transformation 12W', 'Body Transformation 12W', 'fat_loss',
 12, 5,
 'Recomposition DUP. Perte graisses + muscles. Test 1RM semaines 1 et 12.',
 'DUP recomposition. Fat loss + muscle gain. 1RM test weeks 1 and 12.',
 'DUP recompositie. Vetverlies + spieropbouw. 1RM test weken 1 en 12.',
 'intermediate', true, 20, 'https://payhip.com/b/oFbCE'),

('summer-body-burn-8w', 'Summer Body Burn 8W', 'Summer Body Burn 8W', 'Summer Body Burn 8W', 'fat_loss',
 8, 5,
 'Définition + tonus. MetCon + Hypertrophie.',
 'Definition + tone. MetCon + Hypertrophy.',
 'Definitie + tonus. MetCon + Hypertrofie.',
 'intermediate', false, 30, 'https://payhip.com/b/UtnrG'),

('shred-6w', 'Shred 6W', 'Shred 6W', 'Shred 6W', 'fat_loss',
 6, 5,
 'Perte rapide. Max 45min. EMOM + Tabata.',
 'Fast loss. Max 45min. EMOM + Tabata.',
 'Snel verlies. Max 45min. EMOM + Tabata.',
 'intermediate', false, 40, 'https://payhip.com/b/R0Fgt'),

-- 💪 FORCE
('strength-cycle-8w', 'Strength Cycle 8W', 'Strength Cycle 8W', 'Strength Cycle 8W', 'strength',
 8, 4,
 'Force pure. Squat · Bench · Deadlift. Surcharge progressive. 4 phases. PR garanti.',
 'Pure strength. Squat · Bench · Deadlift. Progressive overload. 4 phases. Guaranteed PR.',
 'Pure kracht. Squat · Bench · Deadlift. Progressieve overbelasting. 4 fasen. Gegarandeerd PR.',
 'intermediate', false, 50, 'https://payhip.com/b/8neIR'),

('core-master-6w', 'Core Master 6W', 'Core Master 6W', 'Core Master 6W', 'strength',
 6, 4,
 'Gainage 360°. Force spinale. Stabilité tous plans.',
 '360° core. Spinal strength. Stability all planes.',
 '360° core. Wervelkracht. Stabiliteit alle vlakken.',
 'beginner', false, 60, 'https://payhip.com/b/mUZMk'),

('mind-body-8w', 'Mind & Body 8W', 'Mind & Body 8W', 'Mind & Body 8W', 'strength',
 8, 4,
 'Fitness + bien-être. Mobilité + santé durable.',
 'Fitness + well-being. Mobility + sustainable health.',
 'Fitness + welzijn. Mobiliteit + duurzame gezondheid.',
 'beginner', false, 70, 'https://payhip.com/b/KxkEy'),

('bulletproof-body-6w', 'Bulletproof Body 6W', 'Bulletproof Body 6W', 'Bulletproof Body 6W', 'mobility',
 6, 4,
 'Prévention blessures + mobilité. NASM CES.',
 'Injury prevention + mobility. NASM CES.',
 'Blessurepreventie + mobiliteit. NASM CES.',
 'beginner', false, 80, 'https://payhip.com/b/4cmRD'),

-- ⚡ FITNESS FONCTIONNEL
('functional-open-prep-8w', 'Functional Open Prep 8W', 'Functional Open Prep 8W', 'Functional Open Prep 8W', 'functional',
 8, 5,
 'CrossFit Open Prep. 44 pages · 40 séances · 5/sem. 3 niveaux BEG/INT/RX.',
 'CrossFit Open Prep. 44 pages · 40 sessions · 5/week. 3 levels BEG/INT/RX.',
 'CrossFit Open Prep. 44 pagina''s · 40 sessies · 5/week. 3 niveaus BEG/INT/RX.',
 'advanced', false, 90, 'https://payhip.com/b/7pBc3'),

('hyrox-race-12w', 'Hyrox Race 12W', 'Hyrox Race 12W', 'Hyrox Race 12W', 'functional',
 12, 5,
 'Préparation Hyrox. 8 stations + 8km. Reasfit affilié officiel.',
 'Hyrox preparation. 8 stations + 8km. Reasfit official affiliate.',
 'Hyrox voorbereiding. 8 stations + 8km. Reasfit officiële partner.',
 'advanced', true, 100, 'https://payhip.com/b/uK1IG'),

('gymnastics-skills-8w', 'Gymnastics Skills 8W', 'Gymnastics Skills 8W', 'Gymnastics Skills 8W', 'functional',
 8, 4,
 'Muscle Up · HSPU · T2B · Handstand. Progressions + Science.',
 'Muscle Up · HSPU · T2B · Handstand. Progressions + Science.',
 'Muscle Up · HSPU · T2B · Handstand. Progressies + Wetenschap.',
 'advanced', false, 110, 'https://payhip.com/b/0IgWv'),

('olympic-lifting-10w', 'Olympic Lifting 10W', 'Olympic Lifting 10W', 'Olympic Lifting 10W', 'functional',
 10, 4,
 'Snatch & Clean & Jerk. Technique + force. PR test sem 5 et 10.',
 'Snatch & Clean & Jerk. Technique + strength. PR test weeks 5 and 10.',
 'Snatch & Clean & Jerk. Techniek + kracht. PR test weken 5 en 10.',
 'advanced', false, 120, 'https://payhip.com/b/H4YDB'),

('hyrox-foundation-6w', 'Hyrox Foundation 6W', 'Hyrox Foundation 6W', 'Hyrox Foundation 6W', 'functional',
 6, 4,
 'Hyrox débutants. Bases solides. Reasfit affilié.',
 'Hyrox for beginners. Solid foundations. Reasfit affiliate.',
 'Hyrox voor beginners. Stevige basis. Reasfit partner.',
 'beginner', false, 130, 'https://payhip.com/b/B3TaF'),

('functional-performance-12w', 'Functional Performance 12W', 'Functional Performance 12W', 'Functional Performance 12W', 'functional',
 12, 5,
 'Performance fonctionnelle. 4 phases. Force + puissance + endurance.',
 'Functional performance. 4 phases. Strength + power + endurance.',
 'Functionele prestatie. 4 fasen. Kracht + power + uithouding.',
 'intermediate', false, 140, 'https://payhip.com/b/CA2jG'),

('compete-ready-16w', 'Compete Ready 16W', 'Compete Ready 16W', 'Compete Ready 16W', 'functional',
 16, 5,
 'Préparation compétition. 4 phases. Peaking + Taper.',
 'Competition prep. 4 phases. Peaking + Taper.',
 'Wedstrijdvoorbereiding. 4 fasen. Peaking + Taper.',
 'advanced', false, 150, 'https://payhip.com/b/U8nek'),

-- 🏃 SPORT
('football-performance-16w', 'Football Performance 16W', 'Football Performance 16W', 'Football Performance 16W', 'sport',
 16, 4,
 'Pré-saison + En Saison. Sprint · COD · LCA. NASM PES.',
 'Pre-season + In-season. Sprint · COD · ACL. NASM PES.',
 'Voorseizoen + In-seizoen. Sprint · COD · LCA. NASM PES.',
 'intermediate', false, 160, 'https://payhip.com/b/5Oo2i'),

('endurance-athlete-8w', 'Endurance Athlete 8W', 'Endurance Athlete 8W', 'Endurance Athlete 8W', 'sport',
 8, 4,
 'Zone 2 + VO2max + Seuil. Moteur cardiovasculaire complet.',
 'Zone 2 + VO2max + Threshold. Complete cardiovascular engine.',
 'Zone 2 + VO2max + Drempel. Volledige cardiovasculaire motor.',
 'intermediate', false, 170, 'https://payhip.com/b/eRJxv'),

('athlete-mind-12w', 'Athlete Mind 12W', 'Athlete Mind 12W', 'Athlete Mind 12W', 'sport',
 12, 4,
 'Performance athlétique complète. 3 phases. Tous sports.',
 'Complete athletic performance. 3 phases. All sports.',
 'Volledige atletische prestatie. 3 fasen. Alle sporten.',
 'intermediate', false, 180, 'https://payhip.com/b/Z9gHi'),

('explosive-power-6w', 'Explosive Power 6W', 'Explosive Power 6W', 'Explosive Power 6W', 'sport',
 6, 3,
 'Plyométrie + sprint. Sauter plus haut, sprinter plus vite.',
 'Plyometrics + sprint. Jump higher, sprint faster.',
 'Plyometrie + sprint. Hoger springen, sneller sprinten.',
 'intermediate', false, 190, 'https://payhip.com/b/v5x2N'),

-- ✈️ VOYAGE / MAISON
('bodyweight-warrior-8w', 'Bodyweight Warrior 8W', 'Bodyweight Warrior 8W', 'Bodyweight Warrior 8W', 'travel_home',
 8, 4,
 'Zéro équipement. Hôtel · plage · partout. 3 niveaux.',
 'Zero equipment. Hotel · beach · anywhere. 3 levels.',
 'Geen materiaal. Hotel · strand · overal. 3 niveaus.',
 'beginner', false, 200, 'https://payhip.com/b/i2byn'),

('holiday-fit-4w', 'Holiday Fit 4W', 'Holiday Fit 4W', 'Holiday Fit 4W', 'travel_home',
 4, 4,
 'Hôtel OU extérieur. 16 séances · 4/sem. 30-40min.',
 'Hotel OR outdoor. 16 sessions · 4/week. 30-40min.',
 'Hotel OF buiten. 16 sessies · 4/week. 30-40min.',
 'beginner', false, 210, 'https://payhip.com/b/0s3JV'),

-- 🎁 FREE WOD (template seul, pas un programme classique)
('daily-wod-free', 'WOD Quotidien', 'Daily WOD', 'Dagelijkse WOD', 'functional',
 1, 7,
 'WOD du jour. Renouvelé chaque jour pour les abonnés.',
 'Daily workout. Refreshed each day for subscribers.',
 'Dagelijkse workout. Elke dag vernieuwd voor abonnees.',
 'beginner', false, 1, null);

-- ============================================================================
-- Workout templates exemple : Fat Burner 10W — Semaine 1 complète (5 séances)
-- ============================================================================

with prog as (select id from public.programs where slug = 'fat-burner-10w'),

-- Day 1 : Lower Body MetCon
w1d1 as (
  insert into public.workouts (program_id, week_number, day_number, title_fr, title_en, title_nl, focus, estimated_duration_min, intro_fr, intro_en, intro_nl)
  select id, 1, 1,
    'Bas du Corps + MetCon', 'Lower Body + MetCon', 'Onderlichaam + MetCon',
    'Strength + Conditioning', 50,
    'Première séance du programme. Active progressivement, technique avant intensité.',
    'First session of the program. Activate progressively, technique before intensity.',
    'Eerste sessie van het programma. Activeer progressief, techniek voor intensiteit.'
  from prog returning id
),

-- Day 2 : Upper Body Strength
w1d2 as (
  insert into public.workouts (program_id, week_number, day_number, title_fr, title_en, title_nl, focus, estimated_duration_min, intro_fr, intro_en, intro_nl)
  select id, 1, 2,
    'Haut du Corps Force', 'Upper Body Strength', 'Bovenlichaam Kracht',
    'Strength', 50,
    'Focus push/pull. Charges modérées, technique propre.',
    'Push/pull focus. Moderate loads, clean technique.',
    'Push/pull focus. Matige belastingen, schone techniek.'
  from prog returning id
),

-- Day 3 : Full Body HIIT
w1d3 as (
  insert into public.workouts (program_id, week_number, day_number, title_fr, title_en, title_nl, focus, estimated_duration_min, intro_fr, intro_en, intro_nl)
  select id, 1, 3,
    'HIIT Corps Entier', 'Full Body HIIT', 'Volledig Lichaam HIIT',
    'Conditioning', 35,
    'Intensité élevée, repos courts, vise la qualité plutôt que la vitesse.',
    'High intensity, short rest, aim for quality over speed.',
    'Hoge intensiteit, korte rust, mik op kwaliteit boven snelheid.'
  from prog returning id
),

-- Day 4 : Core + Cardio
w1d4 as (
  insert into public.workouts (program_id, week_number, day_number, title_fr, title_en, title_nl, focus, estimated_duration_min, intro_fr, intro_en, intro_nl)
  select id, 1, 4,
    'Core + Cardio Zone 2', 'Core + Zone 2 Cardio', 'Core + Zone 2 Cardio',
    'Aerobic base + Core', 45,
    'Cardio facile + gainage. Récupération active.',
    'Easy cardio + core. Active recovery.',
    'Makkelijke cardio + core. Actief herstel.'
  from prog returning id
),

-- Day 5 : Total Body Strength
w1d5 as (
  insert into public.workouts (program_id, week_number, day_number, title_fr, title_en, title_nl, focus, estimated_duration_min, intro_fr, intro_en, intro_nl)
  select id, 1, 5,
    'Corps Entier Force', 'Total Body Strength', 'Volledig Lichaam Kracht',
    'Strength + Power', 55,
    'Mouvements composés, charge intermédiaire, finir sur du conditioning court.',
    'Compound movements, intermediate load, finish with short conditioning.',
    'Samengestelde bewegingen, gemiddelde belasting, eindigen met korte conditionering.'
  from prog returning id
)

-- workout_exercises pour Day 1 : Lower + MetCon
insert into public.workout_exercises (workout_id, exercise_id, block, position, prescribed_sets, prescribed_reps, prescribed_rest_sec, set_type, notes_fr, notes_en, notes_nl)
select w1d1.id, e.id, b.block, b.pos, b.sets, b.reps, b.rest, b.set_type::set_type, b.note_fr, b.note_en, b.note_nl
from w1d1, public.exercises e
join (values
  ('warmup', 1, 'world-greatest-stretch', 2, '8/côté', 0, 'warmup', 'Échauffement complet', 'Full warm-up', 'Volledige opwarming'),
  ('warmup', 2, 'air-squat', 2, '15', 30, 'warmup', null, null, null),
  ('main', 3, 'back-squat', 4, '8-10', 90, 'work', 'RPE 7. Repos complet entre les séries.', 'RPE 7. Full rest between sets.', 'RPE 7. Volledige rust tussen sets.'),
  ('main', 4, 'romanian-deadlift', 3, '10-12', 75, 'work', 'Étirement ischios contrôlé.', 'Controlled hamstring stretch.', 'Gecontroleerde hamstring strek.'),
  ('main', 5, 'reverse-lunge', 3, '10/jambe', 60, 'work', null, null, null),
  ('metcon', 6, 'kb-swing', 1, '15', 0, 'metcon', '5 rounds AMRAP 12min', '5 rounds AMRAP 12min', '5 rondes AMRAP 12min'),
  ('metcon', 7, 'burpee', 1, '10', 0, 'metcon', null, null, null),
  ('metcon', 8, 'mountain-climber', 1, '20', 0, 'metcon', null, null, null),
  ('cooldown', 9, 'pigeon-pose', 1, '60s/côté', 0, 'time', null, null, null),
  ('cooldown', 10, 'foam-roll-quads', 1, '90s/jambe', 0, 'time', null, null, null)
) b(block, pos, slug, sets, reps, rest, set_type, note_fr, note_en, note_nl) on b.slug = e.slug;

-- Day 2 : Upper Strength
with w as (select id from public.workouts where program_id = (select id from public.programs where slug='fat-burner-10w') and week_number=1 and day_number=2)
insert into public.workout_exercises (workout_id, exercise_id, block, position, prescribed_sets, prescribed_reps, prescribed_rest_sec, set_type, notes_fr, notes_en, notes_nl)
select w.id, e.id, b.block, b.pos, b.sets, b.reps, b.rest, b.set_type::set_type, b.note_fr, b.note_en, b.note_nl
from w, public.exercises e
join (values
  ('warmup', 1, 'cat-cow', 1, '10', 0, 'warmup', null, null, null),
  ('warmup', 2, 'thread-the-needle', 1, '8/côté', 0, 'warmup', null, null, null),
  ('warmup', 3, 'face-pull', 2, '15', 30, 'warmup', 'Activation rotateurs externes.', 'External rotator activation.', 'Externe rotator activatie.'),
  ('main', 4, 'bench-press', 4, '6-8', 120, 'work', 'RPE 7-8. Spotter recommandé.', 'RPE 7-8. Spotter recommended.', 'RPE 7-8. Spotter aanbevolen.'),
  ('main', 5, 'pull-up', 4, 'AMRAP', 90, 'amrap', 'Si <5 reps, utilise élastique.', 'If <5 reps, use a band.', 'Als <5 reps, gebruik elastiek.'),
  ('main', 6, 'overhead-press', 3, '8-10', 90, 'work', null, null, null),
  ('main', 7, 'dumbbell-row', 3, '10/bras', 60, 'work', null, null, null),
  ('accessory', 8, 'biceps-curl', 3, '12', 45, 'work', null, null, null),
  ('accessory', 9, 'triceps-pushdown', 3, '12', 45, 'work', null, null, null),
  ('cooldown', 10, 'thread-the-needle', 1, '45s/côté', 0, 'time', null, null, null)
) b(block, pos, slug, sets, reps, rest, set_type, note_fr, note_en, note_nl) on b.slug = e.slug;

-- Day 3 : Full Body HIIT
with w as (select id from public.workouts where program_id = (select id from public.programs where slug='fat-burner-10w') and week_number=1 and day_number=3)
insert into public.workout_exercises (workout_id, exercise_id, block, position, prescribed_sets, prescribed_reps, prescribed_rest_sec, set_type, notes_fr, notes_en, notes_nl)
select w.id, e.id, b.block, b.pos, b.sets, b.reps, b.rest, b.set_type::set_type, b.note_fr, b.note_en, b.note_nl
from w, public.exercises e
join (values
  ('warmup', 1, 'jump-rope', 1, '90s', 0, 'warmup', null, null, null),
  ('warmup', 2, 'world-greatest-stretch', 1, '6/côté', 0, 'warmup', null, null, null),
  ('metcon', 3, 'thruster', 8, '12', 0, 'tabata', 'Tabata 20s on / 10s off x8', 'Tabata 20s on / 10s off x8', 'Tabata 20s aan / 10s uit x8'),
  ('metcon', 4, 'burpee', 8, '8', 0, 'tabata', null, null, null),
  ('metcon', 5, 'kb-swing', 8, '15', 0, 'tabata', null, null, null),
  ('metcon', 6, 'mountain-climber', 8, '30', 0, 'tabata', null, null, null),
  ('cooldown', 7, 'pigeon-pose', 1, '60s/côté', 0, 'time', null, null, null)
) b(block, pos, slug, sets, reps, rest, set_type, note_fr, note_en, note_nl) on b.slug = e.slug;

-- Day 4 : Core + Z2
with w as (select id from public.workouts where program_id = (select id from public.programs where slug='fat-burner-10w') and week_number=1 and day_number=4)
insert into public.workout_exercises (workout_id, exercise_id, block, position, prescribed_sets, prescribed_reps, prescribed_rest_sec, set_type, notes_fr, notes_en, notes_nl)
select w.id, e.id, b.block, b.pos, b.sets, b.reps, b.rest, b.set_type::set_type, b.note_fr, b.note_en, b.note_nl
from w, public.exercises e
join (values
  ('warmup', 1, 'cat-cow', 1, '10', 0, 'warmup', null, null, null),
  ('main', 2, 'plank', 4, '45s', 30, 'time', null, null, null),
  ('main', 3, 'side-plank', 4, '30s/côté', 30, 'time', null, null, null),
  ('main', 4, 'dead-bug', 3, '10/côté', 30, 'work', 'Lombaires collées au sol.', 'Lumbar pressed to floor.', 'Lendenen op vloer.'),
  ('main', 5, 'pallof-press', 3, '12/côté', 45, 'work', null, null, null),
  ('main', 6, 'hollow-body-hold', 3, '30s', 45, 'time', null, null, null),
  ('metcon', 7, 'run-easy', 1, '25min', 0, 'time', 'Z2 — FC 60-70% max.', 'Z2 — HR 60-70% max.', 'Z2 — HR 60-70% max.'),
  ('cooldown', 8, 'foam-roll-quads', 1, '90s/jambe', 0, 'time', null, null, null)
) b(block, pos, slug, sets, reps, rest, set_type, note_fr, note_en, note_nl) on b.slug = e.slug;

-- Day 5 : Total Body
with w as (select id from public.workouts where program_id = (select id from public.programs where slug='fat-burner-10w') and week_number=1 and day_number=5)
insert into public.workout_exercises (workout_id, exercise_id, block, position, prescribed_sets, prescribed_reps, prescribed_rest_sec, set_type, notes_fr, notes_en, notes_nl)
select w.id, e.id, b.block, b.pos, b.sets, b.reps, b.rest, b.set_type::set_type, b.note_fr, b.note_en, b.note_nl
from w, public.exercises e
join (values
  ('warmup', 1, 'world-greatest-stretch', 2, '6/côté', 0, 'warmup', null, null, null),
  ('warmup', 2, 'air-squat', 2, '12', 30, 'warmup', null, null, null),
  ('main', 3, 'trap-bar-deadlift', 4, '6-8', 120, 'work', 'RPE 7. Maintien dos neutre.', 'RPE 7. Keep neutral spine.', 'RPE 7. Houd rug neutraal.'),
  ('main', 4, 'dumbbell-press', 4, '8-10', 90, 'work', null, null, null),
  ('main', 5, 'goblet-squat', 3, '12', 75, 'work', null, null, null),
  ('main', 6, 'inverted-row', 3, 'AMRAP', 60, 'amrap', null, null, null),
  ('metcon', 7, 'wall-ball', 1, '21-15-9', 0, 'metcon', '21-15-9 reps wall-ball + burpees, for time.', '21-15-9 reps wall-ball + burpees, for time.', '21-15-9 reps wall-ball + burpees, voor tijd.'),
  ('metcon', 8, 'burpee', 1, '21-15-9', 0, 'metcon', null, null, null),
  ('cooldown', 9, 'foam-roll-quads', 1, '60s/jambe', 0, 'time', null, null, null),
  ('cooldown', 10, 'pigeon-pose', 1, '45s/côté', 0, 'time', null, null, null)
) b(block, pos, slug, sets, reps, rest, set_type, note_fr, note_en, note_nl) on b.slug = e.slug;

-- ============================================================================
-- Sanity checks
-- ============================================================================
do $$
declare v_progs int; v_workouts int; v_we int;
begin
  select count(*) into v_progs from public.programs;
  select count(*) into v_workouts from public.workouts;
  select count(*) into v_we from public.workout_exercises;
  raise notice 'Programs: %, Workouts: %, Workout exercises: %', v_progs, v_workouts, v_we;
  if v_progs < 22 then raise exception 'Expected 22+ programs'; end if;
  if v_workouts < 5 then raise exception 'Expected 5+ workouts (Fat Burner W1)'; end if;
end $$;
