import { useCallback, useRef, useState } from "react";
// useCallback — memoizes a function so it isn't recreated on every render
// useRef      — holds a mutable value (a DOM node) that does NOT trigger
//               a re-render when it changes
// useState    — normal React state, used only for the parts that ARE safe
//               to drive through re-renders (whether the scene is visible,
//               and which mode — wishlist or cart — it's showing)

import { motion, AnimatePresence } from "framer-motion";
// motion         — Framer Motion's animated version of a normal HTML element
// AnimatePresence — lets an element play an "exit" animation before being
//                   removed from the DOM, instead of just vanishing instantly

import { FlyToIconContext } from "../../../hooks/useFlyToIcon";
// The Context object itself, defined in useFlyToIcon.js — this component
// is the one that actually PROVIDES a value into that Context

// Only a tiny pause before the very first movement of any flight — just
// enough for the browser to paint the flyer's starting position first.
const STARTUP_DELAY = 30;

// How long each leg of a flight takes to complete (matches the CSS
// transition durations defined on the corresponding class in index.css) —
// used here only to know when it's safe to trigger the NEXT step, or to
// remove/close things once a leg has visibly finished.
const RISE_DURATION = 480; // matches .fly-to-icon-clone--rise (0.48s)
const DROP_DURATION = 510; // matches .fly-to-icon-clone--drop (0.5s + buffer)
const RETURN_DURATION = 680; // matches .fly-to-icon-clone--return (0.55s + buffer)
const DISMISS_DURATION = 950; // matches .fly-to-icon-clone--dismiss (0.9s + buffer)

// How far above the centered bag/cart graphic the item arcs before
// dropping in/emerging (used by "in" and "return" flights).
const ARC_HEIGHT = 100;

// How far straight up a "dismiss" flight travels — well off the top of
// any normal screen, so it always fully exits view before fading out.
const DISMISS_RISE_DISTANCE = 360;

