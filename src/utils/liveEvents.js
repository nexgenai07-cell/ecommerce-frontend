// ============================================================
// LIVE EVENT PROCESSOR
// ============================================================
// Translates events pushed over the live updates socket into changes in the
// TanStack Query cache, so every screen that reads from the cache refreshes
// by itself without a page reload.
//
// Two strategies are used, depending on the event:
//
// 1. In-place patching (product_update)
//    Price and stock change often and arrive with the full set of values, so
//    they are written straight into every cached product object. Screens
//    reflect the change instantly with no network request.
//
// Product list membership
//    A product_update can also change which products belong in a list: a
//    newly created product, or a product moved into or out of a category.
//    Lists of the affected categories are refetched when a product joins
//    them, and the product is removed from the cached lists of the category
//    it left. Lists of unrelated categories are not touched.
//
// 2. Invalidation (every other event)
//    The event only tells the client that something changed. The affected
//    queries are marked stale and the ones currently on screen are refetched,
//    so the REST response always remains the source of truth. Queries that
//    are not on screen are only marked stale and load fresh data the next
//    time they are opened.
//
// Bursts of events (for example everything that happens during a checkout)
// are coalesced, so the same query is never refetched more than once per
// batch window.

import { QUERY_KEYS } from "../constants/queryKeys";

// Invalidations requested within this window are merged and flushed together.
const INVALIDATION_BATCH_MS = 300;

// Dashboard numbers are recalculated by the backend, so refetches are
// debounced to avoid one request per event during a burst.
const DASHBOARD_REFRESH_DEBOUNCE_MS = 1500;

// How long an admin alert is remembered to suppress its duplicate
// notification toast.
const ADMIN_ALERT_MEMORY_MS = 10000;

// Safety limit for the recursive cache walk.
const MAX_CACHE_WALK_DEPTH = 8;

// Customer-facing caches that hold product lists.
const CUSTOMER_PRODUCT_ROOTS = [
  QUERY_KEYS.PRODUCTS,
  ["products-list"],
  ["products-backend-page"],
  ["product"],
];

// Admin caches that hold product lists.
const ADMIN_PRODUCT_ROOTS = [["adminProducts"], QUERY_KEYS.LOW_STOCK_PRODUCTS];

// Caches that embed product objects inside another structure.
const CART_ROOT = QUERY_KEYS.CART;
const WISHLIST_ROOT = QUERY_KEYS.WISHLIST;

const STOCK_FIELDS = ["total_stock", "reserved_stock", "available_stock"];
const FLAG_FIELDS = ["is_active", "is_delete"];

// ------------------------------------------------------------
// Value helpers
// ------------------------------------------------------------

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Identifiers can be a number in one place and a string (from the URL) in
// another, so they are always compared as strings.
const isSameId = (a, b) =>
  a !== undefined && a !== null && b !== undefined && b !== null
    ? String(a) === String(b)
    : false;

// Writes a monetary value using the same type the cached object already
// uses, so components that expect a number or a decimal string keep working.
const matchValueType = (existingValue, incomingValue) =>
  typeof existingValue === "number"
    ? Number(incomingValue)
    : String(incomingValue);

// ------------------------------------------------------------
// Product patching
// ------------------------------------------------------------

// A product object is recognised by its id together with a price and at
// least one identifying or stock field. Wrapper objects such as cart or
// wishlist rows (which contain a nested `product`) are skipped, so only the
// product itself is ever patched.
const isProductObject = (candidate, productId) =>
  isPlainObject(candidate) &&
  isSameId(candidate.id, productId) &&
  "price" in candidate &&
  !("product" in candidate) &&
  ("name" in candidate ||
    "available_stock" in candidate ||
    "total_stock" in candidate);

