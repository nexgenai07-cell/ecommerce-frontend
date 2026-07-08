// Reusable Avatar component
// Shows profile picture if available, falls back to initials if not
// Will be used in admin sidebar, customer account views, and order detail pages
// Sizes: sm, md, lg, xl
// Fully responsive

import cn from "../../utils/cn";
// cn utility — merges Tailwind class strings and handles conditional classes cleanly

const Avatar = ({
  src = "", // Image URL string — when provided, renders a profile photo
  name = "", // Full user name — used to extract initials when no image is available
  size = "md", // Controls avatar dimensions — sm, md, lg, or xl
  className = "", // Extra Tailwind classes for one-off customizations from outside
}) => {
  // Extracts up to two initials from a full name string
  // e.g. "Rimsha Khan" → "RK", "Ali" → "A", "" → "?"
  const getInitials = (name) => {
    if (!name) return "?";
    // No name provided — renders a question mark as a safe anonymous fallback

    const words = name.trim().split(" ");
    // trim() removes any leading/trailing whitespace before splitting

    if (words.length === 1) return words[0][0].toUpperCase();
    // Single word name (e.g. "Ali") — use just the first letter, uppercased

    return (words[0][0] + words[1][0]).toUpperCase();
    // Two or more word name — combine first letters of the first two words, both uppercased
  };

  // Each size maps to a specific width, height, and font size
  const sizeClasses = {
    sm: "w-7 h-7 text-xs", // 28px — compact, fits inside table rows or tight lists
    md: "w-9 h-9 text-sm", // 36px — standard size for navbar and dropdown menus
    lg: "w-12 h-12 text-base", // 48px — used on profile pages and detail views
    xl: "w-16 h-16 text-xl", // 64px — prominent display on account dashboards
  };

  return (
    <div
      className={cn(
        // Base classes — applied to every avatar instance
        "relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden",
        // relative: allows future absolute-positioned elements (e.g. online indicator dot)
        // inline-flex + items-center + justify-center: centers the image or initials inside
        // rounded-full: perfect circle shape for all avatar sizes
        // shrink-0: prevents the avatar from compressing in flex containers
        // overflow-hidden: clips the image to the circle — essential for square source images

        sizeClasses[size],
        // Injects the correct width, height, and font size for the chosen size

        !src && "bg-primary-100 text-primary font-semibold",
        // Only applied when no image src is provided
        // bg-primary-100: light emerald background for the initials fallback
        // text-primary: brand-colored initials text that contrasts against the light background
        // font-semibold: slightly heavier initials for better legibility at small sizes

        className,
        // Merges any extra classes passed from the parent component
      )}
    >
      {src ? (
        // Image path provided — render the profile photo
        <img
          src={src}
          alt={name || "Avatar"}
          // alt uses the name for meaningful screen reader description
          // Falls back to "Avatar" if no name is provided
          className="w-full h-full object-cover"
          // w-full h-full: stretches image to fill the entire circular container
          // object-cover: crops and scales the image to fill without distortion
        />
      ) : (
        // No image provided — render the extracted initials as text fallback
        <span>{getInitials(name)}</span>
        // getInitials returns "RK", "A", or "?" depending on the name value
      )}
    </div>
  );
};

export default Avatar;
// Default export — imported anywhere as: import Avatar from "..."
