// ═══════════════════════════════════════════════════════════════
// COACH DM — OpenFoodFacts client
// 
// API gratuite, 3M+ produits, idéale pour le marché européen.
// https://wiki.openfoodfacts.org/API
// ═══════════════════════════════════════════════════════════════

import type { Food } from './types';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2';
const USER_AGENT = 'CoachDM-App/1.0 (https://coachdm.be)';

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fat_100g?: number;
  'saturated-fat_100g'?: number;
  fiber_100g?: number;
  salt_100g?: number;
}

interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_fr?: string;
  product_name_en?: string;
  product_name_nl?: string;
  generic_name?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  image_small_url?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
}

interface OFFResponse {
  status: 0 | 1;
  status_verbose: string;
  product?: OFFProduct;
}

interface OFFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OFFProduct[];
}

// ── Erreurs typées ────────────────────────────────────────────
export class OFFNotFoundError extends Error {
  constructor(barcode: string) {
    super(`Product not found in OpenFoodFacts: ${barcode}`);
    this.name = 'OFFNotFoundError';
  }
}

export class OFFFetchError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OFFFetchError';
  }
}

// ── Fetch by barcode ──────────────────────────────────────────
/**
 * Récupère un produit par son code-barres (EAN-13, EAN-8, UPC).
 * Retourne null si absent (pas d'erreur — comportement attendu).
 */
export async function fetchProductByBarcode(
  barcode: string,
): Promise<OFFProduct | null> {
  // Nettoyer le code-barres
  const cleanBarcode = barcode.replace(/\D/g, '');
  if (cleanBarcode.length < 8) {
    throw new OFFFetchError(`Invalid barcode format: ${barcode}`);
  }

  const url = `${OFF_BASE_URL}/product/${cleanBarcode}.json?fields=code,product_name,product_name_fr,product_name_en,product_name_nl,generic_name,brands,image_url,image_front_url,image_small_url,serving_size,serving_quantity,nutriments`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch (err) {
    throw new OFFFetchError(`Network error: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new OFFFetchError(
      `OpenFoodFacts API error: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as OFFResponse;

  if (data.status === 0 || !data.product) {
    return null;
  }

  return data.product;
}

// ── Search by name ────────────────────────────────────────────
/**
 * Recherche par nom (fallback si scan échoue).
 */
export async function searchProductsByName(
  query: string,
  options: { limit?: number; locale?: 'fr' | 'en' | 'nl' } = {},
): Promise<OFFProduct[]> {
  const { limit = 20, locale = 'fr' } = options;
  if (query.trim().length < 2) return [];

  const params = new URLSearchParams({
    search_terms: query,
    page_size: String(limit),
    fields: 'code,product_name,product_name_fr,product_name_en,product_name_nl,brands,image_small_url,nutriments',
    lc: locale,
  });

  const url = `${OFF_BASE_URL}/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new OFFFetchError(
      `OpenFoodFacts search error: ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as OFFSearchResponse;
  return data.products ?? [];
}

// ── Mapping vers notre schéma Food ────────────────────────────
/**
 * Convertit un produit OFF en Food prêt à insérer en BDD.
 * Retourne null si les données nutritionnelles essentielles manquent.
 */
export function mapOFFProductToFood(
  product: OFFProduct,
): Omit<Food, 'id' | 'created_at' | 'updated_at'> | null {
  const nutriments = product.nutriments ?? {};

  // Calories : OFF retourne soit en kcal soit en kJ
  let kcal = nutriments['energy-kcal_100g'];
  if (kcal == null && nutriments.energy_100g != null) {
    // Conversion kJ → kcal
    kcal = nutriments.energy_100g / 4.184;
  }

  if (kcal == null || isNaN(kcal)) {
    return null;
  }

  const name_fr =
    product.product_name_fr ||
    product.product_name ||
    product.generic_name ||
    'Produit sans nom';

  return {
    barcode: product.code,
    off_id: product.code,
    name_fr,
    name_en: product.product_name_en ?? null,
    name_nl: product.product_name_nl ?? null,
    brand: product.brands?.split(',')[0]?.trim() ?? null,
    kcal_per_100g: Math.round(kcal * 10) / 10,
    protein_per_100g: nutriments.proteins_100g ?? 0,
    carbs_per_100g: nutriments.carbohydrates_100g ?? 0,
    sugars_per_100g: nutriments.sugars_100g ?? null,
    fat_per_100g: nutriments.fat_100g ?? 0,
    saturated_fat_per_100g: nutriments['saturated-fat_100g'] ?? null,
    fiber_per_100g: nutriments.fiber_100g ?? null,
    salt_per_100g: nutriments.salt_100g ?? null,
    default_serving_g: product.serving_quantity ?? null,
    default_serving_label_fr: product.serving_size ?? null,
    default_serving_label_en: product.serving_size ?? null,
    default_serving_label_nl: product.serving_size ?? null,
    image_url: product.image_front_url ?? product.image_url ?? null,
    is_custom: false,
    is_verified: false,        // Sera reverifié par un coach manuellement
    created_by: null,
  };
}

// ── Helper unique pour scan flow ──────────────────────────────
/**
 * Scan flow complet :
 * 1. Cherche le produit dans OFF
 * 2. Le mappe vers notre schéma
 * 3. Retourne null si introuvable ou données invalides
 */
export async function fetchAndMapBarcode(
  barcode: string,
): Promise<Omit<Food, 'id' | 'created_at' | 'updated_at'> | null> {
  const product = await fetchProductByBarcode(barcode);
  if (!product) return null;
  return mapOFFProductToFood(product);
}
