/**
 * TypeScript types for PayMeJunior mobile app
 */

// Expense categories matching SAP Concur
export type ExpenseCategory =
  | "Meals"
  | "Transportation"
  | "Office Supplies"
  | "Entertainment"
  | "Lodging"
  | "Other";

// Individual expense
export interface Expense {
  id: string;
  report_id: string;
  date: string;
  merchant: string;
  description?: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  payment_type: string;
  city?: string;
  items?: string;
  receipt_path?: string;
  created_at: string;
}

// Expense report (group of expenses)
export interface ExpenseReport {
  id: string;
  name: string;
  created_at: string;
  total_expenses: number;
}

// Processing result from API
export interface ProcessingResult {
  report_id: string;
  report_name: string;
  expenses: Expense[];
  failed_receipts: FailedReceipt[];
  summary: ProcessingSummary;
}

export interface FailedReceipt {
  filename: string;
  error: string;
}

export interface ProcessingSummary {
  total: number;
  successful: number;
  failed: number;
}

// Summary data
export interface ExpenseSummary {
  by_category: Record<string, { count: number; total: number }>;
  by_currency: Record<string, { count: number; total: number }>;
  grand_totals: {
    total_expenses: number;
    currencies: string[];
  };
}

// Selected image from picker
export interface SelectedImage {
  uri: string;
  fileName: string;
  type: string;
  fileSize?: number;
}

// App state for Zustand store
export interface AppState {
  // Current report
  currentReport: ExpenseReport | null;
  expenses: Expense[];

  // Processing state
  isProcessing: boolean;
  processingProgress: {
    current: number;
    total: number;
  };

  // Selected images for processing
  selectedImages: SelectedImage[];

  // Actions
  setCurrentReport: (report: ExpenseReport | null) => void;
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  clearExpenses: () => void;

  setProcessing: (isProcessing: boolean) => void;
  setProgress: (current: number, total: number) => void;

  setSelectedImages: (images: SelectedImage[]) => void;
  clearSelectedImages: () => void;

  reset: () => void;
}
