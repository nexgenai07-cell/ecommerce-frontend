// ============================================================
// ProductPicker — CREATE POST SUB-COMPONENT
// ============================================================
// A required product search/select field — API 78's Create Post
// Frontend Notes explicitly say to "Build the Create Post form linked
// to a product", and its request body includes a `product` field.
// Every social post is fundamentally ABOUT one real product.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineSearch, AiOutlineCheckCircle } from "react-icons/ai";

import { searchProducts } from "../../api/products.api";
import useDebounce from "../../hooks/useDebounce";
import formatPrice from "../../utils/formatPrice";
import Input from "../ui/Input";
import Spinner from "../ui/Spinner";

const ProductPicker = ({ selectedProduct, onSelect }) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const { data: response, isLoading } = useQuery({
    queryKey: ["productPicker", debouncedSearch],
    queryFn: () => searchProducts({ q: debouncedSearch || undefined, page: 1 }),
    enabled: debouncedSearch.length > 0,
  });

  const results = response?.data?.results || [];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">
        Product <span className="text-danger">*</span>
      </span>

      {selectedProduct ? (
        <div className="flex items-center gap-3 p-2 border border-primary rounded-lg bg-primary-50">
          <img
            src={selectedProduct.primary_image}
            alt=""
            className="w-10 h-10 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {selectedProduct.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatPrice(selectedProduct.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-gray-400 hover:text-danger shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder="Search products to link this post to..."
            leftIcon={<AiOutlineSearch className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading && (
            <div className="py-3 flex justify-center">
              <Spinner size="sm" />
            </div>
          )}
          {results.length > 0 && (
            <div className="border border-gray-100 rounded-lg max-h-52 overflow-y-auto">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelect(product);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <img
                    src={product.primary_image}
                    alt=""
                    className="w-8 h-8 rounded object-cover"
                  />
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {product.name}
                  </span>
                  <AiOutlineCheckCircle className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductPicker;
