/**
 * API client for communicating with Railway backend
 */
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_URL } from "@/constants/config";
import type {
  Expense,
  ExpenseReport,
  ExpenseSummary,
  ProcessingResult,
  SelectedImage,
} from "@/types";

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 120000, // 2 minutes for processing
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Process multiple receipt images
 */
export async function processReceipts(
  images: SelectedImage[],
  reportName: string = "Expense Report"
): Promise<ProcessingResult> {
  const formData = new FormData();

  // Add images to form data
  for (const image of images) {
    const fileInfo = await FileSystem.getInfoAsync(image.uri);
    if (fileInfo.exists) {
      formData.append("files", {
        uri: image.uri,
        name: image.fileName,
        type: image.type,
      } as any);
    }
  }

  formData.append("report_name", reportName);

  const response = await api.post<ProcessingResult>("/receipts/process", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

/**
 * Process a single receipt image
 */
export async function processSingleReceipt(
  image: SelectedImage,
  reportId: string
): Promise<Expense> {
  const formData = new FormData();

  formData.append("file", {
    uri: image.uri,
    name: image.fileName,
    type: image.type,
  } as any);
  formData.append("report_id", reportId);

  const response = await api.post("/receipts/process-single", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.expense;
}

/**
 * Get all expense reports
 */
export async function getReports(): Promise<ExpenseReport[]> {
  const response = await api.get<{ reports: ExpenseReport[] }>("/reports");
  return response.data.reports;
}

/**
 * Create a new expense report
 */
export async function createReport(name: string): Promise<ExpenseReport> {
  const response = await api.post<ExpenseReport>("/reports", { name });
  return response.data;
}

/**
 * Get a specific report
 */
export async function getReport(reportId: string): Promise<ExpenseReport> {
  const response = await api.get<ExpenseReport>(`/reports/${reportId}`);
  return response.data;
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  await api.delete(`/reports/${reportId}`);
}

/**
 * Get expenses for a report
 */
export async function getReportExpenses(reportId: string): Promise<{
  expenses: Expense[];
  report_name: string;
}> {
  const response = await api.get(`/reports/${reportId}/expenses`);
  return response.data;
}

/**
 * Get report summary
 */
export async function getReportSummary(reportId: string): Promise<ExpenseSummary> {
  const response = await api.get<ExpenseSummary>(`/reports/${reportId}/summary`);
  return response.data;
}

/**
 * Download Excel report
 */
export async function downloadExcel(
  reportId: string,
  reportName: string = "expense_report"
): Promise<string> {
  // Get Excel file as arraybuffer
  const response = await api.post(
    `/reports/${reportId}/excel`,
    { report_name: reportName },
    { responseType: "arraybuffer" }
  );

  // Convert to base64
  const base64 = btoa(
    new Uint8Array(response.data).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

  // Save to document directory
  const filename = `${reportName.replace(/\s+/g, "_")}.xlsx`;
  const fileUri = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Open share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Save Expense Report",
    });
  }

  return fileUri;
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  updates: Partial<Expense>
): Promise<Expense> {
  const response = await api.patch<Expense>(`/reports/expenses/${expenseId}`, updates);
  return response.data;
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  await api.delete(`/reports/expenses/${expenseId}`);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await api.get("/health");
    return response.data.status === "healthy";
  } catch {
    return false;
  }
}

export default api;