const FlyToIconProvider = ({ children }) => {
  // Ref to the bag/cart "bump" element, so we can trigger the little
  // shake/rotate feedback exactly when the item lands or leaves.
  const sceneIconRef = useRef(null);

  // "wishlist" | "cart" | null — controls which graphic (bag or cart) the
  // overlay currently shows.
  const [mode, setMode] = useState(null);
  // Whether the dark overlay + bag/cart scene is currently visible at all.
  const [sceneVisible, setSceneVisible] = useState(false);

  // The bag/cart graphic always pops up dead-center on screen — so the
  // flight target is simply the center of the current viewport,
  // recalculated fresh on every trigger (so it's always correct even if
  // the window was resized).
  const getSceneCenter = () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  // Briefly scales/rotates the bag or cart icon in the overlay scene, as
  // visual feedback that something just landed in it (or just left it).
  const bumpSceneIcon = (direction = "in") => {
    const node = sceneIconRef.current;
    if (!node) return;
    node.style.transformOrigin = "center bottom";
    node.style.transition = "transform 0.2s ease";
    node.style.transform =
      direction === "in" ? "rotate(-5deg)" : "rotate(5deg)";
    setTimeout(() => {
      node.style.transform =
        direction === "in" ? "rotate(4deg)" : "rotate(-4deg)";
    }, 190);
    setTimeout(() => {
      node.style.transform = "rotate(0deg)";
    }, 380);
  };

  // Creates the flying <img> clone of the real product image, positioned
  // at (originX, originY) in screen coordinates. Only `left`/`top` are
  // set inline — a genuinely per-click DYNAMIC value — everything else
  // (size, rounding, shadow, border, stacking order) lives in the
  // ".fly-to-icon-clone" CSS class in index.css.
  const createFlyer = (imageUrl, originX, originY) => {
    const el = document.createElement("img");
    el.src = imageUrl; // the REAL product photo — not a placeholder icon
    el.alt = "";
    el.className = "fly-to-icon-clone"; // all static styling lives in index.css
    el.style.left = `${originX}px`; // set ONCE here — never touched again
    el.style.top = `${originY}px`; // set ONCE here — never touched again
    document.body.appendChild(el);
    return el;
  };

  // Returns the screen-space center point of a real element if one was
  // given. Falls back to a sensible default (bottom-center of the
  // viewport) when no element is available for some reason — this way
  // the animation always plays instead of silently doing nothing.
  const getOriginPoint = (originEl) => {
    if (originEl) {
      const rect = originEl.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    // Logged so this is immediately visible in devtools if it ever
    // happens again — helps pinpoint which button/page is missing a
    // valid image ref, instead of the animation just silently using a
    // fallback position with no trace of why.
    console.warn(
      "[FlyToIcon] No origin element was provided — using a fallback position instead of the real image location.",
    );
    return { x: window.innerWidth / 2, y: window.innerHeight - 80 };
  };

  // Moves the flyer to a new waypoint: swaps in the CSS class carrying
  // the correct transition/easing for this leg (see index.css), then
  // updates the CSS custom properties that class reads from.
  const setFlyerState = (el, transitionClass, x, y, scale, opacity) => {
    el.classList.remove(
      "fly-to-icon-clone--rise",
      "fly-to-icon-clone--drop",
      "fly-to-icon-clone--return",
      "fly-to-icon-clone--dismiss",
      "fly-to-icon-clone--instant",
    );
    el.classList.add(transitionClass);
    el.style.setProperty("--fly-x", `${x}px`);
    el.style.setProperty("--fly-y", `${y}px`);
    el.style.setProperty("--fly-scale", scale);
    if (opacity !== undefined) {
      el.style.setProperty("--fly-opacity", opacity);
    }
  };

  // ─────────────────────────────────────────
  // ADD flight — card → above center → center, then vanish.
  // Starts almost instantly (STARTUP_DELAY only).
  // ─────────────────────────────────────────
  const runAddFlight = useCallback((flyMode, originEl, imageUrl) => {
    if (!imageUrl) return;

    const target = getSceneCenter();
    const abovePoint = { x: target.x, y: target.y - ARC_HEIGHT };

    setMode(flyMode);
    setSceneVisible(true);

    const { x: originX, y: originY } = getOriginPoint(originEl);

    const flyer = createFlyer(imageUrl, originX, originY);
    const dAx = abovePoint.x - originX;
    const dAy = abovePoint.y - originY;
    const dBx = target.x - originX;
    const dBy = target.y - originY;

    // Step 1: rise toward the point above the bag/cart — starts almost immediately.
    setTimeout(() => {
      setFlyerState(flyer, "fly-to-icon-clone--rise", dAx, dAy, 0.75);
    }, STARTUP_DELAY);

    // Step 2: drop down into the bag/cart opening.
    const dropStart = STARTUP_DELAY + RISE_DURATION;
    setTimeout(() => {
      setFlyerState(flyer, "fly-to-icon-clone--drop", dBx, dBy, 0.4);
    }, dropStart);

    // Step 3: instantly hide — the item has "landed" and must never be
    // visible peeking out on top of the bag/cart.
    const landTime = dropStart + DROP_DURATION;
    setTimeout(() => {
      setFlyerState(flyer, "fly-to-icon-clone--instant", dBx, dBy, 0.4, 0);
    }, landTime);

    setTimeout(() => flyer.remove(), landTime + 50);
    setTimeout(() => bumpSceneIcon("in"), landTime);

    setTimeout(() => setSceneVisible(false), landTime + 900);
    setTimeout(() => setMode(null), landTime + 1300);
  }, []);

  // ─────────────────────────────────────────
  // RETURN flight — item flies OUT of the bag/cart and back down into
  // the still-visible photo (un-hearting a product on a listing page,
  // or decreasing a cart/product-detail quantity stepper). Starts
  // almost instantly.
  // ─────────────────────────────────────────
  const runReturnFlight = useCallback((flyMode, originEl, imageUrl) => {
    if (!imageUrl) return;

    const target = getSceneCenter();
    const abovePoint = { x: target.x, y: target.y - ARC_HEIGHT };

    setMode(flyMode);
    setSceneVisible(true);

    // Wobble the bag/cart right away, as if something is being lifted out.
    bumpSceneIcon("out");

    setTimeout(() => {
      // Starts already AT the bag/cart position (small) — "--instant"
      // means no transition plays for this starting state.
      const flyer = createFlyer(imageUrl, target.x, target.y);
      setFlyerState(flyer, "fly-to-icon-clone--instant", 0, 0, 0.4, 1);

      // Double requestAnimationFrame guarantees the browser paints the
      // starting position above BEFORE the transform target changes —
      // otherwise the two style changes can collapse into a single paint
      // and the flight never visibly animates.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlyerState(
            flyer,
            "fly-to-icon-clone--rise",
            0,
            abovePoint.y - target.y,
            0.75,
          );
        });
      });

      const returnStart = RISE_DURATION + 40;
      setTimeout(() => {
        // Re-measure the card's position fresh — the page may have
        // scrolled or the layout may have shifted since the click.
        // Falls back to a sensible default if the element is missing.
        const { x: targetX, y: targetY } = getOriginPoint(originEl);
        const dx = targetX - target.x;
        const dy = targetY - target.y;
        setFlyerState(flyer, "fly-to-icon-clone--return", dx, dy, 1, 0);
      }, returnStart);

      setTimeout(() => flyer.remove(), returnStart + RETURN_DURATION);
    }, STARTUP_DELAY);

    const totalLeadIn = STARTUP_DELAY + RISE_DURATION + 40 + RETURN_DURATION;
    setTimeout(() => setSceneVisible(false), totalLeadIn + 550);
    setTimeout(() => setMode(null), totalLeadIn + 950);
  }, []);

  // ─────────────────────────────────────────
  // DISMISS flight — used only when the row/card is gone for good (the
  // Wishlist/Cart page's own remove button). The item is treated as
  // ALREADY being inside the bag/cart — it pops straight out from the
  // centered graphic and rises away, fading out. There is no "flying in
  // from the row" leg at all, and nothing to return to. Starts almost
  // instantly.
  // ─────────────────────────────────────────
  const runDismissFlight = useCallback((flyMode, imageUrl) => {
    if (!imageUrl) return;

    const target = getSceneCenter();

    setMode(flyMode);
    setSceneVisible(true);

    // The bag/cart wiggles right away, as if something is being taken out.
    bumpSceneIcon("out");

    setTimeout(() => {
      // Pops into existence already AT the bag/cart's center, small.
      const flyer = createFlyer(imageUrl, target.x, target.y);
      setFlyerState(flyer, "fly-to-icon-clone--instant", 0, 0, 0.4, 1);

      // Double rAF guarantees that starting frame is actually painted
      // before the outward flight begins.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlyerState(
            flyer,
            "fly-to-icon-clone--dismiss",
            0,
            -DISMISS_RISE_DISTANCE,
            0.3,
            0,
          );
        });
      });

      setTimeout(() => flyer.remove(), DISMISS_DURATION + 50);
    }, STARTUP_DELAY);

    const total = STARTUP_DELAY + DISMISS_DURATION;
    setTimeout(() => setSceneVisible(false), total + 350);
    setTimeout(() => setMode(null), total + 750);
  }, []);

  // ─────────────────────────────────────────
  // DISMISS-ALL flight — used by "Clear Cart": every item in the cart
  // pops out of the centered cart graphic and rises away AT ONCE, each
  // with a slightly different horizontal offset so they fan out instead
  // of perfectly overlapping. Internally this is just runDismissFlight
  // fired once per image with a staggered start and a spread offset.
  // ─────────────────────────────────────────
  const runDismissAllFlight = useCallback((flyMode, imageUrls) => {
    const validUrls = (imageUrls || []).filter(Boolean);
    if (validUrls.length === 0) return;

    const target = getSceneCenter();

    setMode(flyMode);
    setSceneVisible(true);
    bumpSceneIcon("out");

    const SPREAD = 70; // horizontal gap between each item's fan-out direction
    const STAGGER = 40; // ms between each item starting its flight
    const mid = (validUrls.length - 1) / 2;

    validUrls.forEach((imageUrl, index) => {
      const xOffset = (index - mid) * SPREAD;
      const startAt = STARTUP_DELAY + index * STAGGER;

      setTimeout(() => {
        const flyer = createFlyer(imageUrl, target.x, target.y);
        setFlyerState(flyer, "fly-to-icon-clone--instant", 0, 0, 0.4, 1);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setFlyerState(
              flyer,
              "fly-to-icon-clone--dismiss",
              xOffset,
              -DISMISS_RISE_DISTANCE,
              0.3,
              0,
            );
          });
        });

        setTimeout(() => flyer.remove(), DISMISS_DURATION + 50);
      }, startAt);
    });

    const total = STARTUP_DELAY + validUrls.length * STAGGER + DISMISS_DURATION;
    setTimeout(() => setSceneVisible(false), total + 350);
    setTimeout(() => setMode(null), total + 750);
  }, []);

  // ─────────────────────────────────────────
  // Stable wrapper functions — these are what actually get exposed
  // through Context.
  // ─────────────────────────────────────────
  const flyToWishlist = useCallback(
    (originEl, imageUrl) => runAddFlight("wishlist", originEl, imageUrl),
    [runAddFlight],
  );
  const flyBackToWishlistCard = useCallback(
    (originEl, imageUrl) => runReturnFlight("wishlist", originEl, imageUrl),
    [runReturnFlight],
  );
  const flyBackFromCart = useCallback(
    (originEl, imageUrl) => runReturnFlight("cart", originEl, imageUrl),
    [runReturnFlight],
  );
  const dismissFromWishlist = useCallback(
    (imageUrl) => runDismissFlight("wishlist", imageUrl),
    [runDismissFlight],
  );
  const flyToCart = useCallback(
    (originEl, imageUrl) => runAddFlight("cart", originEl, imageUrl),
    [runAddFlight],
  );
  const dismissFromCart = useCallback(
    (imageUrl) => runDismissFlight("cart", imageUrl),
    [runDismissFlight],
  );
  const dismissAllFromCart = useCallback(
    (imageUrls) => runDismissAllFlight("cart", imageUrls),
    [runDismissAllFlight],
  );

  const contextValue = {
    flyToWishlist,
    flyBackToWishlistCard,
    dismissFromWishlist,
    flyToCart,
    flyBackFromCart,
    dismissFromCart,
    dismissAllFromCart,
  };

  return (
    <FlyToIconContext.Provider value={contextValue}>
      {children}

      {/* ============================================================
          OVERLAY — dark backdrop + large centered bag/cart graphic.
          Sits above everything else (z-toast) but never intercepts
          clicks — pointer-events-none, purely decorative.
          ============================================================ */}
      <AnimatePresence>
        {sceneVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-toast flex items-center justify-center bg-gray-900/55 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96"
            >
              {/* This inner div is what bumpSceneIcon() rotates/wobbles */}
              <div ref={sceneIconRef} className="w-full h-full">
                {mode === "wishlist" ? <WishlistBagGraphic /> : <CartGraphic />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FlyToIconContext.Provider>
  );
};

// ============================================================
// WISHLIST BAG GRAPHIC — bright emerald + amber, from tokens.css
// ============================================================
const WishlistBagGraphic = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
    <ellipse cx="100" cy="178" rx="52" ry="8" fill="rgba(0,0,0,0.18)" />
    <path
      d="M68,86 Q68,50 100,50 Q132,50 132,86"
      fill="none"
      stroke="var(--color-warning)"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M58,90 L142,90 L152,172 Q152,180 143,180 L57,180 Q48,180 48,172 Z"
      fill="var(--color-primary-light)"
    />
    <path
      d="M100,90 L142,90 L152,172 Q152,180 143,180 L100,180 Z"
      fill="var(--color-primary)"
    />
    <path
      d="M58,90 L142,90 L138,105 L62,105 Z"
      fill="var(--color-primary-dark)"
    />
    <rect
      x="54"
      y="86"
      width="92"
      height="10"
      rx="4"
      fill="var(--color-warning)"
    />
  </svg>
);

