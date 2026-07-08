// ============================================================
// cn (classNames) - UTILITY FUNCTION
// ============================================================
// A helper function for conditionally combining Tailwind CSS classes,
// while automatically resolving conflicts between them.
// For example, if both "text-red-500" and "text-blue-500" end up in
// the same className string, twMerge ensures only the LAST one
// actually takes effect (just like how Tailwind/CSS specificity works),
// instead of both being applied and causing unpredictable styling.

import { clsx } from "clsx";
// clsx: a small utility that lets you conditionally include classNames,
// e.g. clsx("btn", isActive && "btn-active", isDisabled && "btn-disabled")
// It also handles arrays, objects, and falsy values gracefully —
// falsy values (false, null, undefined, "") are automatically skipped.

import { twMerge } from "tailwind-merge";
// twMerge: specifically designed for Tailwind CSS — it intelligently
// merges class strings and removes conflicting utility classes,
// keeping only the last one that should apply (mimics how Tailwind's
// own specificity/override behavior works).

const cn = (...classes) => {
  // The "..." (rest parameter) means this function can accept
  // any number of arguments — strings, conditionals, arrays, objects, etc.

  // Step 1: Pass all the given classes/conditions through clsx first.
  // clsx combines them into a single space-separated string,
  // automatically filtering out any falsy values along the way.
  // Example: clsx("p-4", false, "text-red-500") -> "p-4 text-red-500"

  // Step 2: Pass that combined string into twMerge, which scans for
  // conflicting Tailwind utility classes (e.g. multiple text colors,
  // multiple paddings) and keeps only the LAST one that should win,
  // removing the earlier conflicting ones entirely.
  return twMerge(clsx(...classes));
};

// Exporting this function so it can be used throughout the app
// wherever conditional/dynamic Tailwind classes are needed, e.g.:
// <div className={cn("p-4", isActive && "bg-blue-500", "text-red-500 text-blue-500")} />
// -> Result: only "text-blue-500" survives the conflict, the rest remain
export default cn;
