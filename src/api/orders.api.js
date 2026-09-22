// ORDERS API MODULE
// ============================================================
// This file contains ALL API calls related to the Orders module.
// It covers endpoints needed by BOTH customers (placing orders,
// viewing their own order history, tracking, cancelling, requesting
// returns) AND admins (viewing/filtering all orders, updating
// order status, adding tracking info).
//
// These functions are designed to be used as query/mutation functions
// inside TanStack Query (React Query) hooks throughout the app.
//
// Order objects returned by the customer endpoints (checkout, list,
// detail, cancel) and by the admin detail/status endpoints include two
// booleans, can_cancel and can_track. They are the source of truth for
// whether the Cancel Order and Track Order actions are available, so
// the UI reads them instead of deriving the answer from the status text.

import axiosInstance from "../lib/axiosInstance";
// Importing the pre-configured Axios instance, which automatically
// attaches the base URL, auth token, and handles 401 errors globally.

// ----------------------------
// Convert the cart into an actual order (Checkout)
// ----------------------------
// Called when the customer completes the checkout process.
// This takes everything in their current cart and turns it into
// a real order with status "pending_payment". The "data" payload
// is expected to include:
// - address_id: which saved Address Book entry to ship to (optional —
//   backend falls back to whichever saved address is currently
//   marked is_default if omitted; still 400s if neither exists)
// - payment_method: "stripe" | "qr" (required)
// - notes: any special instructions from the customer
// - province: only needed when the address is typed manually instead
//   of being picked from the Address Book. The backend then checks
//   that the city belongs to the selected province and answers with a
//   400 under the "province" key when it does not. Checkout with a
//   saved address never needs it.
//
// Response differs by payment_method:
// - "stripe": call createPaymentIntent() (payments.api.js)
//   immediately after, with the returned order_number, to start the
//   Stripe payment.
// - "qr": the response ALSO includes qr_image_url (a static,
//   config-driven QR image) and payment_reference (the order_number,
//   to write in the transfer note) — no Stripe call needed at all.
//   payment.status starts as "pending" until the customer uploads
//   proof via uploadQrProof() (payments.api.js).
//
// On success, the cart is cleared server-side automatically, so we
// also clear it from Redux state on the frontend.
//
// Address resolution order: address_id first, then the address fields
// typed on this request, then the customer's default saved address.
// When address_id is sent, the backend uses that saved address exactly
// as it is stored (address, city, postal code and phone) and ignores any
// address or phone typed on the same request.
//
// Coupon re-check: a coupon already attached to the cart is validated
// again when the order is placed (still active, inside its dates, and
// the subtotal still reaches its minimum order amount). If it is no
// longer valid, no order is created; the coupon is removed from the cart
// and the request fails with 400 and a body of the form
// { error: "<reason>", coupon_removed: true }. The caller must show the
// error, refetch the cart to display the real total and let the
// customer place the order again — never retry automatically.
export const checkout = (data, signal) => {
  return axiosInstance.post("/api/v1/orders/checkout/", data, { signal });
};

// ----------------------------
// Request the Order Confirmation OTP
// ----------------------------
// Sends a 6-digit Order Confirmation OTP to the logged-in customer's
// registered account email (never to an address typed on the checkout
// page). The OTP is valid for 10 minutes and can be requested again at
// most once every 60 seconds. Verification is permanent per account:
// once a customer has confirmed an OTP successfully, this endpoint
// sends no email and answers { already_verified: true }, and checkout()
// no longer needs a fresh OTP for any later order.
//
// No request body. Success response includes a masked confirmation
// message (e.g. "An order confirmation OTP has been sent to
// ab***@gmail.com.") and expires_in_minutes — how long the OTP itself
// stays valid. Decide what to do from already_verified and the HTTP
// status, never from the wording of the message.
//
// Possible errors:
// - 400: the account has no email on file to send the code to
// - 429: another code was requested too recently; the response
//   includes retry_after_seconds, the number of seconds to wait
//   before this can be called again
// - 502: the email could not be sent
export const sendCheckoutOtp = (signal) => {
  return axiosInstance.post("/api/v1/orders/checkout/send-otp/", undefined, {
    signal,
  });
};

