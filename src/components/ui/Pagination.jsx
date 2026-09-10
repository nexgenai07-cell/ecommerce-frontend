import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai"; // Prev/Next chevron icons
import { motion } from "framer-motion"; // Sliding active-pill aur tap/hover micro-interactions ke liye
import cn from "../../utils/cn"; // Conditional Tailwind class merge helper

const Pagination = ({
  currentPage = 1, // Currently active page number (1-indexed)
  totalPages = 1, // Total number of pages available
  onPageChange, // Parent-provided callback fired with the new page number
  className = "", // Optional extra classes so callers can adjust spacing/margins
}) => {
  // Agar sirf 1 (ya 0) page hai to pagination dikhane ka koi fayda nahi — pura component hide kar do
  if (totalPages <= 1) return null;

  // Page numbers hamesha totalPages ke hisaab se generate hote hain —
  // jitne products utni hi pages, jitni pages utne hi number buttons
  const getPageNumbers = () => {
    const pages = []; // Final array of numbers and "..." placeholders to render
    if (totalPages <= 7) {
      // Chhoti list ho to sab page numbers ek sath dikha do, "..." ki zaroorat nahi
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      // Shuru ke pages par ho to pehle 5 numbers + end tak jump
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Aakhri pages par ho to start se jump + last 5 numbers
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      // Beech mein ho to current page ke aas-paas ek window dikhao, dono taraf "..."
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }
    return pages; // Caller isay map kar ke buttons render karta hai
  };

  const pageNumbers = getPageNumbers(); // Ek hi baar compute kar ke render mein reuse karte hain

  return (
    // Poore control ka ek hi entrance animation — fade + halka upward slide.
    // Yehi "single orchestrated moment" hai; individual buttons par alag
    // se entrance animation nahi di, taake motion cluttered na lage
    <motion.div
      initial={{ opacity: 0, y: 8 }} // Mount hote hi thoda neeche aur invisible
      animate={{ opacity: 1, y: 0 }} // Apni asal jagah par fade-in ho jata hai
      transition={{ duration: 0.3, ease: "easeOut" }} // Halki si smooth entrance, na zyada dheemi na jhatke wali
      className={cn(
        // Chhoti screens par tighter padding/gap, sm+ par asal breathing room
        "flex items-center justify-center gap-1 sm:gap-1.5 shadow-lg bg-white rounded-2xl border border-gray-100 px-2.5 py-2.5 sm:px-4 sm:py-4",
        className, // Caller ki di hui extra classes (margin wagera) sab se aakhir mein taake override ho sakein
      )}
    >
      {/* Prev button */}
      <motion.button
        onClick={() => onPageChange(currentPage - 1)} // Ek page peechay le jata hai
        disabled={currentPage === 1} // Pehle page par Prev disable
        whileHover={currentPage !== 1 ? { scale: 1.04 } : undefined} // Sirf tab hover-scale jab button actually clickable ho
        whileTap={currentPage !== 1 ? { scale: 0.94 } : undefined} // Click/tap par halka "press" feedback
        transition={{ type: "spring", stiffness: 400, damping: 25 }} // Tactile, bouncy nahi — quick spring settle
        className={cn(
          // Mobile par chhota height/padding/text, sm+ par asal size
          "flex items-center gap-1 h-8 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors",
          currentPage === 1
            ? "text-gray-300 cursor-not-allowed" // Disabled state — halka aur click-unfriendly cursor
            : "text-gray-600 hover:bg-primary-50 hover:text-primary", // Active state — brand color par hover
        )}
      >
        <AiOutlineLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
        {/* Chevron icon, mobile par thoda chhota */}
        <span className="hidden sm:inline">Prev</span>{" "}
        {/* Label sirf sm+ par, mobile par sirf icon */}
      </motion.button>

      {/* Page numbers — horizontally scrollable taake bohot saari pages
          chhoti screen par wrap ho kar do lines mein na tootein */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
        {pageNumbers.map((page, index) =>
          page === "..." ? (
            // Ellipsis — sirf visual gap, clickable nahi
            <span
              key={`dots-${index}`} // Index-based key kyunke "..." string khud unique nahi hoti
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 text-xs sm:text-sm shrink-0"
            >
              ⋯
            </span>
          ) : (
            // Har number button "relative" hai taake uske andar active-pill
            // ko absolute position kiya ja sake (pill button ke peeche/upar)
            <motion.button
              key={page} // Page number khud unique hai, safe key
              onClick={() => onPageChange(page)} // Us specific page par jump karta hai
              whileHover={currentPage !== page ? { scale: 1.06 } : undefined} // Non-active buttons par hi hover-grow
              whileTap={{ scale: 0.92 }} // Har button par tap feedback, active ho ya na ho
              transition={{ type: "spring", stiffness: 400, damping: 25 }} // Prev/Next jaisa hi consistent spring feel
              className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold shrink-0"
            >
              {/* Active page ka gradient background — shared layoutId ki wajah
                  se framer-motion isay purani active button ki position se
                  is nayi position tak khud smoothly animate kar deta hai */}
              {currentPage === page && (
                <motion.span
                  layoutId="paginationActivePill" // Sab number buttons is ek layoutId ko share karte hain — yehi sliding effect ka raaz hai
                  className="absolute inset-0 rounded-xl bg-linear-to-br from-primary to-primary-dark shadow-md shadow-primary/25" // Gradient pill, project ke brand tokens se — koi hardcoded hex nahi
                  transition={{ type: "spring", stiffness: 380, damping: 30 }} // Smooth slide, na zyada slow na jhatkedar
                />
              )}

              {/* Number ka text — pill ke upar rehne ke liye z-10, active ho to white, warna gray */}
              <span
                className={cn(
                  "relative z-10 transition-colors", // Pill background ke upar dikhne ke liye relative + z-10
                  currentPage === page
                    ? "text-white" // Active page — gradient pill ke upar white text
                    : "text-gray-600 hover:text-primary", // Inactive — neutral, hover par brand color
                )}
              >
                {page}
              </span>
            </motion.button>
          ),
        )}
      </div>

      {/* Next button */}
      <motion.button
        onClick={() => onPageChange(currentPage + 1)} // Ek page aagay le jata hai
        disabled={currentPage === totalPages} // Aakhri page par Next disable
        whileHover={currentPage !== totalPages ? { scale: 1.04 } : undefined} // Sirf clickable state mein hover-scale
        whileTap={currentPage !== totalPages ? { scale: 0.94 } : undefined} // Tap feedback
        transition={{ type: "spring", stiffness: 400, damping: 25 }} // Prev button jaisa hi consistent spring
        className={cn(
          "flex items-center gap-1 h-8 sm:h-10 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors",
          currentPage === totalPages
            ? "text-gray-300 cursor-not-allowed" // Disabled state
            : "text-gray-600 hover:bg-primary-50 hover:text-primary", // Active state
        )}
      >
        <span className="hidden sm:inline">Next</span>{" "}
        {/* Label sirf sm+ par */}
        <AiOutlineRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{" "}
        {/* Chevron, mobile par chhota */}
      </motion.button>
    </motion.div>
  );
};

export default Pagination; // Sab pages/components ke liye ek hi shared, animated pagination control
