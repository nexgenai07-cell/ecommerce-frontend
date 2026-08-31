import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

// --- BASE SKELETON ---
// Single animated gray box — the building block for all skeleton variants below
const Skeleton = ({ className = "" }) => {
  return (
    <div
      className={cn(
        "bg-gray-200 animate-pulse rounded-md",
        // bg-gray-200: neutral gray that reads as a content placeholder
        // animate-pulse: Tailwind's built-in opacity fade loop — signals loading state
        // rounded-md: slightly rounded corners consistent with the design system
        className,
        // className controls the size and shape — width, height, and border-radius
        // are always passed from the parent variant or directly from outside
      )}
    />
  );
};

// --- SKELETON CARD ---
// Mimics the EXACT layout of the real ProductCard (src/components/shared/ProductCard.jsx)
// while its real data is being fetched — every block below maps 1:1 to a real element
// in that file so the page never "jumps" in size/shape once the real cards mount in.
// withFooter: pass true when this skeleton stands in for a ProductCard that
// is rendered with an extra footer line underneath (e.g. WishlistCard's
// "Added <date>" caption). Without this, the skeleton was one line SHORTER
// than the real card it was replacing, so every wishlist card would visibly
// grow by ~16px the moment real data arrived — exactly the kind of
// "sometimes bigger, sometimes smaller" placeholder mismatch this file
// exists to prevent.
const SkeletonCard = ({ withFooter = false }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Outer wrapper — same bg-white / rounded-xl / border / overflow-hidden as the
          real ProductCard's root <div>, so the card's outer shell is pixel-identical */}

      {/* Image area — real card uses a relative aspect-3/2 box (not a fixed height),
          so the skeleton must use the same aspect ratio or it'll be the wrong height
          on wider/narrower grid columns */}
      <div className="relative overflow-hidden bg-gray-50 aspect-3/2">
        {/* relative + overflow-hidden + bg-gray-50 + aspect-3/2: matches the real
            image container exactly, so absolutely-positioned placeholders below
            line up the same way the real badge/heart/pill do */}

        <Skeleton className="absolute inset-0 rounded-none" />
        {/* absolute inset-0: fills the entire aspect-3/2 box (real card's <img> does
            the same via w-full h-full object-cover) */}
        {/* rounded-none: the image itself has no rounding — the outer wrapper's
            overflow-hidden is what clips the corners, same as the real card */}

        {/* Top-right circle — placeholder for the wishlist heart button, which sits
            at "absolute top-2 right-2 w-8 h-8 rounded-full" on the real card */}
        <Skeleton className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80" />
        {/* bg-white/80: lighter than the default gray-200 so it reads as a button
            sitting ON TOP of the image skeleton, not as part of the image itself */}

        {/* Bottom-left pill — placeholder for the stock-status pill, which sits at
            "absolute bottom-2 left-2 ... rounded-full" on the real card */}
        <Skeleton className="absolute bottom-2 left-2 w-24 h-6 rounded-full bg-white/80" />
        {/* w-24 h-6: roughly the width/height of the real "In Stock" / "Only N Left"
            pill; bg-white/80 again reads as an overlay element, not the image */}
      </div>

      <div className="p-3.5 flex flex-col gap-1">
        {/* p-3.5 + flex-col + gap-1: matches the real card's info section EXACTLY —
            the old p-4/gap-3 version was noticeably taller/roomier than a real card */}

        {/* Category line placeholder — real card reserves "h-3.5" here even when
            empty, and renders a single uppercase line, never two lines */}
        <Skeleton className="w-16 h-3.5" />
        {/* w-16 (64px): mimics a short category label like "Skincare" or "Tops" */}

        {/* Product name placeholder — real card is a SINGLE truncated line
            (text-sm, "truncate"), never a 2-line wrap, so the skeleton must
            only show one bar or it implies more vertical space than real */}
        <Skeleton className="w-4/5 h-5" />
        {/* w-4/5 h-5: one line, slightly short of full width — mimics a typical
            truncated product title without looking like a perfectly full bar */}

        {/* Price row placeholder — real card's PriceDisplay renders sale price +
            (optionally) strikethrough original price on ONE row, no rating row
            exists anywhere on the real card, so it is intentionally omitted here */}
        <div className="flex items-center gap-2 mt-0.5">
          <Skeleton className="w-16 h-6" />
          {/* w-16 h-6: mimics the bold "md" size sale price (text-base font-semibold) */}
          <Skeleton className="w-12 h-4" />
          {/* w-12 h-4: mimics the smaller strikethrough original price (text-sm) */}
        </div>

        {/* Add to cart button placeholder — real Button uses size="sm", which
            renders "px-3 py-1.5 ... rounded-md", NOT the md/lg "rounded-lg" shape */}
        <Skeleton className="w-full h-8 rounded-md mt-1" />
        {/* h-8 (32px): matches the real sm Button's rendered height */}
        {/* rounded-md: matches the sm Button's actual border radius (not rounded-lg) */}

        {/* Optional footer line — only rendered when the caller tells us the
            real card will have one (see withFooter comment above) */}
        {withFooter && <Skeleton className="w-32 h-3 mx-auto mt-0.5" />}
      </div>
    </div>
  );
};