// Returns the same object reference when nothing changed, so React Query
// and React can skip needless re-renders.
const patchProductObject = (product, update) => {
  const patch = {};

  if (
    update.price !== undefined &&
    update.price !== null &&
    Number(product.price) !== Number(update.price)
  ) {
    patch.price = matchValueType(product.price, update.price);
  }

  if ("original_price" in product && update.original_price !== undefined) {
    const incoming = update.original_price;
    const current = product.original_price;

    if (incoming === null) {
      if (current !== null) patch.original_price = null;
    } else if (current === null || Number(current) !== Number(incoming)) {
      patch.original_price = matchValueType(current, incoming);
    }
  }

  STOCK_FIELDS.forEach((field) => {
    if (
      field in product &&
      typeof update[field] === "number" &&
      product[field] !== update[field]
    ) {
      patch[field] = update[field];
    }
  });

  FLAG_FIELDS.forEach((field) => {
    if (
      field in product &&
      typeof update[field] === "boolean" &&
      product[field] !== update[field]
    ) {
      patch[field] = update[field];
    }
  });

  return Object.keys(patch).length > 0 ? { ...product, ...patch } : product;
};

// Walks any cached structure (paginated responses, plain arrays, cart or
// wishlist payloads) and patches every matching product. Untouched branches
// keep their original references.
const patchProductTree = (node, update, stats, depth = 0) => {
  if (depth > MAX_CACHE_WALK_DEPTH) return node;

  if (Array.isArray(node)) {
    let nextList = null;

    node.forEach((entry, index) => {
      const patchedEntry = patchProductTree(entry, update, stats, depth + 1);

      if (patchedEntry !== entry) {
        if (!nextList) nextList = [...node];
        nextList[index] = patchedEntry;
      }
    });

    return nextList || node;
  }

  if (!isPlainObject(node)) return node;

  if (isProductObject(node, update.id)) {
    stats.found = true;
    return patchProductObject(node, update);
  }

  let nextObject = null;

  Object.keys(node).forEach((key) => {
    const child = node[key];
    const patchedChild = patchProductTree(child, update, stats, depth + 1);

    if (patchedChild !== child) {
      if (!nextObject) nextObject = { ...node };
      nextObject[key] = patchedChild;
    }
  });

  return nextObject || node;
};

// ------------------------------------------------------------
// Product list membership helpers
// ------------------------------------------------------------

const PRODUCT_LIST_ROOT = "products-list";
const PRODUCT_PAGE_ROOT = "products-backend-page";

const hasValue = (value) => value !== undefined && value !== null;

// Splits a comma-separated category parameter such as "5,8" into its ids.
const parseCategoryParam = (value) =>
  hasValue(value) && value !== ""
    ? String(value)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

// Returns the category ids a cached product list was requested for. The
// page-level lists store them in the filters object, the backend page
// entries store them as the comma-separated category_id parameter.
const getQueryCategoryIds = (query) => {
  const [root, details] = query.queryKey;

  if (root === PRODUCT_LIST_ROOT) {
    return Array.isArray(details?.categories) ? details.categories : [];
  }

  if (root === PRODUCT_PAGE_ROOT) {
    return parseCategoryParam(details?.category_id);
  }

  return [];
};

const queryHasCategory = (query, categoryId) =>
  hasValue(categoryId) &&
  getQueryCategoryIds(query).some((id) => isSameId(id, categoryId));

const isProductListQuery = (query) => query.queryKey[0] === PRODUCT_LIST_ROOT;

const isProductPageQuery = (query) => query.queryKey[0] === PRODUCT_PAGE_ROOT;

// Removes a product from a cached list response and lowers the total by the
// number of removed rows. The same reference is returned when the product
// is not part of the response.
const removeProductFromList = (data, productId) => {
  if (!isPlainObject(data) || !Array.isArray(data.results)) return data;

  const remaining = data.results.filter(
    (product) => !isSameId(product?.id, productId),
  );
  const removedCount = data.results.length - remaining.length;

  if (removedCount === 0) return data;

  return {
    ...data,
    results: remaining,
    count:
      typeof data.count === "number"
        ? Math.max(data.count - removedCount, 0)
        : data.count,
  };
};

// ------------------------------------------------------------
// Processor factory
// ------------------------------------------------------------

