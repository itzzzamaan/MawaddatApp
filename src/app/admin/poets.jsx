import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from "@/utils/secureStorage";
import { AdminContext } from './_layout';
import { Colors } from '../../constants/theme';
import { getApiBase, normalizeImageUrl, parseApiResponse, uploadImageToApi } from '../../utils/api';

const POET_CATEGORIES = ['Poet', 'Reciter', 'Association', 'Scholar'];

const getAdminToken = async (currentToken) => {
  if (currentToken) return currentToken;
  return await SecureStore.getItemAsync('admin_token');
};

const API = `${getApiBase()}/api`;
const MAX_FEATURED_POETS = 20;

const resolveImageUrl = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) return value;
  return normalizeImageUrl(value);
};

const emptyPoet = {
  name: '',
  years: '',
  location: '',
  category: 'Poet',
  description: '',
  famousFor: '',
};

export default function AdminPoets() {
  const { token } = useContext(AdminContext);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyPoet);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderDrafts, setOrderDrafts] = useState({});

  const fetchList = useCallback(async () => {
    const res = await fetch(API + '/poets');
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load poets.');
    const list = Array.isArray(json) ? json : [];
    setItems(list);
    setOrderDrafts(Object.fromEntries(
      list.map((item) => [String(item._id || item.id), item.displayOrder ? String(item.displayOrder) : '']),
    ));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList().catch((error) => console.error('Failed to load poets:', error));
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchList]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.name, item.category, item.location, item.famousFor, item.description, item.bio]
        .some((value) => String(value || '').toLowerCase().includes(query)),
    );
  }, [items, searchQuery]);

  const resetForm = () => {
    setForm(emptyPoet);
    setImage(null);
    setImageBase64(null);
    setEditingId(null);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const pickImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return;
    try {
      const p = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, base64: true });
      if (p.cancelled) return;
      const photo = p.assets && p.assets[0] ? p.assets[0] : p;
      const uri = photo?.uri || null;
      if (!uri) {
        alert('No image selected');
        return;
      }
      setImage(uri);
      setImageBase64(photo?.base64 || null);
    } catch (err) {
      console.error('Pick image failed', err);
      alert('Image selection error');
    }
  };

  const uploadImageFile = async (localUri, authTokenValue) => {
    if (!localUri || localUri.startsWith('http')) return localUri || null;
    return uploadImageToApi({
      uri: localUri,
      authToken: authTokenValue,
      apiBase: getApiBase(),
      fallbackName: 'poet.jpg',
    });
  };

  const create = async () => {
    if (!form.name) return;

    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }

    try {
      let imagePath = null;
      if (image && !image.startsWith('http')) {
        imagePath = await uploadImageFile(image, authToken);
      }

      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('years', form.years || '');
      payload.append('location', form.location || '');
      payload.append('category', form.category || 'Poet');
      payload.append('description', form.description || '');
      payload.append('famousFor', form.famousFor || '');
      if (imagePath) {
        payload.append('image', imagePath);
      }

      const res = await fetch(API + '/poets', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Create poet failed', res.status, text);
        alert('Failed to add poet: ' + (text || res.status));
        return;
      }
      resetForm();
      fetchList();
    } catch (err) {
      console.error('Network error creating poet', err);
      alert('Network error: ' + (err.message || String(err)));
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id || item.id);
    setForm({
      name: item.name || '',
      years: item.years || '',
      location: item.location || '',
      category: item.category || 'Poet',
      description: item.description || '',
      famousFor: item.famousFor || '',
    });
    setImage(item.image ? resolveImageUrl(item.image) : null);
  };

  const update = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }

    try {
      let imagePath = null;
      if (image && !image.startsWith('http')) {
        imagePath = await uploadImageFile(image, authToken);
      }

      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('years', form.years || '');
      payload.append('location', form.location || '');
      payload.append('category', form.category || 'Poet');
      payload.append('description', form.description || '');
      payload.append('famousFor', form.famousFor || '');
      if (imagePath) {
        payload.append('image', imagePath);
      }

      const res = await fetch(API + '/poets/' + id, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Update poet failed', res.status, text);
        alert('Failed to update poet');
        return;
      }
      resetForm();
      fetchList();
    } catch (err) {
      console.error('Network error updating poet', err);
      alert('Network error: ' + (err.message || String(err)));
    }
  };

  const remove = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }
    await fetch(API + '/poets/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + authToken } });
    fetchList();
  };

  const saveDisplayOrder = async (item) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }

    const id = String(item._id || item.id);
    const draft = (orderDrafts[id] || '').trim();
    if (draft && (!/^\d+$/.test(draft) || Number(draft) > MAX_FEATURED_POETS)) {
      alert('Enter a whole number from 1 to 20, or leave it blank for automatic order.');
      return;
    }

    try {
      const res = await fetch(`${API}/poets/${id}/order`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: draft ? Number(draft) : null }),
      });
      const result = await parseApiResponse(res);
      if (!res.ok) {
        alert(result.message || 'Unable to update poet order.');
        return;
      }
      await fetchList();
    } catch (error) {
      alert(error.message || 'Unable to update poet order.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Poets</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Poet profile</Text>

          <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => updateField('name', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Years" value={form.years} onChangeText={(v) => updateField('years', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Location" value={form.location} onChangeText={(v) => updateField('location', v)} placeholderTextColor={Colors.light.textSecondary} />

          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryMenu((prev) => !prev)} activeOpacity={0.8}>
            <Text style={styles.dropdownText}>{form.category || 'Select category'}</Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>

          {showCategoryMenu ? (
            <View style={styles.dropdownMenu}>
              {POET_CATEGORIES.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.dropdownOption, form.category === option && styles.dropdownOptionSelected]}
                  onPress={() => {
                    updateField('category', option);
                    setShowCategoryMenu(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, form.category === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TextInput style={[styles.input, styles.textarea]} placeholder="Description" value={form.description} onChangeText={(v) => updateField('description', v)} placeholderTextColor={Colors.light.textSecondary} multiline />
          <TextInput style={styles.input} placeholder="Famous for" value={form.famousFor} onChangeText={(v) => updateField('famousFor', v)} placeholderTextColor={Colors.light.textSecondary} />

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={pickImage} style={[styles.btn, styles.imageBtn]}>
              <Text style={styles.btnText}>{image ? 'Change Image' : 'Add Image'}</Text>
            </TouchableOpacity>
            {editingId ? (
              <TouchableOpacity onPress={() => update(editingId)} style={styles.btn}><Text style={styles.btnText}>Update</Text></TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={create} style={styles.btn}><Text style={styles.btnText}>Add</Text></TouchableOpacity>
            )}
          </View>

          {image ? <Image source={{ uri: image }} style={styles.preview} /> : null}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Poet list</Text>
          <Text style={styles.listCount}>{items.length} items</Text>
        </View>
        <Text style={styles.orderHelp}>
          {`Assign positions 1–${MAX_FEATURED_POETS} for featured poets. Leave blank for newest-first order.`}
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search poets"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.light.textSecondary}
          returnKeyType="search"
        />

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item._id || item.id)}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No poets match your search.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image source={{ uri: resolveImageUrl(item.image || item.avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }} style={styles.rowImage} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.category} • {item.years || 'N/A'}</Text>
                <Text style={styles.itemText} numberOfLines={2}>{item.description}</Text>
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Rank #{item.displayOrder || '—'}</Text>
                  <TextInput
                    style={styles.orderInput}
                    value={orderDrafts[String(item._id || item.id)] ?? ''}
                    onChangeText={(value) => setOrderDrafts((current) => ({
                      ...current,
                      [String(item._id || item.id)]: value.replace(/[^\d]/g, '').slice(0, 2),
                    }))}
                    placeholder="Auto"
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel={`Featured position for ${item.name}`}
                  />
                  <TouchableOpacity onPress={() => saveDisplayOrder(item)} style={styles.orderButton}>
                    <Text style={styles.orderButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.editBtn}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item._id || item.id)} style={styles.del}><Text style={styles.delText}>Delete</Text></TouchableOpacity>
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
  title: { fontWeight: '800', fontSize: 25, color: Colors.light.text, marginBottom: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1, color: '#C49A32', marginBottom: 10, textTransform: 'uppercase' },
  formCard: { backgroundColor: Colors.light.backgroundElement, borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E7DED0' },
  fieldLabel: { color: Colors.light.textSecondary, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E7DED0', padding: 12, borderRadius: 12, backgroundColor: '#fff', color: Colors.light.text, marginBottom: 10 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E7DED0', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', marginBottom: 10 },
  dropdownText: { color: Colors.light.text, fontWeight: '600' },
  dropdownArrow: { color: Colors.light.textSecondary, fontSize: 18 },
  dropdownMenu: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7DED0', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  dropdownOption: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1E6DA' },
  dropdownOptionSelected: { backgroundColor: '#F5EADA' },
  dropdownOptionText: { color: Colors.light.text, fontWeight: '600' },
  dropdownOptionTextSelected: { color: '#C49A32' },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: Colors.light.text, padding: 12, borderRadius: 10, alignItems: 'center', flex: 1 },
  imageBtn: { backgroundColor: '#D5C8B0' },
  btnText: { color: '#fff', fontWeight: '700' },
  preview: { height: 100, width: 100, marginTop: 10, borderRadius: 12 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontWeight: '800', fontSize: 16, color: Colors.light.text },
  listCount: { color: Colors.light.textSecondary },
  orderHelp: { color: Colors.light.textSecondary, marginBottom: 8, lineHeight: 18 },
  searchInput: { borderWidth: 1, borderColor: '#E7DED0', padding: 12, borderRadius: 12, backgroundColor: '#fff', color: Colors.light.text, marginBottom: 12 },
  emptyText: { color: Colors.light.textSecondary, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.light.backgroundElement, borderRadius: 12, marginBottom: 10 },
  rowImage: { width: 72, height: 72, borderRadius: 10 },
  itemTitle: { color: Colors.light.text, fontWeight: '700', fontSize: 15 },
  itemMeta: { color: Colors.light.textSecondary, marginTop: 4 },
  itemText: { color: Colors.light.text, marginTop: 4 },
  orderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  orderLabel: { color: Colors.light.textSecondary, fontSize: 10 },
  orderInput: { minWidth: 42, borderWidth: 1, borderColor: '#E7DED0', paddingVertical: 5, paddingHorizontal: 5, borderRadius: 7, color: Colors.light.text, backgroundColor: '#fff', textAlign: 'center' },
  orderButton: { backgroundColor: Colors.light.text, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 7 },
  orderButtonText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  rowActions: { marginLeft: 8 },
  editBtn: { backgroundColor: '#C49A32', padding: 8, borderRadius: 8, marginBottom: 6 },
  editText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  del: { backgroundColor: '#d9534f', padding: 8, borderRadius: 8 },
  delText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
