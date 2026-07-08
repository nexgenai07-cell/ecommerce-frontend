// Consistent width wrapper used across the whole project
// Every page's content will live inside this Container
// Maximum width is 1280px — whether the screen is large or small, content stays centered
// Side padding is responsive — smaller on mobile, larger on desktop

// Import a helper function that merges/conditionally joins CSS class names
import cn from "../../utils/cn";

// Define the Container functional component and destructure its props with a default value for className
const Container = ({ children, className = "" }) => {
  // Return the JSX that will be rendered on the screen
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8", // Full width, horizontally centered, with responsive side padding (smaller on mobile, larger on bigger screens)
        "max-w-7xl", // Caps the maximum width at 1280px so content doesn't stretch too wide on large screens
        className, // Any extra classes passed in from the parent component
      )}
    >
      {children}{" "}
      {/* Render whatever content is passed in between the Container's opening and closing tags */}
    </div>
  );
};

// Export the component so it can be imported and used in other files
export default Container;