// ============================================================
// ADD TO CART GRAPHIC — bright emerald basket + amber accents
// ============================================================
const CartGraphic = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
    <ellipse cx="100" cy="170" rx="55" ry="8" fill="rgba(0,0,0,0.18)" />
    <path
      d="M30,60 L50,63 L58,80"
      fill="none"
      stroke="var(--color-gray-700)"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M50,80 L150,80 L136,146 Q134,154 126,154 L74,154 Q66,154 64,146 Z"
      fill="var(--color-primary-light)"
      stroke="var(--color-primary-dark)"
      strokeWidth="2.5"
    />
    <path d="M50,80 L150,80 L146,98 L54,98 Z" fill="var(--color-warning)" />
    <line
      x1="77"
      y1="100"
      x2="70"
      y2="140"
      stroke="var(--color-primary-dark)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <line
      x1="100"
      y1="100"
      x2="98"
      y2="140"
      stroke="var(--color-primary-dark)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <line
      x1="123"
      y1="100"
      x2="130"
      y2="140"
      stroke="var(--color-primary-dark)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="80" cy="164" r="8" fill="var(--color-gray-800)" />
    <circle cx="80" cy="164" r="2.5" fill="var(--color-warning)" />
    <circle cx="120" cy="164" r="8" fill="var(--color-gray-800)" />
    <circle cx="120" cy="164" r="2.5" fill="var(--color-warning)" />
  </svg>
);

export default FlyToIconProvider;
