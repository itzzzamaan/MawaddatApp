// import * as SecureStore from "@/utils/secureStorage";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useState } from "react";
import {
  FlatList,
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
import * as SecureStore from "../../utils/secureStorage";
import { AdminContext } from "./_layout";

const getAdminToken = async (currentToken) => {
  if (currentToken) return currentToken;
  return await SecureStore.getItemAsync("admin_token");
};

const API = `${getApiBase()}/api`;
const DEFAULT_CATEGORIES = ["Majlis", "Mehfil", "Shabbedari"];

const resolveImageUrl = (value) => {
  if (!value) return null;
  if (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  )
    return value;
  return normalizeImageUrl(value);
};

const emptyEvent = {
  title: "",
  subtitle: "",
  category: "Majlis",
  date: "",
  time: "",
  venue: "",
  location: "",
  completeAddress: "",
  mapsLink: "",
  host: "",
  description: "",
  highlights: "",
  featured: false,
};

const uploadImageFile = async (localUri, authTokenValue) => {
  if (!localUri || localUri.startsWith("http")) return localUri || null;
  return uploadImageToApi({
    uri: localUri,
    authToken: authTokenValue,
    apiBase: getApiBase(),
    fallbackName: "event.jpg",
  });
};

export default function AdminEvents() {
  const { token } = useContext(AdminContext);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyEvent);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [customCategories, setCustomCategories] = useState([]);
  const categories = [
    ...new Set([
      ...DEFAULT_CATEGORIES,
      ...items.map((item) => item.category?.trim()).filter(Boolean),
      ...customCategories,
    ]),
  ];

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    const res = await fetch(API + "/events");
    const json = await res.json();
    setItems(json || []);
  }

  const resetForm = () => {
    setForm(emptyEvent);
    setImage(null);
    setImageBase64(null);
    setEditingId(null);
    setCategoryMenuOpen(false);
    setCreatingCategory(false);
    setNewCategory("");
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return;
    const p = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      base64: true,
    });
    if (p.cancelled) return;
    const photo = p.assets && p.assets[0] ? p.assets[0] : p;
    const uri = photo?.uri || null;
    if (!uri) {
      alert("No image selected");
      return;
    }
    setImage(uri);
    setImageBase64(photo?.base64 || null);
  };

  const create = async () => {
    if (!form.title) return;

    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert("Not authenticated. Please login as admin.");
      return;
    }

    try {
      let imagePath = null;
      if (image && !image.startsWith("http")) {
        imagePath = await uploadImageFile(image, authToken);
      }

      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("subtitle", form.subtitle || "");
      payload.append("category", form.category || "Majlis");
      payload.append("date", form.date || "");
      payload.append("time", form.time || "");
      payload.append("venue", form.venue || "");
      payload.append("location", form.location.trim());
      payload.append("completeAddress", form.completeAddress || "");
      payload.append("mapsLink", form.mapsLink || "");
      payload.append("host", form.host || "");
      payload.append("description", form.description || "");
      payload.append("highlights", form.highlights || "");
      payload.append("featured", String(Boolean(form.featured)));
      if (imagePath) {
        payload.append("image", imagePath);
      }

      const res = await fetch(API + "/events", {
        method: "POST",
        headers: { Authorization: "Bearer " + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Create event failed", res.status, text);
        alert("Failed to add event");
        return;
      }

      resetForm();
      fetchList();
    } catch (err) {
      console.error("Create event upload failed", err);
      alert(err.message || "Failed to add event");
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id || item.id);
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      category: item.category || "Majlis",
      date: item.date || "",
      time: item.time || "",
      venue: item.venue || "",
      location: item.location || "",
      completeAddress: item.completeAddress || "",
      mapsLink: item.mapsLink || "",
      host: item.host || "",
      description: item.description || "",
      highlights: Array.isArray(item.highlights)
        ? item.highlights.join("\n")
        : "",
      featured: Boolean(item.featured),
    });
    setImage(item.image ? resolveImageUrl(item.image) : null);
  };

  const update = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert("Not authenticated. Please login as admin.");
      return;
    }

    try {
      let imagePath = null;
      if (image && !image.startsWith("http")) {
        imagePath = await uploadImageFile(image, authToken);
      }

      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("subtitle", form.subtitle || "");
      payload.append("category", form.category || "Majlis");
      payload.append("date", form.date || "");
      payload.append("time", form.time || "");
      payload.append("venue", form.venue || "");
      payload.append("location", form.location.trim());
      payload.append("completeAddress", form.completeAddress || "");
      payload.append("mapsLink", form.mapsLink || "");
      payload.append("host", form.host || "");
      payload.append("description", form.description || "");
      payload.append("highlights", form.highlights || "");
      payload.append("featured", String(Boolean(form.featured)));
      if (imagePath) {
        payload.append("image", imagePath);
      }

      const res = await fetch(API + "/events/" + id, {
        method: "PUT",
        headers: { Authorization: "Bearer " + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Update event failed", res.status, text);
        alert("Failed to update event");
        return;
      }

      resetForm();
      fetchList();
    } catch (err) {
      console.error("Update event upload failed", err);
      alert(err.message || "Failed to update event");
    }
  };

  const remove = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert("Not authenticated. Please login as admin.");
      return;
    }
    await fetch(API + "/events/" + id, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + authToken },
    });
    fetchList();
  };

  const addCategory = () => {
    const category = newCategory.trim();
    if (!category) {
      alert("Enter a category name.");
      return;
    }

    const existingCategory = categories.find(
      (item) => item.toLowerCase() === category.toLowerCase(),
    );
    if (existingCategory) {
      updateField("category", existingCategory);
    } else {
      setCustomCategories((current) => [...current, category]);
      updateField("category", category);
    }

    setNewCategory("");
    setCreatingCategory(false);
    setCategoryMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Events</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Event details</Text>

          <TextInput
            style={styles.input}
            placeholder="Title"
            value={form.title}
            onChangeText={(v) => updateField("title", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Subtitle"
            value={form.subtitle}
            onChangeText={(v) => updateField("subtitle", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity
            style={styles.categoryDropdown}
            onPress={() => {
              setCreatingCategory(false);
              setCategoryMenuOpen((open) => !open);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Category: ${form.category}`}
            accessibilityState={{ expanded: categoryMenuOpen }}
          >
            <Text style={styles.categoryDropdownText}>
              {form.category || "Select a category"}
            </Text>
            <Text style={styles.dropdownChevron}>
              {categoryMenuOpen ? "⌃" : "⌄"}
            </Text>
          </TouchableOpacity>

          {categoryMenuOpen && (
            <View style={styles.categoryMenu}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryOption}
                  onPress={() => {
                    updateField("category", category);
                    setCategoryMenuOpen(false);
                  }}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      form.category === category && styles.selectedCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => setCreatingCategory(true)}
                accessibilityRole="button"
              >
                <Text style={styles.createCategoryText}>
                  + Create new category
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {creatingCategory && (
            <View style={styles.newCategoryRow}>
              <TextInput
                style={[styles.input, styles.newCategoryInput]}
                placeholder="New category name"
                value={newCategory}
                onChangeText={setNewCategory}
                placeholderTextColor={Colors.light.textSecondary}
                returnKeyType="done"
                onSubmitEditing={addCategory}
              />
              <TouchableOpacity
                onPress={addCategory}
                style={styles.addCategoryButton}
                accessibilityRole="button"
              >
                <Text style={styles.addCategoryButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Date"
            value={form.date}
            onChangeText={(v) => updateField("date", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Time"
            value={form.time}
            onChangeText={(v) => updateField("time", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Venue / city (include city, e.g. Hall, Karachi)"
            value={form.venue}
            onChangeText={(v) => updateField("venue", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Notification city for local alerts (e.g. Lucknow)"
            value={form.location}
            onChangeText={(v) => updateField("location", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Complete address"
            value={form.completeAddress}
            onChangeText={(v) => updateField("completeAddress", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Google Maps link (https://...)"
            value={form.mapsLink}
            onChangeText={(v) => updateField("mapsLink", v)}
            placeholderTextColor={Colors.light.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            style={styles.input}
            placeholder="Host"
            value={form.host}
            onChangeText={(v) => updateField("host", v)}
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Description"
            value={form.description}
            onChangeText={(v) => updateField("description", v)}
            placeholderTextColor={Colors.light.textSecondary}
            multiline
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Highlights"
            value={form.highlights}
            onChangeText={(v) => updateField("highlights", v)}
            placeholderTextColor={Colors.light.textSecondary}
            multiline
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={pickImage}
              style={[styles.btn, styles.imageBtn]}
            >
              <Text style={styles.btnText}>
                {image ? "Change Image" : "Add Image"}
              </Text>
            </TouchableOpacity>
            {editingId ? (
              <TouchableOpacity
                onPress={() => update(editingId)}
                style={styles.btn}
              >
                <Text style={styles.btnText}>Update</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={create} style={styles.btn}>
                <Text style={styles.btnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : null}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Event list</Text>
          <Text style={styles.listCount}>{items.length} items</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id || item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{
                  uri:
                    resolveImageUrl(item.image) ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
                }}
                style={styles.rowImage}
              />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {item.category} • {item.date}
                </Text>
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => startEdit(item)}
                  style={styles.editBtn}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(item._id || item.id)}
                  style={styles.del}
                >
                  <Text style={styles.delText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  title: {
    fontWeight: "800",
    fontSize: 25,
    color: Colors.light.text,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#C49A32",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  formCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E7DED0",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E7DED0",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    color: Colors.light.text,
    marginBottom: 10,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  fieldLabel: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  categoryDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E7DED0",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  categoryDropdownText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  dropdownChevron: {
    color: Colors.light.textSecondary,
    fontSize: 18,
    fontWeight: "700",
  },
  categoryMenu: {
    borderWidth: 1,
    borderColor: "#E7DED0",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginTop: -4,
    marginBottom: 10,
    overflow: "hidden",
  },
  categoryOption: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAE2",
  },
  categoryOptionText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  selectedCategoryText: {
    fontWeight: "800",
  },
  createCategoryText: {
    color: "#8B5E3C",
    fontSize: 14,
    fontWeight: "700",
  },
  newCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  newCategoryInput: {
    flex: 1,
    marginBottom: 0,
  },
  addCategoryButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: Colors.light.text,
    borderRadius: 12,
  },
  addCategoryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  actionRow: { flexDirection: "row", gap: 8 },
  btn: {
    backgroundColor: Colors.light.text,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  imageBtn: { backgroundColor: "#D5C8B0" },
  btnText: { color: "#fff", fontWeight: "700" },
  preview: { height: 100, width: 100, marginTop: 10, borderRadius: 12 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listTitle: { fontWeight: "800", fontSize: 16, color: Colors.light.text },
  listCount: { color: Colors.light.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowImage: { width: 72, height: 72, borderRadius: 10 },
  itemTitle: { color: Colors.light.text, fontWeight: "700", fontSize: 15 },
  itemMeta: { color: Colors.light.textSecondary, marginTop: 4 },
  itemText: { color: Colors.light.text, marginTop: 4 },
  rowActions: { marginLeft: 8 },
  editBtn: {
    backgroundColor: "#C49A32",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  editText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  del: { backgroundColor: "#d9534f", padding: 8, borderRadius: 8 },
  delText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