/**
 * @param {object}   options
 * @param {object}   options.queryClient    The shared TanStack Query client.
 * @param {function} options.onNotification Called with a notification payload that should be shown to the user.
 * @param {function} options.onAdminAlert   Called with (kind, data) for new orders, returns and complaints in an admin's store.
 */
export const createLiveEventProcessor = ({
  queryClient,
  onNotification,
  onAdminAlert,
}) => {
  // ----------------------------------------------------------
  // Batched invalidation
  // ----------------------------------------------------------
  const pendingInvalidations = new Map();
  let batchTimer = null;
  let dashboardTimer = null;

  const flushInvalidations = () => {
    batchTimer = null;

    const filtersList = [...pendingInvalidations.values()];
    pendingInvalidations.clear();

    filtersList.forEach((filters) => {
      queryClient.invalidateQueries({ ...filters, refetchType: "active" });
    });
  };

  const scheduleInvalidation = (identity, filters) => {
    pendingInvalidations.set(identity, filters);

    if (batchTimer === null) {
      batchTimer = setTimeout(flushInvalidations, INVALIDATION_BATCH_MS);
    }
  };

  // Invalidates every query whose key starts with the given key.
  const invalidateKey = (queryKey) => {
    scheduleInvalidation(JSON.stringify(queryKey), { queryKey });
  };

  // Invalidates queries such as ["return", id] regardless of whether the id
  // was stored as a number or as a string taken from the URL.
  const invalidateEntity = (root, id) => {
    if (id === undefined || id === null) return;

    scheduleInvalidation(`${root}:${id}`, {
      predicate: (query) =>
        query.queryKey[0] === root && isSameId(query.queryKey[1], id),
    });
  };

  const scheduleDashboardRefresh = () => {
    clearTimeout(dashboardTimer);

    dashboardTimer = setTimeout(() => {
      dashboardTimer = null;
      invalidateKey(QUERY_KEYS.DASHBOARD_SUMMARY);
      invalidateKey(["adminDashboard"]);
    }, DASHBOARD_REFRESH_DEBOUNCE_MS);
  };

  // ----------------------------------------------------------
  // Admin alert de-duplication
  // ----------------------------------------------------------
  // The backend also creates a regular notification for the same occurrence
  // an admin alert describes. Remembering which records were just announced
  // lets the matching notification skip its toast, so the admin sees one
  // message instead of two.
  const recentAdminAlerts = new Map();

  const rememberAdminAlert = (kind, data) => {
    const now = Date.now();

    recentAdminAlerts.forEach((timestamp, key) => {
      if (now - timestamp > ADMIN_ALERT_MEMORY_MS) {
        recentAdminAlerts.delete(key);
      }
    });

    [data.id, data.order_number].forEach((value) => {
      if (value !== undefined && value !== null && value !== "") {
        recentAdminAlerts.set(`${kind}:${value}`, now);
      }
    });
  };

  const wasRecentlyAnnounced = (notification) => {
    const { reference_type: kind, reference_id: referenceId } = notification;
    if (!kind || referenceId === undefined || referenceId === null) {
      return false;
    }

    const timestamp = recentAdminAlerts.get(`${kind}:${referenceId}`);
    return (
      timestamp !== undefined && Date.now() - timestamp <= ADMIN_ALERT_MEMORY_MS
    );
  };

  // ----------------------------------------------------------
  // Event handlers
  // ----------------------------------------------------------

  const patchRoots = (roots, update, stats) => {
    roots.forEach((root) => {
      queryClient.setQueriesData({ queryKey: root }, (previous) => {
        if (previous === undefined) return undefined;

        const patched = patchProductTree(previous, update, stats);

        // Returning undefined tells React Query to leave the entry as is.
        return patched === previous ? undefined : patched;
      });
    });
  };

  // Marks the cached backend pages that match the predicate as stale without
  // refetching them. The list queries that are refetched afterwards then
  // read fresh pages instead of the cached ones.
  const markProductPagesStale = (matchesQuery) => {
    queryClient.invalidateQueries({
      predicate: (query) => isProductPageQuery(query) && matchesQuery(query),
      refetchType: "none",
    });
  };

  // Refetches the product lists on screen that match the predicate, and marks
  // the matching lists that are not on screen as stale.
  const refreshProductLists = (identity, matchesQuery) => {
    markProductPagesStale(matchesQuery);

    scheduleInvalidation(identity, {
      predicate: (query) => isProductListQuery(query) && matchesQuery(query),
    });
  };

  // Keeps the customer product lists consistent when a product is created or
  // moves between categories.
  const syncProductListMembership = (update) => {
    const currentCategoryId = update.category_id;
    const previousCategoryId = update.previous_category_id;

    // A new product can appear in any list, so every list is refreshed.
    if (update.created === true) {
      refreshProductLists("product-lists:all", () => true);
      return;
    }

    // A product that now belongs to a category shown in a list is fetched
    // again so it appears with its complete data and in the right position.
    if (hasValue(currentCategoryId)) {
      refreshProductLists(
        `product-lists:category:${currentCategoryId}`,
        (query) => queryHasCategory(query, currentCategoryId),
      );
    }

    // A product that left a category is removed from the lists of that
    // category. Lists that also show its new category keep it, because
    // they are refetched above.
    if (
      hasValue(previousCategoryId) &&
      !isSameId(previousCategoryId, currentCategoryId)
    ) {
      const leftCategory = (query) =>
        queryHasCategory(query, previousCategoryId) &&
        !queryHasCategory(query, currentCategoryId);

      queryClient.setQueriesData(
        {
          predicate: (query) =>
            isProductListQuery(query) && leftCategory(query),
        },
        (previous) => {
          const next = removeProductFromList(previous, update.id);

          // Returning undefined tells React Query to leave the entry as is.
          return next === previous ? undefined : next;
        },
      );

      markProductPagesStale(leftCategory);
    }
  };

  const handleProductUpdate = (update) => {
    if (update.id === undefined || update.id === null) return;

    const customerStats = { found: false };
    const adminStats = { found: false };
    const cartStats = { found: false };
    const wishlistStats = { found: false };

    patchRoots(CUSTOMER_PRODUCT_ROOTS, update, customerStats);
    patchRoots(ADMIN_PRODUCT_ROOTS, update, adminStats);
    patchRoots([CART_ROOT], update, cartStats);
    patchRoots([WISHLIST_ROOT], update, wishlistStats);

    const isNoLongerPurchasable =
      update.is_delete === true || update.is_active === false;

    // Hidden or deleted products must disappear from the lists that are
    // known to contain them, and the list totals must be recalculated.
    if (isNoLongerPurchasable && customerStats.found) {
      invalidateKey(QUERY_KEYS.PRODUCTS);
      invalidateKey(["products-list"]);
      invalidateKey(["products-backend-page"]);
    }

    if (update.is_delete === true && adminStats.found) {
      ADMIN_PRODUCT_ROOTS.forEach(invalidateKey);
    }

    // Cart lines and totals are derived from product prices on the server.
    if (cartStats.found) {
      invalidateKey(CART_ROOT);
    }

    syncProductListMembership(update);
  };

  const refreshOrderViews = (order) => {
    const orderNumber = order.order_number;

    if (orderNumber) {
      invalidateKey(QUERY_KEYS.ORDER_DETAIL(orderNumber));
      invalidateKey(QUERY_KEYS.ORDER_TRACKING(orderNumber));
      invalidateKey(["orderTracking", orderNumber]);
    }

    invalidateKey(QUERY_KEYS.MY_ORDERS);
    invalidateKey(QUERY_KEYS.MY_ORDER_STATS);
    invalidateKey(QUERY_KEYS.ADMIN_ORDERS);
    invalidateKey(["adminOrders"]);
    invalidateKey(QUERY_KEYS.QR_PAYMENTS);
  };

  const refreshPaymentViews = (payment) => {
    if (payment.order_number) {
      invalidateKey(QUERY_KEYS.ORDER_DETAIL(payment.order_number));
    }

    invalidateKey(QUERY_KEYS.MY_ORDERS);
    invalidateKey(["adminOrders"]);
    invalidateKey(QUERY_KEYS.QR_PAYMENTS);
  };

  const refreshReturnViews = (returnRequest) => {
    invalidateKey(QUERY_KEYS.RETURNS);
    invalidateEntity("return", returnRequest.id);

    if (returnRequest.order_number) {
      invalidateKey(QUERY_KEYS.ORDER_DETAIL(returnRequest.order_number));
    }

    // Approving a return restocks the products and refunds the payment,
    // which changes the order lists and totals, product stock and every
    // revenue and profit figure, so those views are refreshed as well.
    invalidateKey(QUERY_KEYS.MY_ORDERS);
    invalidateKey(QUERY_KEYS.MY_ORDER_STATS);
    invalidateKey(QUERY_KEYS.ADMIN_ORDERS);
    invalidateKey(["adminOrders"]);
    invalidateKey(QUERY_KEYS.PRODUCTS);
    invalidateKey(QUERY_KEYS.DASHBOARD_SUMMARY);
    invalidateKey(["salesReport"]);
    invalidateKey(["revenueReport"]);
    invalidateKey(["profitReport"]);
    invalidateKey(["productsPerformance"]);
    invalidateKey(["adminCustomers"]);
  };

  const refreshComplaintViews = (complaint) => {
    invalidateKey(QUERY_KEYS.COMPLAINTS);
    invalidateKey(QUERY_KEYS.OPEN_COMPLAINTS_COUNT);
    invalidateEntity("complaint", complaint.id);
  };

  const handlers = {
    product_update: handleProductUpdate,

    category_update: () => {
      invalidateKey(QUERY_KEYS.CATEGORIES);
    },

    order_update: refreshOrderViews,

    new_order: (order) => {
      refreshOrderViews(order);
      rememberAdminAlert("order", order);
      onAdminAlert?.("order", order);
    },

    payment_update: refreshPaymentViews,

    return_update: refreshReturnViews,

    new_return: (returnRequest) => {
      refreshReturnViews(returnRequest);
      rememberAdminAlert("return", returnRequest);
      onAdminAlert?.("return", returnRequest);
    },

    complaint_update: refreshComplaintViews,

    new_complaint: (complaint) => {
      refreshComplaintViews(complaint);
      rememberAdminAlert("complaint", complaint);
      onAdminAlert?.("complaint", complaint);
    },

    cart_update: () => {
      invalidateKey(CART_ROOT);
    },

    // A coupon changed on the server. The cart holds the applied coupon and
    // the discount, and the checkout total is derived from it, so refetching
    // the cart refreshes both the cart page and the checkout summary.
    coupon_update: () => {
      invalidateKey(CART_ROOT);
    },

    notification: (notification) => {
      invalidateKey(QUERY_KEYS.NOTIFICATIONS);

      if (!wasRecentlyAnnounced(notification)) {
        onNotification?.(notification);
      }
    },

    // The event carries no order totals or spending figures. Refetching the
    // customers queries (the list, the summary cards and any open customer
    // detail) returns the correct values from the server.
    customer_update: () => {
      invalidateKey(["adminCustomers"]);
    },

    dashboard_update: scheduleDashboardRefresh,
  };

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  // Entry point for every parsed socket message. Unknown event names are
  // ignored so newly added backend events never break the client.
  const handleEvent = (message) => {
    const handler = handlers[message?.event];
    if (!handler) return;

    const data = isPlainObject(message.data) ? message.data : {};
    handler(data);
  };

  // Events are not replayed after a disconnect, so everything currently on
  // screen is refetched once the connection is back.
  const refetchActiveQueries = () => {
    queryClient.invalidateQueries({ refetchType: "active" });
  };

  // Cancels every pending timer. Safe to call more than once.
  const dispose = () => {
    clearTimeout(batchTimer);
    clearTimeout(dashboardTimer);
    batchTimer = null;
    dashboardTimer = null;
    pendingInvalidations.clear();
  };

  return { handleEvent, refetchActiveQueries, dispose };
};

export default createLiveEventProcessor;
