// ============================================================
// useBreadcrumb - CUSTOM HOOK
// ============================================================
// This is a custom React hook that acts as a SHORTCUT for reading and
// publishing the current page's dynamic breadcrumb label, backed by
// the Redux "breadcrumb" slice (see store/slices/breadcrumbSlice.js).
//
// WHY THIS HOOK EXISTS:
// Detail pages reached via a dynamic URL segment — a single product,
// a single order, a single support ticket, a single return, a single
// social post — don't know their own real title (product name, order
// number, ticket subject...) until their own API call resolves. This
// hook gives those pages a single, one-line way to publish that title
// once it's known, so the shared <Breadcrumbs /> component (mounted
// once in CustomerLayout and once in AdminLayout) can show the REAL
// title instead of a generic fallback like "Product Details".
//
// TYPICAL USAGE, inside a detail page component:
//   const { handleSetLabel } = useBreadcrumb();
//   const { data } = useQuery({ ... });
//   const product = data?.data;
//
//   useEffect(() => {
//     if (product?.name) handleSetLabel(product.name);
//   }, [product?.name]);
//
// Nothing needs to clear the label manually on unmount — <Breadcrumbs />
// itself clears it automatically on every route change, so the very
// next page always starts from a clean slate.

import { useSelector, useDispatch } from "react-redux";
// useSelector -> lets us READ data from the Redux store
// useDispatch -> lets us DISPATCH actions to update the Redux store

import { setDynamicLabel, clearDynamicLabel } from "../store/slices/breadcrumbSlice";
// Importing the specific action creators defined in breadcrumbSlice.js,
// so we can dispatch them from inside this hook.

// ----------------------------
// DEFINING THE CUSTOM HOOK
// ----------------------------
const useBreadcrumb = () => {
  // --------------------------------------------------
  // READING STATE FROM REDUX
  // --------------------------------------------------
  // Pulling out dynamicLabel from the "breadcrumb" branch of the Redux
  // store, so components (mainly <Breadcrumbs /> itself) can read it
  // directly without writing their own useSelector call.
  const { dynamicLabel } = useSelector((state) => state.breadcrumb);

  // --------------------------------------------------
  // GETTING THE DISPATCH FUNCTION
  // --------------------------------------------------
  const dispatch = useDispatch();

  // --------------------------------------------------
  // FUNCTION: handleSetLabel
  // --------------------------------------------------
  // Dispatches "setDynamicLabel" to publish the real title for
  // whichever detail page is currently mounted. Called by detail pages
  // (ProductDetail, OrderDetail, AdminOrderDetail, ...) once their own
  // API data has actually loaded.
  const handleSetLabel = (label) => {
    dispatch(setDynamicLabel(label));
  };

  // --------------------------------------------------
  // FUNCTION: handleClearLabel
  // --------------------------------------------------
  // Dispatches "clearDynamicLabel" to reset the label back to null.
  // <Breadcrumbs /> already does this automatically on every route
  // change, so most pages never need to call this directly — it's
  // exposed here mainly for completeness/edge cases.
  const handleClearLabel = () => {
    dispatch(clearDynamicLabel());
  };

  // --------------------------------------------------
  // RETURNING VALUES & FUNCTIONS
  // --------------------------------------------------
  return {
    dynamicLabel, // The currently published dynamic label, or null
    handleSetLabel, // Function to publish a new dynamic label
    handleClearLabel, // Function to manually reset the dynamic label
  };
};

// ----------------------------
// EXPORTING THE HOOK
// ----------------------------
// Default export so it can be imported in any component like:
// import useBreadcrumb from "../../hooks/useBreadcrumb";
// const { handleSetLabel } = useBreadcrumb();
export default useBreadcrumb;
