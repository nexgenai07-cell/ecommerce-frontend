import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsTag, BsBoxSeam, BsGrid, BsCheckCircle } from "react-icons/bs";

const TABS = [
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
];

const ProductTabs = ({ product }) => {
  const [activeTab, setActiveTab] = useState("description");

  // Spec cards — each one only renders if the underlying field actually exists
  const specCards = [
    product?.sku && {
      icon: <BsTag className="w-5 h-5" />,
      label: "SKU",
      value: product.sku,
    },
    {
      icon: <BsGrid className="w-5 h-5" />,
      label: "Category",
      value: product?.category?.name || "-",
    },
    {
      icon: <BsBoxSeam className="w-5 h-5" />,
      label: "Stock",
      value: `${product?.available_stock ?? 0} units`,
    },
    {
      icon: <BsCheckCircle className="w-5 h-5" />,
      label: "Availability",
      value: (product?.available_stock ?? 0) > 0 ? "In Stock" : "Out of Stock",
      accent: (product?.available_stock ?? 0) > 0 ? "success" : "danger",
    },
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8">
      {/* ─── Tab Header Bar ─── */}
      <div className="flex items-center gap-2 border-b border-gray-100 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-4 py-3 text-sm font-semibold transition-colors
              ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* ══════ DESCRIPTION ══════ */}
          {activeTab === "description" && (
            <div className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line max-w-3xl mx-auto text-center sm:text-left">
              {product?.description || "No description available."}
            </div>
          )}

          {/* ══════ SPECIFICATIONS — icon card grid ══════ */}
          {activeTab === "specifications" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {specCards.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-2xl p-4 transition-colors"
                >
                  <div
                    className={`
                      w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                      ${
                        spec.accent === "success"
                          ? "bg-success-light text-success"
                          : spec.accent === "danger"
                            ? "bg-danger-light text-danger"
                            : "bg-primary-50 text-primary"
                      }
                    `}
                  >
                    {spec.icon}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      {spec.label}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {spec.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ProductTabs;
