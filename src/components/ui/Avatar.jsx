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
        "relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden aspect-square",
        // relative: gives the image below a positioning context to anchor against
        // inline-flex + items-center + justify-center: centers the initials fallback inside
        // rounded-full: perfect circle shape for all avatar sizes
        // shrink-0: prevents the avatar from compressing in flex containers
        // overflow-hidden: clips the image to the circle — essential for non-square source images
        // aspect-square: keeps the frame a perfect 1:1 circle even if a parent
        // ever constrains only the width (or only the height)

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
        // Image path provided — render the profile photo.
        // The image is positioned absolutely and pinned to all four
        // edges of the circular frame (inset-0) rather than relying on
        // percentage width/height alone, so it always stretches to
        // completely fill the circle — edge to edge, no border of
        // empty space around a smaller-looking photo — no matter what
        // dimensions the original upload has.
        <img
          src={src}
          alt={name || "Avatar"}
          // alt uses the name for meaningful screen reader description
          // Falls back to "Avatar" if no name is provided
          className="absolute inset-0 w-full h-full object-cover object-center scale-[160%]"
          // absolute + inset-0: locks all four edges to the parent circle
          // w-full h-full: sizes the image to that same box as a backup
          // object-cover: crops and scales the image to fill without distortion
          // object-center: keeps the crop centered on the subject
          // scale-[160%]: MOST uploaded/product photos are already a square
          // canvas with the subject sitting in the middle and a border of
          // empty white/transparent space baked into the photo itself
          // (e.g. a product shot). Since that photo's canvas is already
          // 1:1 — the same ratio as this circular frame — object-cover has
          // NOTHING to crop (source ratio already matches the frame ratio),
          // so all of that built-in empty space stays visible and the
          // subject looks like a small image floating inside a big circle.
          // This border is proportional to the image, so it shows up the
          // same at every avatar size — it's just far more noticeable on
          // the larger 56px+/64px avatars than on a tiny 28px navbar one,
          // where a few stray pixels of white barely register.
          // Zooming the image itself in by 60% (scale-[160%]) pushes well
          // past that baked-in border, while overflow-hidden on the parent
          // clips anything that spills past the circle edge — so the
          // circle reads as genuinely full even for photos with a lot of
          // empty space around the subject, not just ones that already
          // happened to fill their own frame edge-to-edge.
          draggable={false}
          // Prevents the browser's native "drag this image out" behavior,
          // which otherwise makes a small profile photo feel accidentally draggable
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
