/**
 * Expenses screen - List of extracted expenses
 */
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EXPENSE_CATEGORIES, CURRENCY_SYMBOLS } from "@/constants/config";
import { useExpenseStore } from "@/stores/expenseStore";
import { getReportExpenses, deleteExpense as deleteExpenseApi } from "@/services/api";
import type { Expense } from "@/types";

export default function ExpensesScreen() {
  const { expenses, currentReport, setExpenses, deleteExpense } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  // Refresh expenses from server
  const refresh = async () => {
    if (!currentReport) return;

    setRefreshing(true);
    try {
      const data = await getReportExpenses(currentReport.id);
      setExpenses(data.expenses);
    } catch (error) {
      console.error("Failed to refresh expenses:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter expenses
  const filteredExpenses = filter
    ? expenses.filter((e) => e.category === filter)
    : expenses;

  // Handle delete
  const handleDelete = (expense: Expense) => {
    Alert.alert(
      "Delete Expense",
      `Delete ${expense.merchant} - ${expense.currency} ${expense.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpenseApi(expense.id);
              deleteExpense(expense.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  // Render expense card
  const renderExpenseCard = ({ item }: { item: Expense }) => {
    const categoryConfig = EXPENSE_CATEGORIES[item.category as keyof typeof EXPENSE_CATEGORIES] || EXPENSE_CATEGORIES.Other;
    const currencySymbol = CURRENCY_SYMBOLS[item.currency] || item.currency;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/receipt/${item.id}`)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: categoryConfig.color },
            ]}
          >
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.date}>{item.date}</Text>
        </View>

        <Text style={styles.merchant}>{item.merchant}</Text>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.locationContainer}>
            {item.city && (
              <>
                <Ionicons
                  name="location"
                  size={14}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.city}>{item.city}</Text>
              </>
            )}
          </View>
          <Text style={styles.amount}>
            {currencySymbol}
            {Number(item.amount).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No Expenses Yet</Text>
      <Text style={styles.emptySubtitle}>
        Upload receipts to see your expenses here
      </Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => router.push("/")}
      >
        <Text style={styles.uploadButtonText}>Upload Receipts</Text>
      </TouchableOpacity>
    </View>
  );

  // Calculate total
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      {expenses.length > 0 && (
        <View style={styles.filterContainer}>
          <ScrollableFilters
            selectedFilter={filter}
            onFilterChange={setFilter}
          />
        </View>
      )}

      {/* Expense list */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      />

      {/* Total bar */}
      {expenses.length > 0 && (
        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>
            Total ({filteredExpenses.length} expenses)
          </Text>
          <Text style={styles.totalAmount}>
            ${total.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

// Filter tabs component
function ScrollableFilters({
  selectedFilter,
  onFilterChange,
}: {
  selectedFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}) {
  const filters = ["All", ...Object.keys(EXPENSE_CATEGORIES)];

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={filters}
      keyExtractor={(item) => item}
      renderItem={({ item }) => {
        const isSelected =
          item === "All" ? selectedFilter === null : selectedFilter === item;
        const categoryConfig =
          item !== "All"
            ? EXPENSE_CATEGORIES[item as keyof typeof EXPENSE_CATEGORIES]
            : null;

        return (
          <TouchableOpacity
            style={[
              styles.filterChip,
              isSelected && styles.filterChipSelected,
              isSelected && categoryConfig && { backgroundColor: categoryConfig.color },
            ]}
            onPress={() => onFilterChange(item === "All" ? null : item)}
          >
            <Text
              style={[
                styles.filterChipText,
                isSelected && styles.filterChipTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.filterList}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  merchant: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  city: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
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
  uploadButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
});
