/**
 * Receipt detail screen - View and edit expense details
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, EXPENSE_CATEGORIES } from "@/constants/config";
import { useExpenseStore } from "@/stores/expenseStore";
import { updateExpense as updateExpenseApi, deleteExpense as deleteExpenseApi } from "@/services/api";
import { getReceiptUrl } from "@/services/supabase";

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { expenses, updateExpense, deleteExpense } = useExpenseStore();

  // Find the expense
  const expense = expenses.find((e) => e.id === id);

  // Form state
  const [formData, setFormData] = useState({
    merchant: expense?.merchant || "",
    description: expense?.description || "",
    amount: expense?.amount?.toString() || "",
    category: expense?.category || "Other",
    city: expense?.city || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    if (!expense) return;
    const changed =
      formData.merchant !== expense.merchant ||
      formData.description !== (expense.description || "") ||
      formData.amount !== expense.amount?.toString() ||
      formData.category !== expense.category ||
      formData.city !== (expense.city || "");
    setHasChanges(changed);
  }, [formData, expense]);

  // Not found state
  if (!expense) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Expense not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Receipt image URL
  const receiptUrl = expense.receipt_path
    ? getReceiptUrl(expense.receipt_path)
    : null;

  // Handle save
  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const updates = {
        merchant: formData.merchant,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        city: formData.city,
      };

      await updateExpenseApi(expense.id, updates);
      updateExpense(expense.id, updates);

      Alert.alert("Saved", "Expense updated successfully");
      setHasChanges(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpenseApi(expense.id);
              deleteExpense(expense.id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scrollView}>
        {/* Receipt image */}
        {receiptUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: receiptUrl }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Form fields */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Merchant</Text>
            <TextInput
              style={styles.input}
              value={formData.merchant}
              onChangeText={(text) =>
                setFormData({ ...formData, merchant: text })
              }
              placeholder="Merchant name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Description"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text })
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Currency</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{expense.currency}</Text>
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {Object.keys(EXPENSE_CATEGORIES).map((cat) => {
                const config =
                  EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES];
                const isSelected = formData.category === cat;

                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isSelected && { backgroundColor: config.color },
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat as any })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && { color: "#fff" },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="City"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Date</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{expense.date}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            !hasChanges && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  backLink: {
    marginTop: 16,
    color: COLORS.primary,
    fontSize: 16,
  },
  imageContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    alignItems: "center",
  },
  receiptImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.border,
    borderRadius: 8,
  },
  form: {
    backgroundColor: COLORS.surface,
    marginTop: 12,
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: "#fff",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.background,
  },
  readOnlyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  deleteButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    marginRight: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
