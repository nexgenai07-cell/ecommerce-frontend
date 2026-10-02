import { QUERY_KEYS } from "../constants/queryKeys";

// Refreshes every cached view that displays a product's details or stock.
// Both saving the product form and adjusting stock change the same product,
// so both call this one function and the whole application ends up in the
// same state afterwards, whichever action the admin used.
//
// Covered views:
// - storefront listings and search results
// - the admin products table
// - the single product detail used by the edit form
// - low stock lists, inventory alerts and the dashboard summary, which are
//   derived from stock levels and the low stock threshold
// - the Audit Logs page and the dashboard activity feed, so the entry the
//   server records for the change shows up without a manual refresh
//
// When the caller has already written the new values into the single product
// detail (for example from an API response), `skipDetail` leaves that entry
// alone so the screen showing it is not refetched.
const invalidateProductQueries = (
  queryClient,
  productId,
  { skipDetail = false } = {},
) => {
  const queryKeys = [
    QUERY_KEYS.PRODUCTS,
    ["products-list"],
    ["products-backend-page"],
    ["adminProducts"],
    QUERY_KEYS.LOW_STOCK_PRODUCTS,
    QUERY_KEYS.INVENTORY_ALERTS,
    QUERY_KEYS.DASHBOARD_SUMMARY,
    ["auditLogs"],
    ["adminDashboard", "auditLogs"],
  ];

  // The detail entry is keyed by product id, so it is added only when the
  // id is known.
  if (!skipDetail && productId !== undefined && productId !== null) {
    queryKeys.push(QUERY_KEYS.PRODUCT_DETAIL(productId));
  }

  queryKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
};

export default invalidateProductQueries;
