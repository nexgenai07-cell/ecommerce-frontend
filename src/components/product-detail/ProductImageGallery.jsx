import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AiOutlineLeft,
  AiOutlineRight,
  AiOutlineZoomIn,
  AiOutlineZoomOut,
} from "react-icons/ai";

const FALLBACK_IMAGE = "/placeholder-product.svg";
const ZOOM_SCALE = 2.5;

const clamp = (value) => Math.min(100, Math.max(0, value));

const ProductImageGallery = ({ images = [], productName = "" }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const pointerTypeRef = useRef("mouse");

  const activeImage = images[activeIndex]?.image_url || FALLBACK_IMAGE;

  const resetZoom = () => setZoom({ active: false, x: 50, y: 50 });

  const getOrigin = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    resetZoom();
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    resetZoom();
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleSelect = (index) => {
    resetZoom();
    setActiveIndex(index);
  };

  const handlePointerDown = (e) => {
    pointerTypeRef.current = e.pointerType;
  };

  const handlePointerEnter = (e) => {
    if (e.pointerType !== "mouse") return;
    setZoom({ active: true, ...getOrigin(e) });
  };

  const handlePointerMove = (e) => {
    if (!zoom.active) return;
    setZoom({ active: true, ...getOrigin(e) });
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType !== "mouse") return;
    resetZoom();
  };

  const handleClick = (e) => {
    if (pointerTypeRef.current === "mouse") return;
    if (zoom.active) {
      resetZoom();
    } else {
      setZoom({ active: true, ...getOrigin(e) });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex flex-col gap-4">
      <div
        className={`relative aspect-square bg-gray-50 rounded-xl overflow-hidden group shadow-xl select-none ${
          zoom.active ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        style={{ touchAction: zoom.active ? "none" : "manipulation" }}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <div
          className="w-full h-full"
          style={{
            transform: `scale(${zoom.active ? ZOOM_SCALE : 1})`,
            transformOrigin: `${zoom.x}% ${zoom.y}%`,
            transition: zoom.active
              ? "transform 0.15s ease-out"
              : "transform 0.25s ease-in-out",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeIndex}
              src={activeImage}
              alt={`${productName} - Image ${activeIndex + 1}`}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
        </div>

        <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-500 pointer-events-none pointer-fine:hidden">
          {zoom.active ? (
            <AiOutlineZoomOut className="w-4 h-4" />
          ) : (
            <AiOutlineZoomIn className="w-4 h-4" />
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:shadow-lg transition-all"
              aria-label="Previous image"
            >
              <AiOutlineLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:shadow-lg transition-all"
              aria-label="Next image"
            >
              <AiOutlineRight className="w-4 h-4" />
            </button>

            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium pointer-events-none">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide pb-1 justify-center sm:justify-start">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleSelect(index)}
              className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0
                transition-all duration-150
                ${
                  activeIndex === index
                    ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                    : "border-gray-100 hover:border-gray-300 opacity-80 hover:opacity-100"
                }
              `}
              aria-label={`View image ${index + 1}`}
            >
              <img
                src={image.image_url}
                alt={`${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
