// ============================================================
// CustomerNavbar.jsx — Shared navbar across the entire customer-facing site
// Fully functional: real API categories, real API search (debounced),
// Redux-driven auth/cart/wishlist state, fully responsive.
// ============================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import {
  AiOutlineSearch,
  AiOutlineHeart,
  AiOutlineShopping,
  AiOutlineBell,
  AiOutlineUser,
  AiOutlineClose,
  AiOutlineMenu,
  AiOutlineLogout,
  AiOutlineSetting,
} from "react-icons/ai";
import { IoChevronDownOutline } from "react-icons/io5";
import { BsArrowRight } from "react-icons/bs";
import { HiOutlineSparkles } from "react-icons/hi2";

import cn from "../../utils/cn";
import { ROUTES } from "../../constants/routes";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getCategories } from "../../api/categories.api";
import extractListData from "../../utils/extractListData"; // Defensive normalizer — see file for why this exists (backend/docs contract drift on the categories endpoint)
import { searchProducts } from "../../api/products.api";
import { logoutUser as logoutApi } from "../../api/auth.api";
import { getWishlist } from "../../api/wishlist.api";
import { getCart } from "../../api/cart.api";
import useAuth from "../../hooks/useAuth";
import useCart from "../../hooks/useCart";
import useWishlist from "../../hooks/useWishlist";
import { showSuccess } from "../ui/Toast";
import debounce from "../../utils/debounce";
import Container from "./Container";
import Avatar from "../ui/Avatar";

const CustomerNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ===== REDUX STATE =====
  const { user, isAuthenticated, logoutUser } = useAuth();
  const { count: cartCount, handleSyncCart } = useCart();
  const { count: wishlistCount, handleSetWishlist } = useWishlist();

  // ===== LOCAL UI STATE =====
  const [isSticky, setIsSticky] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState(null);

  // ===== REFS =====
  const searchRef = useRef(null);
  const userDropdownRef = useRef(null);

  // ===== CATEGORIES — real API, used in search suggestions + mobile drawer =====
  const { data: categoriesData } = useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
  // API_Documentation_Final.pdf (API 11) documents this endpoint as a
  // flat array, but real responses show a DRF-paginated object — a
  // backend/docs contract mismatch. extractListData() safely handles
  // either shape.
  const categories = extractListData(categoriesData);

  // ===== SYNC WISHLIST & CART FROM BACKEND =====
  // The navbar is mounted on every customer page, so this is the single
  // place that keeps Redux (heart icons, cart badge) accurate — even
  // right after a page refresh — instead of relying only on whatever
  // was added to Redux locally during the current session.
  const { data: wishlistSyncData } = useQuery({
    queryKey: QUERY_KEYS.WISHLIST,
    queryFn: getWishlist,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (wishlistSyncData?.data) {
      handleSetWishlist(wishlistSyncData.data);
    }
  }, [wishlistSyncData]);

  const { data: cartSyncData } = useQuery({
    queryKey: QUERY_KEYS.CART,
    queryFn: getCart,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (cartSyncData?.data) {
      handleSyncCart(cartSyncData.data);
    }
  }, [cartSyncData]);

  // ===== SEARCH SUGGESTIONS — real API, debounced, min 2 chars =====
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search-suggestions", searchQuery],
    queryFn: () => searchProducts({ q: searchQuery, limit: 4 }),
    enabled: searchQuery.length >= 2,
    staleTime: 1000 * 30,
  });
  const searchResults = searchData?.data?.results || [];

  // Stable debounced setter — created once via useRef so the timer
  // isn't lost/reset on every re-render
  const debouncedSetQuery = useRef(
    debounce((value) => setSearchQuery(value), 400),
  ).current;

  const handleSearchInput = (e) => debouncedSetQuery(e.target.value);

  // ===== STICKY NAVBAR ON SCROLL =====
  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ===== CLOSE DROPDOWNS ON OUTSIDE CLICK =====
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ===== LOCK BODY SCROLL WHEN MOBILE DRAWER IS OPEN =====
  useEffect(() => {
    document.body.style.overflow = mobileDrawerOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileDrawerOpen]);

  // ===== CLOSE ALL OVERLAYS ON ROUTE CHANGE =====
  useEffect(() => {
    setMobileDrawerOpen(false);
    setSearchOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // ===== RECENT SEARCHES (localStorage) =====
  const getRecentSearches = () => {
    try {
      const stored = localStorage.getItem("recentSearches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    try {
      const recent = getRecentSearches();
      const updated = [query, ...recent.filter((r) => r !== query)].slice(0, 5);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch {
      // storage unavailable — silently ignore
    }
  };

  const handleSearchNavigate = (url, query = "") => {
    if (query) saveRecentSearch(query);
    setSearchOpen(false);
    setSearchQuery("");
    navigate(url);
  };

  // ===== LOGOUT =====
  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await logoutApi({ refresh: refreshToken });
    } catch {
      // backend failure — local logout still proceeds below
    } finally {
      logoutUser();
      setUserDropdownOpen(false);
      setMobileDrawerOpen(false);
      showSuccess("Logged out successfully");
      navigate(ROUTES.HOME);
    }
  };

  // Menu items shown inside the avatar dropdown
  const accountMenuItems = useMemo(
    () => [
      {
        icon: AiOutlineUser,
        label: "My Profile",
        to: ROUTES.ACCOUNT_DASHBOARD,
      },
      {
        icon: AiOutlineShopping,
        label: "My Orders",
        to: ROUTES.ACCOUNT_ORDERS,
      },
      { icon: AiOutlineSetting, label: "Settings", to: ROUTES.ACCOUNT_PROFILE },
    ],
    [],
  );

  return (
    <>
      {/* ================================================ */}
      {/* ANNOUNCEMENT BAR */}
      {/* ================================================ */}
      {announcementVisible && (
        <div className="bg-gray-900 text-white text-xs py-2.5 relative">
          <Container>
            <div className="flex items-center justify-center">
              {isAuthenticated ? (
                <p className="font-medium tracking-widest uppercase text-center flex items-center gap-1.5">
                  <HiOutlineSparkles className="w-3.5 h-3.5 text-primary-light" />
                  Exclusive Member Preview: Winter 2024 Collection
                </p>
              ) : (
                <p className="font-medium tracking-widest uppercase text-center">
                  Free Shipping On All Orders Over Rs. 5000 • Use Code: ZYRON50
                </p>
              )}
              <button
                onClick={() => setAnnouncementVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                aria-label="Close announcement"
              >
                <AiOutlineClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </Container>
        </div>
      )}

      {/* ================================================ */}
      {/* MAIN NAVBAR HEADER — always elevated (floating/raised look) */}
      {/* ================================================ */}
      <header
        className={cn(
          "w-full z-sticky border-b border-gray-100 rounded-b-2xl transition-all duration-300",
          isSticky
            ? "fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-xl"
            : "relative bg-white shadow-lg",
        )}
      >
        <Container>
          <div className="flex items-center justify-between gap-6 h-16">
            {/* ===== LOGO ===== */}
            <Link
              to={ROUTES.HOME}
              className="shrink-0 flex items-center gap-1 font-bold text-xl text-gray-900 tracking-tight"
            >
              <span className="text-primary">✦</span>
              Zyron
            </Link>

            {/* ===== DESKTOP SEARCH BAR — fills remaining row width ===== */}
            <div
              ref={searchRef}
              className="hidden md:flex flex-1 max-w-2xl relative"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search for products, brands..."
                  onChange={handleSearchInput}
                  onFocus={() => setSearchOpen(true)}
                  className={cn(
                    "w-full pl-5 pr-11 py-2.5 text-sm rounded-full border transition-all duration-200",
                    "placeholder:text-gray-400 text-gray-900 bg-gray-50",
                    "focus:outline-none focus:bg-white",
                    searchOpen
                      ? "border-primary ring-4 ring-primary-50 bg-white"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                />
                <span
                  className={cn(
                    "absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                    searchOpen ? "bg-primary text-white" : "text-gray-400",
                  )}
                >
                  <AiOutlineSearch className="w-4 h-4" />
                </span>
              </div>

              {/* ===== SEARCH DROPDOWN ===== */}
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-dropdown overflow-hidden"
                  >
                    <div className="p-4 flex flex-col gap-4">
                      {/* Popular category pills */}
                      {categories.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Popular Categories
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {categories.slice(0, 4).map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() =>
                                  handleSearchNavigate(
                                    `${ROUTES.PRODUCTS}?category_id=${cat.id}`,
                                  )
                                }
                                className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary hover:bg-primary-50 transition-colors"
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live search suggestions */}
                      {searchQuery.length >= 2 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Suggested Products
                          </p>

                          {searchLoading && (
                            <div className="flex flex-col gap-3">
                              {[1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 animate-pulse"
                                >
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                                  <div className="flex-1 flex flex-col gap-1.5">
                                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!searchLoading && searchResults.length > 0 && (
                            <div className="flex flex-col gap-1">
                              {searchResults.map((product) => (
                                <button
                                  key={product.id}
                                  onClick={() =>
                                    handleSearchNavigate(
                                      ROUTES.PRODUCT_DETAIL.replace(
                                        ":id",
                                        product.id,
                                      ),
                                      searchQuery,
                                    )
                                  }
                                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-primary-50 transition-colors text-left"
                                >
                                  <img
                                    src={
                                      product.primary_image ||
                                      "/placeholder-product.png"
                                    }
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded-lg border border-gray-100 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-sm font-semibold text-primary">
                                      Rs.{" "}
                                      {Number(product.price).toLocaleString()}
                                    </p>
                                  </div>
                                </button>
                              ))}

                              <button
                                onClick={() =>
                                  handleSearchNavigate(
                                    `${ROUTES.SEARCH}?q=${searchQuery}`,
                                    searchQuery,
                                  )
                                }
                                className="flex items-center justify-center gap-1 w-full text-xs font-semibold text-primary hover:underline mt-2 py-1"
                              >
                                View All Results
                                <BsArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {!searchLoading && searchResults.length === 0 && (
                            <p className="text-sm text-gray-400 py-2">
                              No products found for "{searchQuery}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Recent searches */}
                      {searchQuery.length < 2 &&
                        getRecentSearches().length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Recent Searches
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {getRecentSearches().map((recent, index) => (
                                <button
                                  key={index}
                                  onClick={() =>
                                    handleSearchNavigate(
                                      `${ROUTES.SEARCH}?q=${recent}`,
                                    )
                                  }
                                  className="text-xs text-gray-500 hover:text-primary transition-colors"
                                >
                                  {recent}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ===== RIGHT SIDE ICON ROW ===== */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Mobile search — opens the drawer (which has the working mobile search input) */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-full text-gray-600 hover:bg-primary-50 hover:text-primary transition-colors"
                aria-label="Search"
              >
                <AiOutlineSearch className="w-5 h-5" />
              </button>

              {/* Wishlist */}
              <Link
                to={isAuthenticated ? ROUTES.ACCOUNT_WISHLIST : ROUTES.LOGIN}
                className="relative p-2 rounded-full text-gray-600 hover:bg-primary-50 hover:text-primary transition-colors"
                aria-label="Wishlist"
              >
                <AiOutlineHeart className="w-5 h-5" />
                <AnimatePresence>
                  {wishlistCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none shadow-sm"
                    >
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Cart */}
              <Link
                to={ROUTES.CART}
                className="relative p-2 rounded-full text-gray-600 hover:bg-primary-50 hover:text-primary transition-colors"
                aria-label="Cart"
              >
                <AiOutlineShopping className="w-5 h-5" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none shadow-sm"
                    >
                      {cartCount > 9 ? "9+" : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Notifications — logged-in only */}
              {isAuthenticated && (
                <Link
                  to={ROUTES.ACCOUNT_NOTIFICATIONS}
                  className="relative p-2 rounded-full text-gray-600 hover:bg-primary-50 hover:text-primary transition-colors"
                  aria-label="Notifications"
                >
                  <AiOutlineBell className="w-5 h-5" />
                </Link>
              )}

              {/* Logged out — Login / Register */}
              {!isAuthenticated && (
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <Link
                    to={ROUTES.LOGIN}
                    className="text-sm font-medium text-gray-700 hover:text-primary transition-colors px-3 py-2"
                  >
                    Log In
                  </Link>
                  <Link
                    to={ROUTES.REGISTER}
                    className="text-sm font-semibold bg-linear-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-full shadow-sm hover:shadow-md hover:scale-[1.03] transition-all duration-200"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Logged in — Avatar dropdown (no chevron trigger icon) */}
              {isAuthenticated && (
                <div
                  ref={userDropdownRef}
                  className="relative hidden md:block ml-1"
                >
                  <button
                    onClick={() => setUserDropdownOpen((open) => !open)}
                    className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full hover:bg-primary-50 transition-colors duration-200 group"
                  >
                    <Avatar
                      src={user?.avatar}
                      name={user?.name}
                      size="sm"
                      className="ring-2 ring-transparent group-hover:ring-primary-100 transition-all duration-200"
                    />
                    <span className="text-sm font-semibold text-gray-700 max-w-24 truncate group-hover:text-primary transition-colors">
                      {user?.name?.split(" ")[0] || "Account"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-3 w-72 bg-white rounded-2xl border border-gray-100 shadow-xl z-dropdown overflow-hidden origin-top-right"
                      >
                        {/* Gradient profile header */}
                        <div className="relative px-5 py-5 bg-linear-to-br from-primary via-primary to-primary-dark overflow-hidden">
                          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                          <div className="absolute -right-2 -bottom-10 w-20 h-20 bg-white/10 rounded-full" />
                          <div className="relative flex items-center gap-3">
                            <Avatar
                              src={user?.avatar}
                              name={user?.name}
                              size="lg"
                              className="ring-4 ring-white/30"
                            />
                            <div className="min-w-0">
                              <p className="text-white font-semibold truncate">
                                {user?.name}
                              </p>
                              <p className="text-white/80 text-xs truncate">
                                {user?.email}
                              </p>
                            </div>
                          </div>
                          <span className="relative inline-block mt-3 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
                            {user?.role === "admin" ? "Admin" : "Member"}
                          </span>
                        </div>

                        {/* Menu items */}
                        <div className="py-2">
                          {accountMenuItems.map((item) => (
                            <Link
                              key={item.label}
                              to={item.to}
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary transition-colors group"
                            >
                              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <item.icon className="w-4 h-4" />
                              </span>
                              {item.label}
                            </Link>
                          ))}
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 py-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl w-[calc(100%-1rem)] text-sm font-medium text-danger hover:bg-danger-light transition-colors group"
                          >
                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-danger-light text-danger group-hover:bg-danger group-hover:text-white transition-colors">
                              <AiOutlineLogout className="w-4 h-4" />
                            </span>
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-full text-gray-600 hover:bg-primary-50 hover:text-primary transition-colors ml-1"
                aria-label="Menu"
              >
                <AiOutlineMenu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Spacer — prevents content jump when navbar becomes fixed */}
      {isSticky && <div className="h-16" />}

      {/* ================================================ */}
      {/* MOBILE DRAWER */}
      {/* ================================================ */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-drawer md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileDrawerOpen(false)}
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-white flex flex-col overflow-hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <span className="font-bold text-lg text-gray-900 flex items-center gap-1">
                  <span className="text-primary">✦</span>Zyron
                </span>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <AiOutlineClose className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* User info / auth buttons */}
                {isAuthenticated ? (
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar src={user?.avatar} name={user?.name} size="lg" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Link
                        to={ROUTES.ACCOUNT_ORDERS}
                        className="flex flex-col items-center gap-1.5 p-3 bg-primary-50 rounded-xl text-xs font-medium text-primary hover:bg-primary-100 transition-colors"
                      >
                        <AiOutlineShopping className="w-5 h-5" />
                        My Orders
                      </Link>
                      <Link
                        to={ROUTES.ACCOUNT_WISHLIST}
                        className="flex flex-col items-center gap-1.5 p-3 bg-primary-50 rounded-xl text-xs font-medium text-primary hover:bg-primary-100 transition-colors"
                      >
                        <AiOutlineHeart className="w-5 h-5" />
                        Wishlist
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
                    <Link
                      to={ROUTES.LOGIN}
                      className="flex-1 text-center py-2.5 text-sm font-medium border border-gray-200 rounded-full text-gray-700 hover:border-primary hover:text-primary transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to={ROUTES.REGISTER}
                      className="flex-1 text-center py-2.5 text-sm font-semibold bg-linear-to-r from-primary to-primary-dark text-white rounded-full shadow-sm hover:shadow-md transition-all"
                    >
                      Register
                    </Link>
                  </div>
                )}

                {/* Mobile search — real API, fully functional */}
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      onChange={handleSearchInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          handleSearchNavigate(
                            `${ROUTES.SEARCH}?q=${e.target.value}`,
                            e.target.value,
                          );
                          setMobileDrawerOpen(false);
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-50 focus:bg-white transition-colors"
                    />
                    <AiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {/* Live suggestions inline for mobile search */}
                  {searchQuery.length >= 2 && (
                    <div className="mt-3 flex flex-col gap-1">
                      {searchLoading && (
                        <p className="text-xs text-gray-400 py-1">
                          Searching...
                        </p>
                      )}
                      {!searchLoading &&
                        searchResults.slice(0, 3).map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              handleSearchNavigate(
                                ROUTES.PRODUCT_DETAIL.replace(
                                  ":id",
                                  product.id,
                                ),
                                searchQuery,
                              );
                              setMobileDrawerOpen(false);
                            }}
                            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-primary-50 transition-colors text-left"
                          >
                            <img
                              src={
                                product.primary_image ||
                                "/placeholder-product.png"
                              }
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {product.name}
                              </p>
                              <p className="text-xs font-semibold text-primary">
                                Rs. {Number(product.price).toLocaleString()}
                              </p>
                            </div>
                          </button>
                        ))}
                      {!searchLoading && searchResults.length === 0 && (
                        <p className="text-xs text-gray-400 py-1">
                          No products found for "{searchQuery}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Categories accordion — mobile only, real API data */}
                <nav className="px-5 py-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                    Categories
                  </p>
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <button
                        onClick={() =>
                          setExpandedMobileCategory(
                            expandedMobileCategory === category.id
                              ? null
                              : category.id,
                          )
                        }
                        className="flex items-center justify-between w-full py-3 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
                      >
                        {category.name}
                        <IoChevronDownOutline
                          className={cn(
                            "w-4 h-4 text-gray-400 transition-transform duration-200",
                            expandedMobileCategory === category.id &&
                              "rotate-180",
                          )}
                        />
                      </button>

                      {expandedMobileCategory === category.id && (
                        <div className="pb-2 pl-3">
                          <Link
                            to={`${ROUTES.PRODUCTS}?category_id=${category.id}`}
                            onClick={() => setMobileDrawerOpen(false)}
                            className="flex items-center gap-1.5 py-2 text-sm text-gray-500 hover:text-primary transition-colors"
                          >
                            <BsArrowRight className="w-3.5 h-3.5" />
                            View All {category.name}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>

                {/* Account links — logged in only */}
                {isAuthenticated && (
                  <div className="px-5 py-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Account
                    </p>
                    <div className="flex flex-col gap-1">
                      <Link
                        to={ROUTES.ACCOUNT_PROFILE}
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex items-center gap-3 py-2.5 text-sm text-gray-700 hover:text-primary transition-colors"
                      >
                        <AiOutlineUser className="w-4 h-4 text-gray-400" />
                        Personal Info
                      </Link>
                      <Link
                        to={ROUTES.ACCOUNT_ORDERS}
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex items-center gap-3 py-2.5 text-sm text-gray-700 hover:text-primary transition-colors"
                      >
                        <AiOutlineShopping className="w-4 h-4 text-gray-400" />
                        My Orders
                      </Link>
                      <Link
                        to={ROUTES.ACCOUNT_NOTIFICATIONS}
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex items-center gap-3 py-2.5 text-sm text-gray-700 hover:text-primary transition-colors"
                      >
                        <AiOutlineBell className="w-4 h-4 text-gray-400" />
                        Notifications
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 py-2.5 text-sm text-danger hover:text-red-600 transition-colors mt-2"
                      >
                        <AiOutlineLogout className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomerNavbar;
