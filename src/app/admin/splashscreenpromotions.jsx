import * as SecureStore from "@/utils/secureStorage";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/theme";
import {
  getApiBase,
  normalizeImageUrl,
  uploadImageToApi,
} from "../../utils/api";
import { AdminContext } from "./_layout";

const API = `${getApiBase()}/api/promotions`;
const SOCIAL_PLATFORMS = ["instagram", "whatsapp", "facebook", "youtube"];

const emptyForm = {
  title: "",
  subtitle: "",
  socialLinks: {
    instagram: "",
    whatsapp: "",
    facebook: "",
    youtube: "",
  },
};

const getAdminToken = async (currentToken) =>
  currentToken || SecureStore.getItemAsync("admin_token");

export default function SplashScreenPromotions() {
  const { token } = useContext(AdminContext);
  const [slides, setSlides] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSlides = async () => {
    try {
      const response = await fetch(API);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load splash promotions.");
      }
      setSlides(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Load failed", error.message || "Unable to load promotions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadSlides);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setImage("");
    setEditingId(null);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const saveSlide = async () => {
    if (!form.title.trim()) {
      Alert.alert("Title required", "Enter a title for this promotion.");
      return;
    }
    if (!image) {
      Alert.alert("Image required", "Choose an image for this promotion.");
      return;
    }

    setSaving(true);
    try {
      const authToken = await getAdminToken(token);
      if (!authToken) {
        throw new Error("Admin session expired. Please sign in again.");
      }

      const imagePath = /^https?:\/\//i.test(image)
        ? image
        : await uploadImageToApi({
            uri: image,
            authToken,
            fallbackName: "promotion.jpg",
          });

      if (!imagePath) {
        throw new Error("The promotion image could not be uploaded.");
      }

      const response = await fetch(
        editingId ? `${API}/${encodeURIComponent(editingId)}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title.trim(),
            label: form.title.trim(),
            subtitle: form.subtitle.trim(),
            description: form.subtitle.trim(),
            image: imagePath,
            socialLinks: form.socialLinks,
            order: editingId ? undefined : slides.length,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save promotion.");
      }

      resetForm();
      await loadSlides();
    } catch (error) {
      Alert.alert("Save failed", error.message || "Unable to save promotion.");
    } finally {
      setSaving(false);
    }
  };

  const editSlide = (slide) => {
    setEditingId(slide._id);
    setForm({
      title: slide.title || slide.label || "",
      subtitle: slide.subtitle || slide.description || "",
      socialLinks: {
        ...emptyForm.socialLinks,
        ...(slide.socialLinks || {}),
      },
    });
    setImage(slide.image ? normalizeImageUrl(slide.image) : "");
  };

  const deleteSlide = async (slide) => {
    try {
      const authToken = await getAdminToken(token);
      if (!authToken) {
        throw new Error("Admin session expired. Please sign in again.");
      }

      const response = await fetch(`${API}/${encodeURIComponent(slide._id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete promotion.");
      }

      if (editingId === slide._id) resetForm();
      await loadSlides();
    } catch (error) {
      Alert.alert(
        "Delete failed",
        error.message || "Unable to delete promotion.",
      );
    }
  };

  const updateSocialLink = (platform, value) => {
    setForm((current) => ({
      ...current,
      socialLinks: { ...current.socialLinks, [platform]: value },
    }));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Splash Promotions</Text>
      <Text style={styles.subtitle}>These slides appear after sign-in.</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>
          {editingId ? "Edit promotion" : "Add promotion"}
        </Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(title) =>
            setForm((current) => ({ ...current, title }))
          }
          placeholder="Title"
          placeholderTextColor={Colors.light.textSecondary}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.subtitle}
          onChangeText={(subtitle) =>
            setForm((current) => ({ ...current, subtitle }))
          }
          placeholder="Description"
          placeholderTextColor={Colors.light.textSecondary}
          multiline
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
          <Text style={styles.secondaryButtonText}>
            {image ? "Change image" : "Choose image"}
          </Text>
        </TouchableOpacity>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} />
        ) : null}
        {SOCIAL_PLATFORMS.map((platform) => (
          <TextInput
            key={platform}
            style={styles.input}
            value={form.socialLinks[platform]}
            onChangeText={(value) => updateSocialLink(platform, value)}
            placeholder={`${platform[0].toUpperCase()}${platform.slice(1)} URL (optional)`}
            placeholderTextColor={Colors.light.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />
        ))}
        <View style={styles.actions}>
          {editingId ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetForm}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveSlide}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {editingId ? "Save changes" : "Add promotion"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Saved promotions</Text>
      {loading ? <ActivityIndicator color="#C49A32" /> : null}
      {!loading && slides.length === 0 ? (
        <Text style={styles.emptyText}>
          No promotions yet. Add one above to show a promotion after sign-in.
        </Text>
      ) : null}
      {slides.map((slide) => (
        <View key={slide._id} style={styles.slideRow}>
          <Image
            source={{ uri: normalizeImageUrl(slide.image) }}
            style={styles.thumbnail}
          />
          <View style={styles.slideInfo}>
            <Text style={styles.slideTitle} numberOfLines={1}>
              {slide.title || slide.label}
            </Text>
            <Text style={styles.slideSubtitle} numberOfLines={2}>
              {slide.subtitle || slide.description}
            </Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity
              onPress={() => editSlide(slide)}
              style={styles.editButton}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteSlide(slide)}
              style={styles.deleteButton}
            >
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 28 },
  title: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderColor: "#E7DED0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#E7DED0",
    borderRadius: 10,
    borderWidth: 1,
    color: Colors.light.text,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  multiline: { minHeight: 78, textAlignVertical: "top" },
  preview: { borderRadius: 10, height: 150, marginBottom: 12, width: "100%" },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.light.text,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    padding: 11,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#D5C8B0",
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 10,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: { color: Colors.light.text, fontWeight: "700" },
  emptyText: { color: Colors.light.textSecondary, marginBottom: 12 },
  slideRow: {
    alignItems: "center",
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    padding: 10,
  },
  thumbnail: { borderRadius: 8, height: 58, width: 58 },
  slideInfo: { flex: 1 },
  slideTitle: { color: Colors.light.text, fontWeight: "700" },
  slideSubtitle: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  rowActions: { gap: 6 },
  editButton: { backgroundColor: "#C49A32", borderRadius: 7, padding: 7 },
  deleteButton: { backgroundColor: "#C0392B", borderRadius: 7, padding: 7 },
  actionText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