// ----------------------------
// Verify the Order Confirmation OTP
// ----------------------------
// Confirms the OTP sent by sendCheckoutOtp() above. On success, the
// customer is verified permanently for this account: the response
// carries already_verified: true, and checkout() can be called for this
// order and for every later order without asking for another OTP.
//
// data: { otp: "123456" }
//
// Every failure comes back as 400 Bad Request, with the reason under
// an "error" key: the OTP is missing from the request, none was ever
// requested, it has expired, or it doesn't match.
export const verifyCheckoutOtp = (data, signal) => {
  return axiosInstance.post("/api/v1/orders/checkout/verify-otp/", data, {
    signal,
  });
};

// ----------------------------
// Get the logged-in customer's own orders
// ----------------------------
// Fetches orders placed by the currently logged-in customer. Used on
// the "My Orders" page in the customer account section.
//
// Query params:
// - status: pending, confirmed, shipped, delivered or cancelled
// - start_date / end_date: "YYYY-MM-DD". start_date may equal end_date
//   but can never be later than it; an invalid range or a malformed
//   date is answered with a 400 and an "error" message.
// - page: which page of results to fetch
//
// Every order in the list carries can_cancel and can_track.
//
// OrderHistory.jsx fetches every page so the customer's complete order
// history is always shown, which keeps its status-tab counts and
// date-range filtering accurate across every tab at once.
export const getMyOrders = (params, signal) => {
  return axiosInstance.get("/api/v1/orders/", { signal, params });
};

// ----------------------------
// Get the logged-in customer's own order stats
// ----------------------------
// Returns exactly two numbers for the current customer: total_orders
// and total_spent.
// - total_orders counts EVERY order the customer has placed, whatever
//   its status (pending_payment, on_hold, confirmed, shipped,
//   out_for_delivery, delivered and cancelled).
// - total_spent adds up only the orders whose status is confirmed,
//   shipped, out_for_delivery or delivered; pending_payment, on_hold
//   and cancelled orders never count, even a cancelled order that was
//   paid and later refunded.
// Both numbers are summed across all of the customer's own store
// profiles, so total_orders can legitimately be higher than the number
// of orders that make up total_spent.
//
// No request body/params. Response shape:
//   { total_orders: number, total_spent: string }
// total_spent always comes back as a string (e.g. "0.00" for a
// customer with no qualifying orders yet) — parse it with
// parseFloat()/Number() before formatting for display.
//
// This is the ONLY correct source for the customer account
// dashboard's "Total Orders" / "Total Spent" cards — see
// AccountDashboard.jsx. Do NOT rebuild these numbers on the frontend
// by counting or summing getMyOrders() above: the backend owns the
// counting rules, and a client-side sum of that list would apply
// different ones.
export const getMyOrderStats = (signal) => {
  return axiosInstance.get("/api/v1/orders/stats/", { signal });
};

