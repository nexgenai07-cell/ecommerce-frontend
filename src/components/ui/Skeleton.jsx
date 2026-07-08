// Reusable Skeleton component — shows animated placeholder boxes while real data is loading
// Gray pulsing boxes visually occupy the space where content will appear
// Variants: SkeletonCard, SkeletonTable, SkeletonDashboard, SkeletonDetail
// Fully responsive

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
// Mimics the layout of a product card while its real data is being fetched
const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Matches the exact shape of a real product card — white bg, rounded corners, clipped content */}

      {/* Product image area — wide rectangular block at the top of the card */}
      <Skeleton className="w-full h-48 rounded-none" />
      {/* w-full: stretches across the full card width */}
      {/* h-48: 192px matches a standard product image height */}
      {/* rounded-none: overrides base rounded-md — image fills edge to edge with no rounding */}

      <div className="p-4 flex flex-col gap-3">
        {/* p-4: matches the padding of a real product card body */}
        {/* flex-col + gap-3: stacks placeholder rows with consistent spacing */}

        {/* Category tag placeholder — short narrow bar */}
        <Skeleton className="w-16 h-4" />
        {/* w-16 (64px): mimics a short category label like "Tops" or "Sale" */}

        {/* Product name placeholder — two lines to simulate a multi-line title */}
        <Skeleton className="w-full h-5" />
        <Skeleton className="w-3/4 h-5" />
        {/* Full width first line + shorter second line mimics natural text wrapping */}

        {/* Star rating placeholder — medium-width bar */}
        <Skeleton className="w-24 h-4" />
        {/* w-24 (96px): mimics 5 star icons and a review count */}

        {/* Price row placeholder — price and original price side by side */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-6" />
          {/* w-20 (80px) h-6: larger block for the current price */}
          <Skeleton className="w-14 h-4" />
          {/* w-14 (56px) h-4: smaller block for the strikethrough original price */}
        </div>

        {/* Add to cart button placeholder — full width rounded bar */}
        <Skeleton className="w-full h-9 rounded-lg" />
        {/* h-9 (36px): matches the height of a standard md size Button */}
        {/* rounded-lg: matches the Button component's rounded-lg border radius */}
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

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonDashboard,
  SkeletonDetail,
};
// Named exports — each variant imported individually where needed
// e.g. import { SkeletonCard } from "..." or import { SkeletonTable } from "..."

export default Skeleton;
// Default export — base Skeleton imported anywhere as: import Skeleton from "..."
