-- ═══════════════════════════════════════════════════════════════
-- COACH DM — Migration 0003 : Vues et fonctions métier
-- ═══════════════════════════════════════════════════════════════

-- ── Vue : résumé nutritionnel du jour ──────────────────────────
-- Utilisée par le dashboard mobile pour afficher l'avancement
create or replace view public.daily_nutrition_summary as
select
  fl.user_id,
  fl.logged_date,
  count(*) as meals_logged,
  coalesce(sum(fl.kcal), 0)::numeric(8,2) as total_kcal,
  coalesce(sum(fl.protein_g), 0)::numeric(7,2) as total_protein_g,
  coalesce(sum(fl.carbs_g), 0)::numeric(7,2) as total_carbs_g,
  coalesce(sum(fl.fat_g), 0)::numeric(7,2) as total_fat_g,
  coalesce(sum(fl.fiber_g), 0)::numeric(7,2) as total_fiber_g
from public.food_logs fl
group by fl.user_id, fl.logged_date;

-- ── Vue : hydratation du jour ──────────────────────────────────
create or replace view public.daily_water_summary as
select
  user_id,
  logged_date,
  coalesce(sum(amount_ml), 0)::integer as total_ml
from public.water_logs
group by user_id, logged_date;

-- ── Fonction : récupérer le résumé complet d'un jour pour un user ──
-- Combine targets + consommé + hydratation + dernier poids
create or replace function public.get_daily_dashboard(p_date date default current_date)
returns json
language plpgsql
stable
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_target record;
  v_nutrition record;
  v_water integer;
  v_last_weight numeric;
  v_result json;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Target actif
  select * into v_target
  from public.nutrition_targets
  where user_id = v_user_id and is_active = true
  limit 1;

  -- Nutrition consommée
  select 
    coalesce(sum(kcal), 0) as kcal,
    coalesce(sum(protein_g), 0) as protein,
    coalesce(sum(carbs_g), 0) as carbs,
    coalesce(sum(fat_g), 0) as fat,
    coalesce(sum(fiber_g), 0) as fiber,
    count(*) as meals
  into v_nutrition
  from public.food_logs
  where user_id = v_user_id and logged_date = p_date;

  -- Eau
  select coalesce(sum(amount_ml), 0)::integer into v_water
  from public.water_logs
  where user_id = v_user_id and logged_date = p_date;

  -- Dernier poids
  select weight_kg into v_last_weight
  from public.weight_logs
  where user_id = v_user_id
  order by logged_date desc
  limit 1;

  v_result := json_build_object(
    'date', p_date,
    'target', case when v_target is null then null else json_build_object(
      'kcal', v_target.daily_calories_kcal,
      'protein_g', v_target.protein_g,
      'carbs_g', v_target.carbs_g,
      'fat_g', v_target.fat_g,
      'fiber_g', v_target.fiber_g,
      'water_ml', v_target.water_ml,
      'goal', v_target.goal
    ) end,
    'consumed', json_build_object(
      'kcal', v_nutrition.kcal,
      'protein_g', v_nutrition.protein,
      'carbs_g', v_nutrition.carbs,
      'fat_g', v_nutrition.fat,
      'fiber_g', v_nutrition.fiber,
      'meals', v_nutrition.meals
    ),
    'water_ml', v_water,
    'last_weight_kg', v_last_weight
  );

  return v_result;
end;
$$;

-- ── Fonction : recherche d'aliments (full-text + barcode) ──────
create or replace function public.search_foods(
  p_query text default null,
  p_barcode text default null,
  p_limit integer default 20
)
returns setof public.foods
language plpgsql
stable
security definer
as $$
begin
  if p_barcode is not null then
    return query
      select * from public.foods
      where barcode = p_barcode
      limit 1;
    return;
  end if;

  if p_query is null or length(trim(p_query)) < 2 then
    return;
  end if;

  return query
    select f.*
    from public.foods f
    where f.search_vector @@ websearch_to_tsquery('simple', p_query)
       or f.name_fr ilike '%' || p_query || '%'
       or f.name_en ilike '%' || p_query || '%'
       or f.name_nl ilike '%' || p_query || '%'
    order by 
      case when f.is_verified then 0 else 1 end,
      ts_rank(f.search_vector, websearch_to_tsquery('simple', p_query)) desc
    limit p_limit;
end;
$$;

-- ── Permissions sur les vues ───────────────────────────────────
grant select on public.daily_nutrition_summary to authenticated;
grant select on public.daily_water_summary to authenticated;
grant execute on function public.get_daily_dashboard to authenticated;
grant execute on function public.search_foods to authenticated;
grant execute on function public.has_active_subscription to authenticated;
