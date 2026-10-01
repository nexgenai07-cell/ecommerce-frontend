// ============================================================
// heroData - UTILITY MODULE
// ============================================================
// Everything the homepage hero needs to get its data on screen FAST:
//   1. Query option builders shared by the hero component and the early
//      prefetch, so both use the very same cache entries.
//   2. A small localStorage cache of the last categories/products the hero
//      showed. On a repeat visit the hero paints that data instantly, while
//      fresh data is fetched quietly in the background.
//   3. prefetchHeroData(), called as soon as the app boots on the homepage,
//      so the requests (and the first category's images) start BEFORE the
//      Home page code has even finished loading.

import { QUERY_KEYS } from "../constants/queryKeys"; // Central TanStack Query keys
import { searchProducts } from "../api/products.api"; // Product search/filter endpoint (API 29)
import { getCategories } from "../api/categories.api"; // List categories endpoint (API 23)
import extractListData from "./extractListData"; // Normalises list responses into plain arrays
import { HERO_MAX_CATEGORIES } from "./heroScrollMap"; // How many categories the hero presents

// Maximum number of product tiles around the title (one per hero-slot-* class).
export const HERO_MAX_SPARKS = 12;

// How long fetched hero data stays fresh before it is refetched (10 minutes).
export const HERO_STALE_TIME = 1000 * 60 * 10;

// localStorage key and version of the saved hero data.
const CACHE_KEY = "zyron:hero-cache:v1";

// Saved hero data older than this is ignored (7 days).
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

// Returns the saved hero data, dropping anything that is too old.
// Always returns an object, so callers never need to null-check it.
export const readHeroCache = () => {
  const empty = { categories: null, products: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!parsed || parsed.v !== 1) return empty;

    // An entry is usable only while it is younger than CACHE_MAX_AGE.
    const isFresh = (entry) =>
      entry && Date.now() - entry.at < CACHE_MAX_AGE && entry.payload != null;

    const products = {};
    Object.entries(parsed.products || {}).forEach(([id, entry]) => {
      if (isFresh(entry)) products[id] = entry;
    });
    return {
      categories: isFresh(parsed.categories) ? parsed.categories : null,
      products,
    };
  } catch {
    return empty; // Storage blocked or corrupted: simply behave as a first visit
  }
};

// Saves the latest hero data. Entries look like { payload, at } where
// "payload" is the raw API body and "at" the time it was fetched. Product
// entries are merged with the existing ones so nothing already saved is lost.
export const writeHeroCache = ({ categories, products }) => {
  try {
    const existing = readHeroCache();
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        v: 1,
        categories: categories || existing.categories,
        products: { ...existing.products, ...products },
      }),
    );
  } catch {
    // Quota exceeded or storage blocked: the cache is only an optimisation
  }
};

// Turns a saved entry into TanStack Query "initial data" options.
// The data is shaped like an axios response ({ data }) because that is
// what extractListData and the other homepage sections expect.
const toInitialData = (entry) =>
  entry
    ? {
        initialData: { data: entry.payload },
        initialDataUpdatedAt: entry.at,
      }
    : {};

// Query options for the category list (same cache entry as the other homepage sections).
export const heroCategoriesQueryOptions = (cache) => ({
  queryKey: QUERY_KEYS.CATEGORIES, // Shared cache key, so no duplicate request is made
  queryFn: ({ signal }) => getCategories(undefined, signal), // Fetch the full category list
  staleTime: HERO_STALE_TIME, // Keep the result fresh for a while
  ...toInitialData(cache?.categories),
});

// Query options for the products shown around one category's title.
export const heroProductsQueryOptions = (categoryId, cache) => ({
  queryKey: [...QUERY_KEYS.PRODUCTS, "hero-category", categoryId], // One cache entry per category
  queryFn: ({ signal }) =>
    searchProducts(
      {
        category_id: categoryId, // Only products of this category
        ordering: "-created_at", // Newest products first
        page: 1, // First page is enough for the sprinkles
        page_size: HERO_MAX_SPARKS, // Exactly as many as fit around the title
      },
      signal,
    ),
  staleTime: HERO_STALE_TIME, // Keep the result fresh for a while
  ...toInitialData(cache?.products?.[categoryId]),
});

// Starts downloading product pictures right away so they are already in the
// browser cache when the hero renders them.
const preloadImages = (products) => {
  products.forEach((product) => {
    if (!product?.primary_image) return;
    const image = new Image();
    image.fetchPriority = "high"; // The first screen's pictures matter most
    image.decoding = "async";
    image.src = product.primary_image;
  });
};

// Warms the query cache for the hero. Called once at app start on the
// homepage. It never throws: if anything fails, the hero simply fetches
// its own data when it mounts.
export const prefetchHeroData = async (queryClient) => {
  try {
    const cache = readHeroCache();

    // Start the (possibly background) refresh of the category list.
    const categoriesPromise = queryClient.fetchQuery(
      heroCategoriesQueryOptions(cache),
    );
    categoriesPromise.catch(() => {}); // Failure is handled by the hero itself

    // With saved categories we can request products immediately instead of
    // waiting for the category request to come back.
    const list = cache.categories
      ? extractListData({ data: cache.categories.payload })
      : extractListData(await categoriesPromise);
    const categories = list.slice(0, HERO_MAX_CATEGORIES);

    await Promise.all(
      categories.map(async (category, index) => {
        const response = await queryClient.fetchQuery(
          heroProductsQueryOptions(category.id, cache),
        );
        // Only the first category's pictures are needed immediately.
        if (index === 0) preloadImages(extractListData(response));
      }),
    );
  } catch {
    // Ignored on purpose, see the note above
  }
};