// --- SKELETON TABLE ---
// Mimics the layout of an admin data table while rows are being fetched
// rows and cols are configurable to match different table shapes
const SkeletonTable = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full">
      {/* w-full: table skeleton stretches to fill its container */}

      {/* Table header row placeholder — one bar per column */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        {/* border-b border-gray-100: matches the real table header bottom border */}
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-4" />
          // flex-1: each header bar takes equal width regardless of column count
          // h-4: matches typical table header text height
        ))}
      </div>

      {/* Table data rows placeholder — one row per requested row count */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 p-4 border-b border-gray-50"
          // border-b border-gray-50: very subtle row divider — lighter than header border
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "flex-1 h-4",
                // Default: equal-width bar matching a data cell text line

                colIndex === 0 && "w-8 h-8 rounded-full flex-none",
                // First column override: circular avatar placeholder
                // w-8 h-8 (32px): standard avatar size in table rows
                // rounded-full: perfect circle to mimic an Avatar component
                // flex-none: prevents the avatar from stretching like the other cells
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// --- SKELETON DASHBOARD ---
// Mimics the full admin dashboard layout — stats cards, chart, and table
const SkeletonDashboard = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* flex-col + gap-6: stacks each dashboard section with generous spacing */}

      {/* Stats cards row — 2 columns on mobile, 4 on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3"
          >
            {/* Each card matches the shape of a real stats card component */}
            <div className="flex items-center justify-between">
              <Skeleton className="w-24 h-4" />
              {/* w-24: mimics a short stat label like "Total Orders" */}
              <Skeleton className="w-8 h-8 rounded-lg" />
              {/* w-8 h-8 rounded-lg: mimics the icon box in the top-right of each stat card */}
            </div>
            <Skeleton className="w-32 h-7" />
            {/* w-32 h-7: larger block mimics the big number value like "₨ 48,200" */}
            <Skeleton className="w-20 h-4" />
            {/* w-20: mimics the percentage change label below the value */}
          </div>
        ))}
      </div>

      {/* Chart section placeholder — title bar above a large chart area */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
        <Skeleton className="w-32 h-5" />
        {/* w-32: mimics a chart section heading like "Revenue Overview" */}
        <Skeleton className="w-full h-48 rounded-lg" />
        {/* w-full h-48: large block occupying the space where a chart would render */}
      </div>

      {/* Recent orders table placeholder — header above a SkeletonTable */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <Skeleton className="w-32 h-5" />
          {/* w-32: mimics a table section heading like "Recent Orders" */}
        </div>
        <SkeletonTable rows={4} cols={5} />
        {/* Reuses SkeletonTable with 4 rows and 5 columns — matches a typical orders table */}
      </div>
    </div>
  );
};

