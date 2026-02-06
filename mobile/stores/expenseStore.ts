/**
 * Zustand store for app state management
 */
import { create } from "zustand";
import type { AppState, Expense, ExpenseReport, SelectedImage } from "@/types";

const initialState = {
  currentReport: null as ExpenseReport | null,
  expenses: [] as Expense[],
  isProcessing: false,
  processingProgress: { current: 0, total: 0 },
  selectedImages: [] as SelectedImage[],
};

export const useExpenseStore = create<AppState>((set, get) => ({
  ...initialState,

  // Report actions
  setCurrentReport: (report) => set({ currentReport: report }),

  // Expense actions
  setExpenses: (expenses) => set({ expenses }),

  addExpense: (expense) =>
    set((state) => ({ expenses: [...state.expenses, expense] })),

  updateExpense: (id, updates) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  deleteExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),

  clearExpenses: () => set({ expenses: [] }),

  // Processing state
  setProcessing: (isProcessing) => set({ isProcessing }),

  setProgress: (current, total) =>
    set({ processingProgress: { current, total } }),

  // Image selection
  setSelectedImages: (images) => set({ selectedImages: images }),

  clearSelectedImages: () => set({ selectedImages: [] }),

  // Reset all state
  reset: () => set(initialState),
}));

export default useExpenseStore;
