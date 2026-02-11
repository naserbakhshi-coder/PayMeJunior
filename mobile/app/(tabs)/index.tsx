/**
 * Home/Upload screen - Select and process receipts
 */
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/config";
import { useExpenseStore } from "@/stores/expenseStore";
import { processReceipts } from "@/services/api";
import type { SelectedImage } from "@/types";

export default function UploadScreen() {
  const [reportName, setReportName] = useState("Expense Report");
  const {
    selectedImages,
    setSelectedImages,
    clearSelectedImages,
    isProcessing,
    setProcessing,
    processingProgress,
    setProgress,
    setCurrentReport,
    setExpenses,
  } = useExpenseStore();

  // Pick images from photo library
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const images: SelectedImage[] = result.assets.map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          fileSize: asset.fileSize,
        }));
        setSelectedImages(images);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick images");
    }
  };

  // Remove a selected image
  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  // Process selected receipts
  const handleProcess = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("No Images", "Please select receipt images first");
      return;
    }

    setProcessing(true);
    setProgress(0, selectedImages.length);

    try {
      const result = await processReceipts(selectedImages, reportName);

      // Store results
      setCurrentReport({
        id: result.report_id,
        name: result.report_name,
        created_at: new Date().toISOString(),
        total_expenses: result.expenses.length,
      });
      setExpenses(result.expenses);

      // Clear selected images
      clearSelectedImages();

      // Show result
      if (result.failed_receipts.length > 0) {
        const failedDetails = result.failed_receipts
          .map((f: any) => `${f.filename}: ${f.error}`)
          .join("\n");
        Alert.alert(
          "Processing Complete",
          `Processed ${result.summary.successful} of ${result.summary.total} receipts.\n${result.summary.failed} failed.\n\nDetails:\n${failedDetails}`,
          [{ text: "View Expenses", onPress: () => router.push("/expenses") }]
        );
      } else {
        Alert.alert(
          "Success!",
          `Processed ${result.summary.successful} receipts`,
          [{ text: "View Expenses", onPress: () => router.push("/expenses") }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to process receipts. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, Naser!</Text>
        <Text style={styles.title}>Upload Receipts</Text>
        <Text style={styles.subtitle}>
          Select receipt images from your photo library to extract expense data
        </Text>
      </View>

      {/* Selected images preview */}
      {selectedImages.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>
            Selected ({selectedImages.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main action area */}
      <View style={styles.actionArea}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>
              Processing receipts with AI...
            </Text>
            <Text style={styles.processingSubtext}>
              This may take a moment
            </Text>
          </View>
        ) : (
          <>
            {/* Select images button */}
            <TouchableOpacity
              style={styles.selectButton}
              onPress={pickImages}
            >
              <Ionicons name="images" size={48} color={COLORS.primary} />
              <Text style={styles.selectButtonText}>
                {selectedImages.length > 0
                  ? "Select More Receipts"
                  : "Select Receipts from Photos"}
              </Text>
            </TouchableOpacity>

            {/* Process button */}
            {selectedImages.length > 0 && (
              <TouchableOpacity
                style={styles.processButton}
                onPress={handleProcess}
              >
                <Ionicons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.processButtonText}>
                  Process {selectedImages.length} Receipt
                  {selectedImages.length > 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.infoText}>AI-powered receipt scanning</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.infoText}>SAP Concur compatible format</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.infoText}>Export to Excel</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcome: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  previewSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 12,
    position: "relative",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  actionArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  selectButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    width: "100%",
  },
  selectButtonText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  processButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
  },
  processButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  processingContainer: {
    alignItems: "center",
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoSection: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
