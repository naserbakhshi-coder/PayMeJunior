/**
 * API client for communicating with Railway backend
 */
import * as Sharing from "expo-sharing";
import { API_URL } from "@/constants/config";
import type {
  Expense,
  ExpenseReport,
  ExpenseSummary,
  ProcessingResult,
  SelectedImage,
} from "@/types";

const BASE_URL = `${API_URL}/api/v1`;

/**
 * Convert image URI to base64 using XMLHttpRequest (more reliable in React Native)
 */
async function uriToBase64(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      const reader = new FileReader();
      reader.onloadend = function () {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Failed to extract base64 data"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = () => reject(new Error("XHR error loading image"));
    xhr.open("GET", uri);
    xhr.responseType = "blob";
    xhr.send();
  });
}

/**
 * Process multiple receipt images
 */
export async function processReceipts(
  images: SelectedImage[],
  reportName: string = "Expense Report"
): Promise<ProcessingResult> {
  // Read the first image as base64 and send via JSON
  const image = images[0];
  const base64 = await uriToBase64(image.uri);

  const response = await fetch(`${BASE_URL}/receipts/process-base64`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      report_name: reportName,
      images: [{
        data: base64,
        filename: image.fileName || "receipt.jpg",
        content_type: image.type || "image/jpeg",
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    throw new Error(`Failed to process receipt: ${response.status}`);
  }

  const result: ProcessingResult = await response.json();

  // Process remaining images
  for (let i = 1; i < images.length; i++) {
    const img = images[i];
    try {
      const imgBase64 = await uriToBase64(img.uri);

      const resp = await fetch(`${BASE_URL}/receipts/process-base64-single`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_id: result.report_id,
          image: {
            data: imgBase64,
            filename: img.fileName || "receipt.jpg",
            content_type: img.type || "image/jpeg",
          },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        result.expenses.push(data.expense);
        result.summary.successful++;
      } else {
        result.failed_receipts.push({
          filename: img.fileName,
          error: "Processing failed",
        });
        result.summary.failed++;
      }
    } catch (error) {
      result.failed_receipts.push({
        filename: img.fileName,
        error: String(error),
      });
      result.summary.failed++;
    }
    result.summary.total++;
  }

  return result;
}

/**
 * Process a single receipt image
 */
export async function processSingleReceipt(
  image: SelectedImage,
  reportId: string
): Promise<Expense> {
  const base64 = await uriToBase64(image.uri);

  const response = await fetch(`${BASE_URL}/receipts/process-base64-single`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      report_id: reportId,
      image: {
        data: base64,
        filename: image.fileName || "receipt.jpg",
        content_type: image.type || "image/jpeg",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.expense;
}

/**
 * Get all expense reports
 */
export async function getReports(): Promise<ExpenseReport[]> {
  const response = await fetch(`${BASE_URL}/reports`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.reports;
}

/**
 * Create a new expense report
 */
export async function createReport(name: string): Promise<ExpenseReport> {
  const response = await fetch(`${BASE_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a specific report
 */
export async function getReport(reportId: string): Promise<ExpenseReport> {
  const response = await fetch(`${BASE_URL}/reports/${reportId}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/reports/${reportId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Get expenses for a report
 */
export async function getReportExpenses(reportId: string): Promise<{
  expenses: Expense[];
  report_name: string;
}> {
  const response = await fetch(`${BASE_URL}/reports/${reportId}/expenses`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get report summary
 */
export async function getReportSummary(reportId: string): Promise<ExpenseSummary> {
  const response = await fetch(`${BASE_URL}/reports/${reportId}/summary`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Download Excel report
 */
export async function downloadExcel(
  reportId: string,
  reportName: string = "expense_report"
): Promise<string> {
  const response = await fetch(`${BASE_URL}/reports/${reportId}/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_name: reportName }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Get as blob and share directly
  const blob = await response.blob();

  // Create a temporary file URL for sharing
  const fileUrl = URL.createObjectURL(blob);

  // Open share sheet
  if (await Sharing.isAvailableAsync()) {
    // For now, just alert - proper file saving requires native module
    throw new Error("Excel download requires native build. Use simulator for now.");
  }

  return fileUrl;
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  updates: Partial<Expense>
): Promise<Expense> {
  const response = await fetch(`${BASE_URL}/reports/expenses/${expenseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/reports/expenses/${expenseId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}