// ----------------------------
// Get full details of a specific order (CUSTOMER-OWNED ONLY)
// ----------------------------
// Fetches everything about one specific order, identified by its
// order number — including the items ordered, payment details,
// and shipping information. Used on the CUSTOMER's own order detail
// page ("/account/orders/:id").
//
// This endpoint only returns an order if it belongs to the currently
// logged-in user — the backend returns a 404 for any order that exists
// but isn't owned by the requester, even if that requester is an admin.
// Use getAdminOrderDetail() below for the admin order detail page.
//
// The returned order carries can_cancel and can_track. For a QR order
// the payment object also includes qr_rejection_count (0 when the proof
// has never been rejected). After the 1st or 2nd rejection the order
// stays "pending_payment" with payment.status "rejected" so the
// customer can upload a new proof; after the 3rd rejection it becomes
// "cancelled" for good.
export const getOrderDetail = (orderNumber, signal) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/`, { signal });
  // Template literal inserts the "orderNumber" directly into the URL path
};

// ----------------------------
// Cancel a customer's own order
// ----------------------------
// Allows the customer to cancel an order, identified by its order
// number. Cancellation is only possible while the order is
// "pending_payment", "on_hold" or "confirmed"; the same rule is exposed
// to the UI through the can_cancel flag on the order.
//
// data.reason is entirely optional — sending no body at all (or
// data with no reason) works too. When provided, it's just a free-text
// string for the customer's own context; it does not change how the
// cancellation itself is handled.
//
// The backend also enforces the rule with a specific 400 message per
// status (e.g. "This order has already been shipped and can no longer
// be cancelled."), returned under an "error" key. On success the
// returned order has status "cancelled" with can_cancel and can_track
// both false.
export const cancelOrder = (orderNumber, data, signal) => {
  return axiosInstance.put(`/api/v1/orders/${orderNumber}/cancel/`, data, {
    signal,
  });
};

// ----------------------------
// Track an order's status history
// ----------------------------
// Fetches the tracking timeline/history for a specific order
// (e.g. "Order Placed" -> "Confirmed" -> "Shipped" -> "Delivered"),
// identified by its order number. Used on the order tracking page.
//
// A customer requesting a cancelled order gets a 400 with an "error"
// message, so this must not be called for an order whose can_track
// flag is false. Admin users can still look up any order.
export const trackOrder = (orderNumber, signal) => {
  return axiosInstance.get(`/api/v1/orders/${orderNumber}/track/`, { signal });
};

// ----------------------------
// Get all orders from all customers (Admin only)
// ----------------------------
// Fetches orders across the ENTIRE store (not just one customer's
// orders). Used in the admin panel's orders management page when no
// status/search/date filter is active.
//
// The "params" object supports standard list-endpoint query params —
// "page" (which page of results to fetch), "page_size" (rows per
// page; server default is 10, capped at 100), and "ordering" (sort
// field, e.g. "-created_at"). The response follows the standard
// paginated shape: { count, next, previous, results }.
export const getAdminOrders = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/orders/", { signal, params });
};

// ----------------------------
// Filter admin orders (Admin only)
// ----------------------------
// Allows admins to narrow down the orders list using various filters.
// The "params" object can include:
// - status: filter by order status (e.g. pending, shipped, delivered);
//   "pending" is accepted as an alias for "pending_payment"
// - start_date / end_date: filter orders within a date range
//   ("YYYY-MM-DD"). start_date may equal end_date but can never be
//   later than it; an invalid range or a malformed date is answered
//   with a 400 and an "error" message.
// - search: search by customer name, order number, and phone number
//   (both the number saved on the customer's profile and the
//   contact_phone entered at checkout)
// - customer_id: returns only orders placed by that exact customer
//   (see getCustomerOrders below)
// - product: partial, case-insensitive match against any product
//   name inside the order (across every line item)
// - category: same matching behavior, against the category name of
//   any product inside the order
// - ordering: sort field, e.g. "-created_at", "created_at",
//   "-total_amount", "total_amount"
// - page: which page of results to fetch
// - page_size: rows per page; server default is 10, capped at 100
//
// All filters combine in the same request, and an order is never
// duplicated in the results even if it contains multiple items
// matching product/category.
export const filterAdminOrders = (params, signal) => {
  return axiosInstance.get("/api/v1/admin/orders/filter/", { signal, params });
  // Passing "params" as the second argument tells Axios to automatically
  // convert this object into URL query parameters
};

// ----------------------------
// Get every order placed by ONE specific customer (Admin only)
// ----------------------------
// Used on the admin Customers page, inside the customer detail
// drawer, to show that exact customer's order history.
//
// `params` can additionally include status / search / ordering / page /
// page_size — all of which combine correctly with customer_id on the
// backend, e.g.:
//   getCustomerOrders(20, { status: "delivered", ordering: "-total_amount", page: 2, page_size: 20 })
// `ordering` is applied server-side, so a customer's full order history
// sorts as a whole instead of only re-sorting whichever single page
// happens to be loaded (see CustomerDetailDrawer.jsx).
export const getCustomerOrders = (customerId, params = {}, signal) => {
  return filterAdminOrders({ ...params, customer_id: customerId }, signal);
  // Reuses filterAdminOrders so both functions always stay in sync —
  // this is just filterAdminOrders with customer_id always included
};

// ----------------------------
// Get full details of ANY order (Admin only)
// ----------------------------
// Returns full order details for ANY order in the store, regardless of
// who placed it, as long as the requester has the admin role. It
// matches the same "/admin/..." prefix convention used by
// getAdminOrders() and filterAdminOrders() above.
//
// Used ONLY on the admin order detail page ("/admin/orders/:id") —
// the customer-facing page uses getOrderDetail() instead. The payment
// object includes qr_rejection_count for QR orders, so the admin can
// see how many times the proof has been rejected.
export const getAdminOrderDetail = (orderNumber, signal) => {
  return axiosInstance.get(`/api/v1/admin/orders/${orderNumber}/`, { signal });
};

// ----------------------------
// Update an order's status (Admin only)
// ----------------------------
// Allows admins to move an order forward in its lifecycle
// (e.g. from "confirmed" to "shipped") and optionally attach a
// tracking number for the customer to follow. The "data" payload
// is expected to include:
// - status: the new status to set for this order
// - tracking_number: the courier/shipping tracking number (if applicable)
// - cancellation_reason: required whenever status is "cancelled" — its
//   exact text is included in the customer's cancellation notification
// - refund_method / refund_transaction_reference: only for cancelling
//   an order that was PAID via QR. refund_method is always "manual" in
//   that case (no live gateway exists to refund automatically) and
//   refund_transaction_reference is mandatory. For a Stripe order, or
//   a QR order whose payment was never approved, omit both — nothing
//   needs a manual refund.
//
// Rules enforced by the backend (see AdminOrderDetail.jsx's
// getStatusOptions, which builds the status dropdown from them):
// 1) The status sequence is strictly forward-only: pending_payment
//    -> confirmed -> shipped -> out_for_delivery -> delivered. Any
//    backward move is rejected, even if paid.
// 2) "confirmed" and every status after it require payment.status
//    "paid".
// 3) Once payment.status is "paid", the status can never move back to
//    "pending_payment".
// 4) A delivered order and a cancelled order are final: any status
//    change on them is refused.
// 5) Once payment.status is "refunded", no further status change is
//    allowed.
// 6) A rejected QR payment does not lock the order by itself: an order
//    that is "pending_payment" with payment.status "rejected" can
//    still be cancelled (a cancellation_reason is still required).
// 7) When status is "shipped" with a tracking_number in the same
//    request, the customer's notification includes it.
//
// Errors come back as 400 with the reason under an "error" key, e.g.
// "Please approve payment first." or "This order has been cancelled —
// its status is final and cannot be changed.". The returned order
// object carries can_cancel and can_track.
export const updateOrderStatus = (orderNumber, data, signal) => {
  return axiosInstance.put(
    `/api/v1/admin/orders/${orderNumber}/status/`,
    data,
    { signal },
  );
};

// ----------------------------
// API 63.2 - Update the status of multiple orders in one request (Admin only)
// ----------------------------
// Moves several orders to the same target status in a single call.
// Replaces the old pattern of calling updateOrderStatus() once per
// selected row — each order in the batch still goes through the exact
// same rules as updateOrderStatus() (forward-only sequence, payment
// checks, delivered/cancelled orders are final), independently of the
// others, so one order failing never blocks the rest of the batch.
//
// orderNumbers — a non-empty array of order numbers, maximum 100 per
// call. A selection larger than 100 rows must be split into batches
// of 100 and sent as separate calls (see chunkArray in
// utils/chunkArray.js).
// status — the target status to apply to every selected order.
// cancellationReason — required only when status is "cancelled"; the
// same reason is applied to every selected order in the batch.
//
// Tracking numbers are not supported here — a single tracking number
// cannot belong to more than one order, so that field stays on the
// per-order Update Order Status call on the Order Detail page.
//
// The response is always 200 OK for a well-formed request, even if
// some orders could not be updated, so the result must be read from
// the response body rather than the HTTP status:
//   updated_ids — order numbers that were updated successfully
//   missing_ids — order numbers that no longer exist, or are stale in
//                 the current selection; these should be dropped from
//                 the table and the selection quietly, without an error
//   failed      — orders that exist but were not allowed to make this
//                 move (for example already delivered, unpaid, or a
//                 backward transition); each entry is { id, error }
//   message     — a ready-made summary sentence, suitable for a toast
//   results     — one small object per updated order, e.g. its new
//                 status
//
// A 400 response means the request itself was invalid (empty ids,
// invalid order numbers, more than 100 ids, an invalid status, or a
// missing cancellation reason while cancelling) and nothing was
// processed.
export const bulkUpdateOrderStatus = (
  orderNumbers,
  status,
  cancellationReason,
  signal,
) => {
  return axiosInstance.post(
    "/api/v1/admin/orders/bulk-status/",
    {
      order_numbers: orderNumbers,
      status,
      ...(status === "cancelled"
        ? { cancellation_reason: cancellationReason }
        : {}),
    },
    { signal },
  );
};

// ----------------------------
// Request a return for a delivered order
// ----------------------------
// Allows the customer to request a return for an order that has
// already been delivered. The "data" payload is expected to include:
// - reason: why the customer wants to return the order/item
//
// Only delivered orders are eligible, and a new request is refused
// while the order already has a pending or approved return. A new
// return starts with status "pending".
export const requestReturn = (orderNumber, data, signal) => {
  return axiosInstance.post(`/api/v1/orders/${orderNumber}/return/`, data, {
    signal,
  });
};
