/**
 * App configuration constants
 */

// API URL - set in .env file
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// Supabase config - set in .env file
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Expense categories with colors for UI
export const EXPENSE_CATEGORIES = {
  Meals: { color: "#4CAF50", icon: "restaurant" },
  Transportation: { color: "#2196F3", icon: "car" },
  "Office Supplies": { color: "#9C27B0", icon: "briefcase" },
  Entertainment: { color: "#FF9800", icon: "film" },
  Lodging: { color: "#795548", icon: "bed" },
  Other: { color: "#607D8B", icon: "ellipsis-horizontal" },
} as const;

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
};

// App theme colors
export const COLORS = {
  primary: "#366092",
  primaryDark: "#1a4570",
  secondary: "#4CAF50",
  background: "#f5f5f5",
  surface: "#ffffff",
  text: "#333333",
  textSecondary: "#666666",
  border: "#e0e0e0",
  error: "#f44336",
  success: "#4CAF50",
  warning: "#FF9800",
};
