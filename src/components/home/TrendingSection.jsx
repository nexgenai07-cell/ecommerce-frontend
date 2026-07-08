// // ============================================================
// TRENDING NOW SECTION
// Shows exactly 4 trending products (single row on desktop) fetched
// from the real backend API. Products can be filtered using category
// "pills" — clicking a pill re-fetches products filtered by category_id.
// Clicking "View All" navigates to the full Products listing page.
// Section is centered inside the shared Container, with consistent
// left/right breathing room at every screen size.
// Fully responsive.
// ============================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineArrowRight } from "react-icons/ai";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { searchProducts } from "../../api/products.api"; // /search/ endpoint — the only documented one that supports category_id + ordering filters
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import ProductGrid from "../shared/ProductGrid";
import CategoryPills from "../shared/CategoryPills";
import Container from "../layouts/Container";

// Only ever show a single row of 4 cards on the Home page —
// the full catalog is available via "View All"
const TRENDING_LIMIT = 4;

const TrendingSection = () => {
  // Stores which category is currently selected for filtering.
  // null means "no filter" / "show all categories"
  const [activeCategory, setActiveCategory] = useState(null);

  // =============================================
  // CATEGORIES API CALL — for the filter pills
  // =============================================
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10, // fresh for 10 minutes
  });

  // API_Documentation_Final.pdf (API 11) documents this endpoint as
  // returning a flat array, but the real Network response shows a
  // DRF-paginated object instead — a backend/docs contract mismatch.
  // extractListData() safely handles either shape.
  const categories = extractListData(categoriesData);

  // =============================================
  // TRENDING PRODUCTS API CALL
  // Re-runs automatically whenever "activeCategory" changes,
  // because activeCategory is part of the queryKey below.
  // =============================================
  const { data: productsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "trending", activeCategory],
    queryFn: () =>
      searchProducts({
        category_id: activeCategory || undefined, // omit entirely if no category selected
        ordering: "-created_at", // newest first
        page: 1,
      }),
    staleTime: 1000 * 60 * 5,
  });

  // Only ever take the first 4 results — keeps the section to a single row
  const products = productsData?.data?.results?.slice(0, TRENDING_LIMIT) || [];

  return (
    <section className="py-14 px-19">
      {/* Container centers the whole section and applies consistent
          left/right padding at every breakpoint, including extra
          room on very large screens (xl:px-12) so the section never
          reads as "edge to edge" on wide monitors */}
      <Container className="xl:px-12">
        <div className="flex flex-col gap-8">
          {/* ============ SECTION HEADER ============ */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
              <p className="text-sm text-gray-400">
                Curated picks updated daily
              </p>
            </div>
            <Link
              to={ROUTES.PRODUCTS}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 hover:underline shrink-0 transition-all duration-200"
            >
              View All
              <AiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ============ CATEGORY FILTER PILLS ============ */}
          <CategoryPills
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            showAll={true}
          />

          {/* ============ PRODUCTS GRID — single row of 4 ============ */}
          <ProductGrid
            products={products}
            isLoading={isLoading}
            skeletonCount={TRENDING_LIMIT}
            cols={{ default: 2, sm: 2, md: 3, lg: 4 }}
            emptyVariant="noProducts"
          />
        </div>
      </Container>
    </section>
  );
};

export default TrendingSection;
