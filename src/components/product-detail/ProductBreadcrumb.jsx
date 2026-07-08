// Breadcrumb navigation — pill-style container for a more premium feel
// Shows: Home > Category > Product Name

import { Link } from "react-router-dom";
import { AiOutlineRight } from "react-icons/ai";
import { ROUTES } from "../../constants/routes";

const ProductBreadcrumb = ({ category, productName }) => {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap bg-gray-50 border border-gray-100 rounded-full px-4 py-2 w-fit max-w-full">
      <Link
        to={ROUTES.HOME}
        className="hover:text-primary transition-colors font-medium"
      >
        Home
      </Link>

      <AiOutlineRight className="w-3 h-3 shrink-0" />

      {category && (
        <>
          <Link
            to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
            className="hover:text-primary transition-colors font-medium"
          >
            {category.name}
          </Link>
          <AiOutlineRight className="w-3 h-3 shrink-0" />
        </>
      )}

      <span className="text-gray-700 font-semibold line-clamp-1">
        {productName}
      </span>
    </nav>
  );
};

export default ProductBreadcrumb;
