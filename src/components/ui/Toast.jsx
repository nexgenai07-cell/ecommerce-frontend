// Toast notification helper functions
// Uses the react-hot-toast library under the hood
// Always import and use these functions throughout the project — never call toast() directly
// This ensures consistent styling and duration across all notifications

import toast from "react-hot-toast";
// Importing the base toast instance from react-hot-toast library

// --- SUCCESS TOAST ---
// Green themed — used for positive confirmations like "Added to cart" or "Order placed"
export const showSuccess = (message) => {
  toast.success(message, {
    duration: 3000,
    // Auto-dismisses after 3 seconds — success messages don't need to linger long

    style: {
      background: "#ecfdf5", // Light emerald green background
      color: "#065f46", // Deep dark green text for high contrast
      border: "1px solid #a7f3d0", // Soft green border to frame the toast
      fontSize: "14px", // Consistent with the rest of the UI text size
      fontWeight: "500", // Medium weight — readable without being too heavy
      borderRadius: "8px", // Rounded corners matching the design system
      padding: "12px 16px", // Comfortable internal spacing around the message
    },

    iconTheme: {
      primary: "#10b981", // Emerald green checkmark icon color
      secondary: "#ecfdf5", // Icon background matches the toast background
    },
  });
};

// --- ERROR TOAST ---
// Red themed — used for failures like "Login failed" or "Something went wrong"
export const showError = (message) => {
  toast.error(message, {
    duration: 4000,
    // Stays 1 second longer than success — errors need more time to be read and understood

    style: {
      background: "#fef2f2", // Light red background
      color: "#991b1b", // Deep dark red text for strong contrast
      border: "1px solid #fecaca", // Soft red border to frame the toast
      fontSize: "14px", // Consistent with the rest of the UI text size
      fontWeight: "500", // Medium weight for comfortable readability
      borderRadius: "8px", // Rounded corners matching the design system
      padding: "12px 16px", // Comfortable internal spacing around the message
    },

    iconTheme: {
      primary: "#ef4444", // Bright red cross icon color
      secondary: "#fef2f2", // Icon background matches the toast background
    },
  });
};

// --- WARNING TOAST ---
// Yellow themed — used for caution messages like "Low stock remaining"
export const showWarning = (message) => {
  toast(message, {
    // Uses base toast() not toast.warning() — react-hot-toast has no built-in warning type
    duration: 3000,
    // Same duration as success — warnings are informational, not critical

    icon: "⚠️",
    // Emoji icon used since react-hot-toast has no native warning icon type

    style: {
      background: "#fffbeb", // Light amber/yellow background
      color: "#92400e", // Deep dark amber text for contrast
      border: "1px solid #fde68a", // Soft yellow border to frame the toast
      fontSize: "14px", // Consistent with the rest of the UI text size
      fontWeight: "500", // Medium weight for comfortable readability
      borderRadius: "8px", // Rounded corners matching the design system
      padding: "12px 16px", // Comfortable internal spacing around the message
    },
  });
};

// --- INFO TOAST ---
// Blue themed — used for neutral updates like "Your order has been shipped"
export const showInfo = (message) => {
  toast(message, {
    // Uses base toast() — react-hot-toast has no built-in info type
    duration: 3000,
    // Same duration as success and warning

    icon: "ℹ️",
    // Emoji icon used since react-hot-toast has no native info icon type

    style: {
      background: "#eff6ff", // Light blue background
      color: "#1e40af", // Deep dark blue text for strong contrast
      border: "1px solid #bfdbfe", // Soft blue border to frame the toast
      fontSize: "14px", // Consistent with the rest of the UI text size
      fontWeight: "500", // Medium weight for comfortable readability
      borderRadius: "8px", // Rounded corners matching the design system
      padding: "12px 16px", // Comfortable internal spacing around the message
    },
  });
};

// --- LOADING TOAST ---
// Gray themed — shown while an async operation is in progress (e.g. API call running)
// Returns the toast id so it can be dismissed later once the operation completes
export const showLoading = (message) => {
  return toast.loading(message, {
    // toast.loading() shows a spinner icon and keeps the toast until manually dismissed
    // The returned id must be saved and passed to dismissToast() when done

    style: {
      background: "#f9fafb", // Very light gray background
      color: "#374151", // Dark gray text for neutral, non-alarming appearance
      border: "1px solid #e5e7eb", // Subtle gray border to frame the toast
      fontSize: "14px", // Consistent with the rest of the UI text size
      fontWeight: "500", // Medium weight for comfortable readability
      borderRadius: "8px", // Rounded corners matching the design system
      padding: "12px 16px", // Comfortable internal spacing around the message
    },
  });
};

// --- DISMISS TOAST ---
// Programmatically removes a specific toast by its id
// Always call this after showLoading() resolves — otherwise the spinner stays forever
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
  // Immediately removes the toast matching the given id from the screen
  // Typically called after an API call succeeds or fails, followed by showSuccess/showError
};