// --- SKELETON DETAIL ---
// Mimics a detail page layout — order detail or product detail — with a sidebar
const SkeletonDetail = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* flex-col + gap-6: stacks header and content grid with generous spacing */}

      {/* Page header placeholder — back button icon + page title */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded-lg" />
        {/* w-8 h-8 rounded-lg: mimics a back arrow icon button */}
        <Skeleton className="w-48 h-6" />
        {/* w-48: mimics a page heading like "Order #1042" */}
      </div>

      {/* Main content grid — 2/3 main + 1/3 sidebar on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area — takes 2 of 3 columns on large screens */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="w-24 h-4" />
                {/* Left: mimics a field label like "Order Status" or "Customer" */}
                <Skeleton className="w-32 h-4" />
                {/* Right: mimics the field value — slightly wider than the label */}
              </div>
            ))}
            {/* 4 label-value rows mimic a typical order or product detail info block */}
          </div>
        </div>

        {/* Sidebar — takes 1 of 3 columns on large screens */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-4" />
              // 3 full-width bars mimic a summary or action card in the sidebar
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SKELETON STEPPER ---
// Mimics the horizontal step progress bar used on both the Order Detail
// page (OrderStepper.jsx) and the Order Tracking page (TrackingStepper.jsx):
// a white card containing 5 equally-spaced circles connected by thin lines.
// Shared by SkeletonOrderDetail and SkeletonOrderTracking below so both
// pages' skeletons stay visually identical to each other, just like the
// real stepper components are.
//
// STEP_LABEL_WIDTHS approximates the rendered text-xs width of each real
// step label ("Placed", "Confirmed", "Shipped", "Out for Delivery",
// "Delivered"). "Out for Delivery" is a whitespace-nowrap 16-character
// label — by far the widest of the five — so giving every step the same
// narrow bar (the old behavior) understated exactly the one column that
// forces the real stepper into horizontal scroll, causing a visible
// layout shift the moment real data replaced the skeleton.
const STEP_LABEL_WIDTHS = ["w-14", "w-16", "w-14", "w-24", "w-16"];

const SkeletonStepper = () => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-start overflow-x-auto scrollbar-hide pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 min-w-0">
            {/* Circle + label pair, same shrink-0 treatment as the real steps
                so they never get squeezed by the connector lines.
                w-10 h-10: matches the real step circle exactly (the old
                w-9 h-9 was 4px smaller on every side than the real
                "w-10 h-10" circle) */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className={cn("h-3", STEP_LABEL_WIDTHS[i])} />
            </div>
            {/* Connector line — omitted after the last circle, exactly like
                the real stepper's isLast check. mb-5 matches the real
                connector's own "mb-5", which nudges the line up to align
                with the vertical center of the circle above it instead of
                the center of the whole circle+label column; without it the
                line sat a few pixels lower than the real one. */}
            {i < 4 && (
              <Skeleton className="flex-1 h-0.5 mx-2 mb-5 rounded-none min-w-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SKELETON PRODUCT DETAIL ---
// Mimics the EXACT layout of the real Product Detail page (see
// src/pages/customer/ProductDetail.jsx and its child components) instead of
// the generic SkeletonDetail, which had no image at all and used a
// "back button + title" header this page never has. That mismatch was the
// single biggest source of the "skeleton looks nothing like the real page"
// complaint, since this is one of the most-visited pages in the app.
const SkeletonProductDetail = () => {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {/* Breadcrumb pill — real ProductBreadcrumb is a rounded-full chip,
          not a plain text row */}
      <Skeleton className="w-64 h-9 rounded-full" />

      {/* Image gallery (left) + product info (right) — same
          grid-cols-1 lg:grid-cols-2 split as the real page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        {/* ── Gallery card — matches ProductImageGallery.jsx ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex flex-col gap-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          {/* Thumbnail row — real gallery shows up to a handful of
              w-16/w-20 square thumbnails; 4 is a representative count */}
          <div className="flex items-center gap-2.5 justify-center sm:justify-start">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0"
              />
            ))}
          </div>
        </div>

        {/* ── Info column — matches ProductInfo.jsx's two stacked cards ── */}
        <div className="flex flex-col gap-5">
          {/* Title card: category pill, title, price + stock badge, SKU line */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 flex flex-col gap-4">
            <Skeleton className="w-24 h-5 rounded-full" />
            <Skeleton className="w-4/5 h-8" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-24 h-7" />
              <Skeleton className="w-24 h-7 rounded-full" />
            </div>
            <Skeleton className="w-32 h-3.5" />
          </div>

          {/* Buy box card: quantity row, divider, Add to Cart + Wishlist buttons */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <Skeleton className="w-20 h-4" />
              {/* w-30 h-9: matches QuantitySelector's real "md" size —
                  two w-9 h-9 buttons plus a w-12 h-9 input add up to a
                  120px-wide, 36px-tall control, not the narrower w-28 this
                  used to be */}
              <Skeleton className="w-30 h-9 rounded-lg" />
            </div>
            <Skeleton className="w-full h-px rounded-none" />
            {/* h-12.5: matches the real "py-3.5 text-sm" Add to Cart button,
                same convention used for every other py-3.5 button skeleton
                in this app (e.g. Checkout's Place Order button) */}
            <Skeleton className="w-full h-12.5 rounded-xl" />
            {/* h-10.5: matches the real "py-2.5 text-sm" Wishlist button,
                same convention used for every other py-2.5 input/button
                skeleton in this app */}
            <Skeleton className="w-full h-10.5 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ── Tabs card — matches ProductTabs.jsx ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-6 border-b border-gray-100 pb-3">
          <Skeleton className="w-24 h-5" />
          <Skeleton className="w-28 h-5" />
        </div>
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
      </div>

      {/* ── "You May Also Like" heading + grid — matches RelatedProducts.jsx,
          which itself renders skeletonCount={4} SkeletonCards, so this
          reuses that exact same card for a perfect match */}
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="w-48 h-7" />
            <Skeleton className="w-56 h-4" />
          </div>
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- SKELETON ORDER DETAIL ---
// Mimics the real Order Detail page layout (src/pages/customer/OrderDetail.jsx)
// element-for-element against its actual child components (OrderItems.jsx,
// PaymentInfo.jsx, DeliveryAddress.jsx, NeedHelp.jsx): breadcrumb, icon-box
// header + status badge, the 5-step stepper, then a 2/3 + 1/3 grid.
//
// Rebuilt from a version that had three real mismatches, all of which made
// the page visibly taller/reshaped the instant real order data replaced it:
//   1. OrderItems.jsx renders its Subtotal/Shipping/Total price breakdown
//      INSIDE the same white card as the item rows — the old skeleton
//      closed that card right after the item rows and never represented
//      the breakdown at all, so ~150px of real content appeared from
//      nowhere.
//   2. The item row skeleton used a p-4 wrapper and a w-16 h-16 image; the
//      real row is px-5 py-4 with a w-14 h-14 image, and also shows a
//      second "X each" unit-price line under the total price that the
//      skeleton omitted entirely.
//   3. PaymentInfo.jsx is a header + Stripe-badge/name/txn row + status
//      pill, not three generic stacked bars — the old skeleton didn't
//      reflect its actual header/body split or the badge/pill shapes.
const SkeletonOrderDetail = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb — real nav is "My Orders" (link) + "›" + "Order <id>" */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-20 h-3.5" />
        <Skeleton className="w-2 h-3.5" />
        <Skeleton className="w-28 h-3.5" />
      </div>

      {/* Page header — icon box + title on the left, status badge on the
          right. Real h1 is "text-2xl sm:text-3xl", so the title bar needs
          the same "h-7 sm:h-8" scale-up used elsewhere in the app (e.g.
          Cart.jsx) or it reads visibly shorter than the real heading on
          desktop screens specifically. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
          <Skeleton className="w-40 h-7 sm:h-8" />
        </div>
        <Skeleton className="w-28 h-6 rounded-full" />
      </div>

      <SkeletonStepper />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Order Items (with its inline price breakdown
            footer) + Payment Info */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Order Items card */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <Skeleton className="w-28 h-5" />
              <Skeleton className="w-16 h-4" />
            </div>
            <div className="flex flex-col divide-y divide-gray-50">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  {/* w-14 h-14 rounded-xl: matches the real thumbnail exactly
                      (was w-16 h-16 rounded-lg) */}
                  <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-16 h-3" />
                    {/* w-16 h-3: matches the real "Qty: N" text-xs line */}
                  </div>
                  {/* Right price block — TWO lines (total price + "X each"
                      unit price), matching the real card exactly. The old
                      skeleton only had one bar here. */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-14 h-3" />
                  </div>
                </div>
              ))}
            </div>
            {/* Price breakdown footer — Subtotal, Shipping, a divider, then
                Total. This entire section was previously missing. */}
            <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-2.5">
              <div className="flex justify-between">
                <Skeleton className="w-16 h-3.5" />
                <Skeleton className="w-14 h-3.5" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="w-14 h-3.5" />
                <Skeleton className="w-12 h-3.5" />
              </div>
              <Skeleton className="w-full h-px rounded-none my-1" />
              <div className="flex justify-between items-center">
                <Skeleton className="w-12 h-5" />
                <Skeleton className="w-20 h-6" />
              </div>
            </div>
          </div>

          {/* Payment Info card — header, then a Stripe-badge box + name/txn
              stack on the left and a status pill on the right, matching
              PaymentInfo.jsx's actual header/body split instead of three
              generic stacked bars */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <Skeleton className="w-40 h-5" />
            </div>
            <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="w-44 h-4" />
                  <Skeleton className="w-32 h-3" />
                </div>
              </div>
              <Skeleton className="w-28 h-7 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right column — Delivery Address, then Need Help */}
        <div className="flex flex-col gap-5">
          {/* Delivery Address — icon + title header, then name/address/phone
              lines (real card also has a phone row, which the old skeleton
              never accounted for) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded shrink-0" />
              <Skeleton className="w-36 h-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-2/3 h-4" />
              <Skeleton className="w-32 h-4 mt-1" />
            </div>
          </div>

          {/* Need Help — heading + stacked full-width action buttons. Real
              buttons range from 2 to 4 depending on order status; the last
              one ("Chat with AI") is always taller than the rest since it
              renders a two-line title + description, not a single line. */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
            <Skeleton className="w-28 h-5" />
            <Skeleton className="w-full h-12 rounded-xl" />
            <Skeleton className="w-full h-12 rounded-xl" />
            <Skeleton className="w-full h-15 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SKELETON ORDER TRACKING ---
// Mimics the real Order Tracking page layout
// (src/pages/customer/OrderTracking.jsx) against its actual child
// components (TrackingTimeline.jsx, TrackingHelp.jsx,
// TrackingOrderSummary.jsx, TrackingDeliveryAddress.jsx).
//
// Rebuilt from a version with several real mismatches:
//   1. The main grid was "lg:grid-cols-3" with a 2/3+1/3 split, copied from
//      the Order Detail page. This page's real grid is an EVEN
//      "lg:grid-cols-2" split — every column visibly resized on desktop
//      the instant real data replaced the skeleton.
//   2. The breadcrumb (real: "Home › My Orders › Order <id>", 3 segments)
//      and the header's "Order <id>" subtitle were both missing entirely.
//   3. TrackingOrderSummary.jsx — by far the largest card on the page
//      (header, 3 meta rows, a divider, item rows, another divider, and a
//      3-row price breakdown) — had no real representation at all, just
//      two generic bars, so it was the single biggest source of the page
//      growing taller once real order data arrived.
//   4. TrackingHelp.jsx puts its two buttons SIDE BY SIDE in a row (unlike
//      the Order Detail page's stacked full-width NeedHelp buttons) and
//      always shows a 2-line description paragraph above them — neither
//      of which the old skeleton reflected.
const SkeletonOrderTracking = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb — real nav has 3 segments: Home › My Orders › Order <id> */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-12 h-3.5" />
        <Skeleton className="w-2 h-3.5" />
        <Skeleton className="w-20 h-3.5" />
        <Skeleton className="w-2 h-3.5" />
        <Skeleton className="w-24 h-3.5" />
      </div>

      {/* Page header — icon box + title/subtitle stack. Real h1 is
          "text-2xl sm:text-3xl" (needs the same "h-7 sm:h-8" scale-up used
          elsewhere), and it has an "Order <id>" subtitle underneath that
          the old skeleton never rendered at all. */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="w-48 h-7 sm:h-8" />
          <Skeleton className="w-28 h-3.5" />
        </div>
      </div>

      <SkeletonStepper />

      {/* Real page: an even "lg:grid-cols-2" split, not 2/3+1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column — Tracking Updates timeline + Need Help */}
        <div className="flex flex-col gap-5">
          {/* Tracking Updates — heading, then dot+line timeline rows with a
              title, a description line, and a timestamp on the right,
              matching TrackingTimeline.jsx's real row shape */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <Skeleton className="w-36 h-5 mb-5" />
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <Skeleton className="w-3 h-3 rounded-full mt-1 shrink-0" />
                    {/* Connecting line — omitted after the last dot, same
                        as the real timeline's isLast check */}
                    {i < 3 && (
                      <Skeleton className="w-px flex-1 my-1 min-h-8 rounded-none" />
                    )}
                  </div>
                  <div className="flex-1 pb-5 min-w-0 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <Skeleton className="w-1/2 h-4" />
                      <Skeleton className="w-2/3 h-3" />
                    </div>
                    <Skeleton className="w-16 h-3 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Need Help — heading + 2-line description, then a ROW of two
              equal-width buttons (real layout, unlike the Order Detail
              page's stacked full-width buttons) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-28 h-5" />
              <Skeleton className="w-full h-3.5" />
              <Skeleton className="w-3/4 h-3.5" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Skeleton className="flex-1 min-w-30 h-11 rounded-xl" />
              <Skeleton className="flex-1 min-w-30 h-11 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right column — Order Summary + Delivery Address */}
        <div className="flex flex-col gap-5">
          {/* Order Summary — header, 3 meta rows (Order ID / Date /
              Payment), a divider, 1-2 item rows, another divider, and a
              3-row price breakdown. This is the largest card on the page
              and previously had no real shape at all. */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <Skeleton className="w-32 h-5" />
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="w-16 h-3.5" />
                    <Skeleton className="w-24 h-3.5" />
                  </div>
                ))}
              </div>
              <Skeleton className="w-full h-px rounded-none" />
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-20 h-3" />
                  <Skeleton className="w-16 h-4" />
                </div>
              </div>
              <Skeleton className="w-full h-px rounded-none" />
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <Skeleton className="w-16 h-3.5" />
                  <Skeleton className="w-14 h-3.5" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="w-14 h-3.5" />
                  <Skeleton className="w-12 h-3.5" />
                </div>
                <div className="flex justify-between mt-1">
                  <Skeleton className="w-10 h-4" />
                  <Skeleton className="w-16 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address — header, then icon + name/address/phone block */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <Skeleton className="w-40 h-5" />
            </div>
            <div className="p-5 flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <Skeleton className="w-28 h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-2/3 h-4" />
                <Skeleton className="w-32 h-4 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SKELETON ACCOUNT DASHBOARD ---
// Mimics the real "My Account" dashboard (src/pages/customer/AccountDashboard.jsx)
// instead of the generic SkeletonDashboard above, which invented a "chart"
// section that doesn't exist anywhere on this page and was missing the
// breadcrumb, page header, and the Wishlist Preview / Recent Notifications
// two-column section entirely.
const SkeletonAccountDashboard = () => {
  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <Skeleton className="w-28 h-4" />

      {/* Page header — icon box + title/subtitle stack, same as every
          other account page's header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="w-56 h-7" />
          <Skeleton className="w-72 h-3.5" />
        </div>
      </div>

      {/* Stats cards — matches the real StatCard in DashboardStats.jsx exactly:
          a single row (flex items-center justify-between), label stacked above
          value on the LEFT, and a w-12 h-12 icon box on the RIGHT. The previous
          version used flex-col with the icon on top and a w-8 h-8 icon box —
          both the direction and the icon size were wrong, so the skeleton
          didn't resemble the real card at all and caused a visible layout
          change the moment real data replaced it. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between"
            // p-5 + flex items-center justify-between: identical container
            // styling to the real StatCard, so the card's outer shell never
            // resizes once real content mounts in
          >
            {/* Left side — label above value, mirrors StatCard's
                "flex flex-col gap-1" left-side stack */}
            <div className="flex flex-col gap-2">
              <Skeleton className="w-20 h-3" />
              {/* w-20 h-3: mimics the small uppercase label, e.g. "TOTAL ORDERS" */}
              <Skeleton className="w-16 h-7" />
              {/* w-16 h-7: mimics the large bold value, e.g. "8" or "Rs 862,890" */}
            </div>

            {/* Right side — icon box, w-12 h-12 to match the real StatCard's
                icon container exactly (previously w-8 h-8, noticeably smaller
                than the real icon box that replaces it) */}
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          </div>
        ))}
      </div>

      {/* Recent Orders table — header row + 3 rows (dashboard only ever
          shows the 3 most recent orders, per recentOrders.slice(0, 3)) */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <Skeleton className="w-36 h-5" />
          <Skeleton className="w-16 h-4" />
        </div>
        <SkeletonTable rows={3} cols={4} />
      </div>

      {/* Wishlist Preview + Recent Notifications — side by side on desktop,
          exactly like the real 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4"
          >
            <Skeleton className="w-40 h-5" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="w-3/4 h-3.5" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Active Complaints & Returns table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <Skeleton className="w-48 h-5" />
        </div>
        <SkeletonTable rows={3} cols={4} />
      </div>
    </div>
  );
};

// --- SKELETON DETAIL THREAD ---
// Mimics the "conversation thread" layout shared by the real Complaint
// Detail page (src/pages/customer/ComplaintDetail.jsx) and Return Detail
// page (src/pages/customer/ReturnDetail.jsx). Both pages were previously
// using the generic SkeletonDetail above — which renders a completely
// different layout (a back-arrow header plus a 2/3 + 1/3 sidebar grid,
// with 4 label/value rows). Neither of those elements exists anywhere on
// these two pages, so the skeleton looked nothing like the page it was
// standing in for, and the real content mounted in at a different height
// entirely. This skeleton instead mirrors the actual layout: a back link,
// an icon-badge header with a status pill, and two stacked message cards
// (the original submission, then either a response or a "waiting" card) —
// exactly what both real pages render.
const SkeletonDetailThread = () => {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Back link — icon + short text, matches "Back to Complaints" /
          "Back to Returns" */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="w-28 h-3.5" />
      </div>

      {/* Header — icon badge + title/subtitle stack on the left,
          status pill(s) on the right. Stacks vertically on mobile,
          matching the real "flex-col sm:flex-row" header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-48 h-6" />
            {/* w-48 h-6: mimics "Complaint #CP-102" / "Return #RET-16" */}
            <Skeleton className="w-40 h-3.5" />
            {/* w-40 h-3.5: mimics "Filed on <date> · Order #<number>" */}
          </div>
        </div>
        <Skeleton className="w-24 h-6 rounded-full" />
        {/* w-24 h-6: mimics the status pill (OPEN / RESOLVED / Pending Review, etc.) */}
      </div>

      {/* Conversation thread — two stacked cards, each with a circular
          avatar badge on the left and text content on the right, exactly
          matching the real customer-message-card / response-card pair */}
      <div className="flex flex-col gap-4">
        {/* Card 1 — the original complaint / return reason */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 flex items-start gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-3">
            <Skeleton className="w-24 h-3" />
            {/* w-24 h-3: mimics the small uppercase type label */}
            <Skeleton className="w-3/4 h-5" />
            {/* w-3/4 h-5: mimics the subject heading */}
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-2/3 h-4" />
            {/* 3 lines: mimics the wrapped complaint/reason body text */}
          </div>
        </div>

        {/* Card 2 — the admin response, or a "waiting for review" card.
            Real page renders whichever ONE of these two states applies, so
            a single card here (matching either state's height reasonably
            closely) is the correct placeholder shape either way */}
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-5 sm:p-6 flex items-start gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="w-32 h-3" />
            {/* w-32 h-3: mimics "Response from <name>" / "Awaiting review" */}
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-1/2 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SKELETON PROFILE SETTINGS ---
// Mimics the real Profile Settings page (src/pages/customer/ProfileSettings.jsx)
// instead of the generic SkeletonDetail, which had no hero header, no avatar,
// and a completely unrelated 2-column label/value layout that appears
// nowhere on this page. This skeleton matches the actual page structure:
// a gradient hero card with an avatar, the Personal Information card, a
// 2-column Change Password / Account Security row, and the Danger Zone card.
const SkeletonProfileSettings = () => {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Hero header — gradient card with avatar + name/email stack,
          matches the real page's "px-6 py-8 sm:px-10 sm:py-10" hero */}
      <div className="rounded-3xl bg-gray-100 px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row sm:items-center gap-5">
        <Skeleton className="w-16 h-16 rounded-full bg-gray-200/70 shrink-0 mx-auto sm:mx-0" />
        {/* w-16 h-16: matches Avatar size="xl" used on the real hero */}
        <div className="flex flex-col items-center sm:items-start gap-2">
          <Skeleton className="w-44 h-7 bg-gray-200/70" />
          <Skeleton className="w-56 h-3.5 bg-gray-200/70" />
          <Skeleton className="w-32 h-3 bg-gray-200/70 mt-1" />
        </div>
      </div>

      {/* Personal Information card — header row + avatar/name/email form grid + save button row */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-44 h-5" />
            <Skeleton className="w-56 h-3" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Skeleton className="w-16 h-16 rounded-full shrink-0 mx-auto sm:mx-0" />
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-full h-11.5 rounded-xl" />
              {/* h-11.5 (~46px): matches the real text input's py-3 height */}
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-full h-11.5 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t border-gray-50">
          <Skeleton className="w-36 h-11.5 rounded-xl" />
          {/* w-36 h-11.5: matches the "Save Changes" button */}
        </div>
      </div>

      {/* Change Password + Account Security — side by side on desktop,
          matching the real "grid grid-cols-1 lg:grid-cols-2" row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Change Password card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="w-36 h-5" />
              <Skeleton className="w-48 h-3" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="w-32 h-3" />
                <Skeleton className="w-full h-11.5 rounded-xl" />
                {/* 3 password fields: Current / New / Confirm New Password */}
              </div>
            ))}
            <Skeleton className="w-full h-11.5 rounded-xl mt-2" />
            {/* w-full h-11.5: matches the full-width "Change Password" submit button */}
          </div>
        </div>

        {/* Account Security card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="w-40 h-5" />
              <Skeleton className="w-52 h-3" />
            </div>
          </div>
          {/* 2FA toggle row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="w-32 h-3.5" />
                <Skeleton className="w-44 h-3" />
              </div>
            </div>
            <Skeleton className="w-11 h-6 rounded-full" />
            {/* w-11 h-6: matches the Toggle switch component */}
          </div>
          {/* Active Sessions block */}
          <div className="flex flex-col gap-3">
            <Skeleton className="w-28 h-3" />
            <Skeleton className="w-full h-14 rounded-xl" />
            <Skeleton className="w-full h-14 rounded-xl" />
            <Skeleton className="w-32 h-3.5" />
            {/* mimics the "Sign out all devices" text link */}
          </div>
        </div>
      </div>

      {/* Danger Zone card */}
      <div className="bg-white rounded-3xl border border-danger/20 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-32 h-5" />
            <Skeleton className="w-72 h-3.5" />
            <Skeleton className="w-56 h-3.5" />
          </div>
        </div>
        <Skeleton className="w-full sm:w-40 h-11.5 rounded-xl shrink-0" />
        {/* matches the "Delete Account" button */}
      </div>
    </div>
  );
};

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonDashboard,
  SkeletonDetail,
  SkeletonDetailThread,
  SkeletonProfileSettings,
  SkeletonStepper,
  SkeletonProductDetail,
  SkeletonOrderDetail,
  SkeletonOrderTracking,
  SkeletonAccountDashboard,
};
// Named exports — each variant imported individually where needed
// e.g. import { SkeletonCard } from "..." or import { SkeletonTable } from "..."

export default Skeleton;
// Default export — base Skeleton imported anywhere as: import Skeleton from "..."
