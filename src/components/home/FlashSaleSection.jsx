import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { searchProducts } from "../../api/products.api";
import Container from "../layouts/Container";
import PriceDisplay from "../shared/PriceDisplay";

const FALLBACK_IMAGE = "/placeholder-product.png";

// =============================================
// COUNTDOWN TIMER HOOK
// =============================================
const useCountdown = (hours = 48) => {
  const [target] = useState(() => {
    const t = new Date();
    t.setHours(t.getHours() + hours);
    return t;
  });

  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculate = () => {
      const diff = target - new Date();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return timeLeft;
};

// =============================================
// COUNTDOWN UNIT COMPONENT
// =============================================
const CountdownUnit = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 min-w-13 text-center">
      <p className="text-xl sm:text-2xl font-bold text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </p>
    </div>
    <p className="text-[11px] text-gray-500">{label}</p>
  </div>
);

// =============================================
// FLASH SALE PRODUCT TILE
// Fixed heights throughout — a compact white card that floats
// cleanly against the dark section background.
// =============================================
const FlashSaleTile = ({ product }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasDiscount = product.original_price > product.price;
  const imageSrc =
    !product.primary_image || imageFailed
      ? FALLBACK_IMAGE
      : product.primary_image;

  return (
    <Link
      to={ROUTES.PRODUCT_DETAIL.replace(":id", product.id)}
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-200 group"
    >
      {/* Fixed-height image area — never grows/shrinks based on
          content or grid siblings, so the card height is always predictable */}
      <div className="relative h-28 sm:h-36 bg-gray-50 overflow-hidden">
        <img
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {hasDiscount && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-danger text-white text-[11px] font-bold rounded-md">
              -
              {Math.round(
                ((product.original_price - product.price) /
                  product.original_price) *
                  100,
              )}
              %
            </span>
          </div>
        )}
      </div>

      {/* Fixed-height text area — keeps every card the same total height */}
      <div className="p-3 h-17 flex flex-col justify-between">
        <p className="text-xs font-medium text-gray-800 line-clamp-1">
          {product.name}
        </p>

        <PriceDisplay
          price={parseFloat(product.price)}
          originalPrice={parseFloat(product.original_price)}
          size="sm"
        />
      </div>
    </Link>
  );
};

const FlashSaleSection = () => {
  const countdown = useCountdown(48);

  // =============================================
  // FLASH SALE PRODUCTS API CALL
  // =============================================
  const { data: productsData, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.PRODUCTS, "flash-sale"],
    queryFn: () =>
      searchProducts({
        ordering: "-created_at",
        page: 1,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const products = (() => {
    const results = productsData?.data?.results || [];
    const discounted = results.filter(
      (p) => parseFloat(p.original_price) > parseFloat(p.price),
    );
    // Prefer genuinely discounted products; only backfill with regular
    // products if there aren't at least 3 discounted ones available yet
    const chosen = discounted.length >= 3 ? discounted : results;
    return chosen.slice(0, 3);
  })();

  return (
    <section className="bg-[#0d1b2a] py-20 lg:px-20">
      <Container>
        {/* ============ TWO-COLUMN LAYOUT ============ */}
        {/* Mobile: stacked (left content on top, cards below) */}
        {/* lg+: side by side — left column fixed width, right column takes the rest */}
        <div className="flex flex-col px-12 lg:flex-row lg:items-center gap-8 lg:gap-15">
          {/* ============ LEFT COLUMN: badge + heading + description + countdown ============ */}
          <div className="flex flex-col gap-4 lg:w-95 shrink-0">
            <span className="inline-flex w-fit px-2.5 py-1 bg-danger text-white text-xs font-bold rounded-md uppercase tracking-wide">
              Limited Offers
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Limited Offers. Don't Miss Out.
            </h2>

            <p className="text-sm text-gray-400 leading-relaxed">
              Prices this good never last long. Grab these hand-picked deals
              before the timer runs out and stock disappears.
            </p>

            <div className="flex items-center gap-2">
              <CountdownUnit value={countdown.hours} label="Hr" />
              <span className="text-white/30 font-bold text-lg mb-5">:</span>
              <CountdownUnit value={countdown.minutes} label="Min" />
              <span className="text-white/30 font-bold text-lg mb-5">:</span>
              <CountdownUnit value={countdown.seconds} label="Sec" />
            </div>
          </div>

          {/* ============ RIGHT COLUMN: product tiles, directly opposite the left content ============ */}
          <div className="flex-1 w-full">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <div className="h-28 sm:h-36 bg-white/10 animate-pulse" />
                    <div className="h-17 bg-white/5 animate-pulse mt-px" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid  sm:grid-cols-3 gap-2">
                {products.map((product) => (
                  <FlashSaleTile key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">
                Flash sale products coming soon
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FlashSaleSection;
