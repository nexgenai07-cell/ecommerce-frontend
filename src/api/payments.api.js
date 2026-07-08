// ============================================================
// PAYMENTS API MODULE — Stripe Integration
// ============================================================
// Is file mein sirf Stripe payment ke API calls hain.
// COD / Easypaisa / manual card ka koi bhi reference ab is project
// mein nahi hai — sab payments Stripe (Test Mode) ke through hote hain.

import axiosInstance from "../lib/axiosInstance";

// ----------------------------
// API 69 - Create Stripe Payment Intent
// ----------------------------
// Checkout (API 52) ke turant baad call hoti hai. Order banne ke baad
// jo order_number milta hai, wahi is API ko bhejte hain.
// Backend Stripe par ek PaymentIntent bana kar wapas bhejta hai:
// - client_secret        -> Stripe Elements ko is se hi payment form render/confirm karna hai
// - publishable_key      -> Stripe.js ko initialize karne ke liye (kabhi bhi frontend mein
//                           hardcode nahi karni — hamesha yahi response se lena hai, taake
//                           test/live switch par frontend code na badalna pare)
// - amount, currency     -> confirmation/logging ke liye
// - order_number         -> jis order ke liye ye intent bana hai
export const createPaymentIntent = (data) => {
  // data = { order_number: "ORD-2024-00001" }
  return axiosInstance.post("/api/v1/payments/create-intent/", data);
};

// ----------------------------
// Note: API 70 (Stripe Webhook) frontend se kabhi call nahi hoti.
// Wo sirf Stripe server khud call karta hai backend ko — isliye
// yahan is file mein uska koi function nahi hai.
// ----------------------------
