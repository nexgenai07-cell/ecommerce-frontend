// Reusable Pagination component
// Results-count text yahan se hata diya gaya hai — ProductsToolbar mein
// already "Showing X-Y of Z products" dikh raha hai, dono jagah repeat
// karna redundant tha. Ye component sirf navigation ka kaam karta hai.
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import cn from "../../utils/cn";

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = "",
}) => {
  if (totalPages <= 1) return null;

  // Page numbers hamesha totalPages ke hisaab se generate hote hain —
  // jitne products utni hi pages, jitni pages utne hi number buttons
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
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
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 shadow-2xl  bg-white rounded-2xl border border-gray-100 px-4 py-4",
        className,
      )}
    >
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "flex items-center gap-1 h-10 px-3 rounded-xl text-sm font-semibold transition-all",
          currentPage === 1
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-600 hover:bg-primary-50 hover:text-primary",
        )}
      >
        <AiOutlineLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* Page numbers — dynamic, totalPages se derive hote hain */}
      <div className="flex items-center gap-1.5">
        {pageNumbers.map((page, index) =>
          page === "..." ? (
            <span
              key={`dots-${index}`}
              className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm"
            >
              ⋯
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-200",
                currentPage === page
                  ? "bg-linear-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/25 scale-105"
                  : "text-gray-600 hover:bg-primary-50 hover:text-primary",
              )}
            >
              {page}
            </button>
          ),
        )}
      </div>

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "flex items-center gap-1 h-10 px-3 rounded-xl text-sm font-semibold transition-all",
          currentPage === totalPages
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-600 hover:bg-primary-50 hover:text-primary",
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <AiOutlineRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Pagination;
