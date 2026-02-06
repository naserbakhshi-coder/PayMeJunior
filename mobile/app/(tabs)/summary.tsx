/**
 * Summary screen - Expense summary and Excel export
 */
import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EXPENSE_CATEGORIES, CURRENCY_SYMBOLS } from "@/constants/config";
import { useExpenseStore } from "@/stores/expenseStore";
import { downloadExcel } from "@/services/api";

export default function SummaryScreen() {
  const { expenses, currentReport, reset } = useExpenseStore();
  const [reportName, setReportName] = useState(
    currentReport?.name || "Expense Report"
  );
  const [isExporting, setIsExporting] = useState(false);

  // Calculate summary data
  const summary = useMemo(() => {
    const byCategory: Record<string, { count: number; total: number }> = {};
    const byCurrency: Record<string, { count: number; total: number }> = {};

    for (const expense of expenses) {
      const category = expense.category || "Other";
      const currency = expense.currency || "USD";
      const amount = Number(expense.amount);

      if (!byCategory[category]) {
        byCategory[category] = { count: 0, total: 0 };
      }
      byCategory[category].count++;
      byCategory[category].total += amount;

      if (!byCurrency[currency]) {
        byCurrency[currency] = { count: 0, total: 0 };
      }
      byCurrency[currency].count++;
      byCurrency[currency].total += amount;
    }

    return { byCategory, byCurrency };
  }, [expenses]);

  // Handle Excel export
  const handleExport = async () => {
    if (!currentReport) {
      Alert.alert("Error", "No report to export");
      return;
    }

    setIsExporting(true);
    try {
      await downloadExcel(currentReport.id, reportName);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Failed to export Excel file");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all expenses? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            reset();
            Alert.alert("Cleared", "All data has been cleared");
          },
        },
      ]
    );
  };

  // Empty state
  if (expenses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No Summary Yet</Text>
        <Text style={styles.emptySubtitle}>
          Process some receipts to see your expense summary
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Report name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Name</Text>
        <TextInput
          style={styles.input}
          value={reportName}
          onChangeText={setReportName}
          placeholder="Enter report name"
        />
      </View>

      {/* Summary by category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Category</Text>
        {Object.entries(summary.byCategory).map(([category, data]) => {
          const config =
            EXPENSE_CATEGORIES[category as keyof typeof EXPENSE_CATEGORIES] ||
            EXPENSE_CATEGORIES.Other;

          return (
            <View key={category} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <View
                  style={[styles.colorDot, { backgroundColor: config.color }]}
                />
                <Text style={styles.summaryLabel}>{category}</Text>
                <Text style={styles.summaryCount}>({data.count})</Text>
              </View>
              <Text style={styles.summaryAmount}>
                ${data.total.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Summary by currency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Currency</Text>
        {Object.entries(summary.byCurrency).map(([currency, data]) => {
          const symbol = CURRENCY_SYMBOLS[currency] || currency;

          return (
            <View key={currency} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Text style={styles.currencyCode}>{currency}</Text>
                <Text style={styles.summaryCount}>({data.count} expenses)</Text>
              </View>
              <Text style={styles.summaryAmount}>
                {symbol}
                {data.total.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grand total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Total Expenses</Text>
        <Text style={styles.totalCount}>{expenses.length} items</Text>
      </View>

      {/* Export section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Report</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download" size={24} color="#fff" />
              <Text style={styles.exportButtonText}>
                Download Excel Report
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.exportHint}>
          SAP Concur compatible format (.xlsx)
        </Text>
      </View>

      {/* Clear all button */}
      <TouchableOpacity
        style={styles.clearButton}
        onPress={handleClearAll}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        <Text style={styles.clearButtonText}>Clear All Data</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    backgroundColor: COLORS.surface,
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  summaryCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    width: 50,
  },
  totalSection: {
    backgroundColor: COLORS.primary,
    marginTop: 12,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  totalCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  exportHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
  },
  clearButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
