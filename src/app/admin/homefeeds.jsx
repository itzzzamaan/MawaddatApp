import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from "@/utils/secureStorage";
import { AdminContext } from './_layout';
import { Colors } from '../../constants/theme';
import Constants from 'expo-constants';
import { getApiBase, normalizeImageUrl, parseApiResponse, uploadImageToApi } from '../../utils/api';

const getAdminToken = async (currentToken) => {
  if (currentToken) return currentToken;
  return await SecureStore.getItemAsync('admin_token');
};

const API = `${getApiBase()}/api`;
const MAX_FEATURED_POSTS = 50;

const resolveImageUrl = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) return value;
  return normalizeImageUrl(value);
};

const CATEGORY_OPTIONS = ['Kalaam', 'Manqabat', 'Munajat', 'Noha', 'Salam', 'Article', 'Other'];
const generatePoetId = () => `poet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyPost = {
  poetId: '',
  poet: '',
  born: '',
  avatar: '',
  type: 'shayari',
  category: 'Kalaam',
  content: { roman: '', urdu: '', hindi: '' },
  likes: 0,
  comments: 0,
  liked: false,
  following: false,
  saved: false,
};

export default function AdminHomeFeeds() {
  const { token } = useContext(AdminContext);
  const [items, setItems] = useState([]);
  const [poets, setPoets] = useState([]);
  const [form, setForm] = useState(emptyPost);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPoetMenu, setShowPoetMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderDrafts, setOrderDrafts] = useState({});

  const fetchPoets = useCallback(async () => {
    try {
      const res = await fetch(API + '/poets');
      const json = await res.json();
      setPoets(Array.isArray(json) ? json : []);
    } catch (error) {
      console.log('Failed to load poets for dropdown:', error);
      setPoets([]);
    }
  }, []);

  const fetchList = useCallback(async () => {
    const res = await fetch(API + '/homefeeds');
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load feeds.');
    const list = Array.isArray(json) ? json : [];
    setItems(list);
    setOrderDrafts(Object.fromEntries(
      list.map((item) => [String(item._id || item.id), item.displayOrder ? String(item.displayOrder) : '']),
    ));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList().catch((error) => console.error('Failed to load feeds:', error));
      fetchPoets();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchList, fetchPoets]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const roman = typeof item.content === 'string'
        ? item.content
        : item.content?.roman;
      const poet = typeof item.poet === 'string' ? item.poet : item.poet?.name;
      return [item.category, poet, item.poetName, roman]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [items, searchQuery]);

  const resetForm = () => {
    setForm(emptyPost);
    setImage(null);
    setImageBase64(null);
    setEditingId(null);
    setShowCategoryMenu(false);
    setShowPoetMenu(false);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateContent = (lang, value) => {
    setForm((prev) => ({
      ...prev,
      content: { ...prev.content, [lang]: value },
    }));
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
      alert('No image selected');
      return;
    }
    setImage(uri);
    setImageBase64(photo?.base64 || null);
  };

  const uploadImageFile = async (localUri, authTokenValue) => {
    if (!localUri || localUri.startsWith('http')) return localUri || null;
    return uploadImageToApi({
      uri: localUri,
      authToken: authTokenValue,
      apiBase: getApiBase(),
      fallbackName: 'feed.jpg',
    });
  };

  const create = async () => {
    if (!form.poet || !form.content.roman) return;

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

      const generatedPoetId = form.poetId || generatePoetId();
      const payload = new FormData();
      payload.append('poetId', generatedPoetId);
      payload.append('poet', form.poet);
      payload.append('born', form.born || '');
      payload.append('type', imagePath ? 'image' : (form.type || 'Poet'));
      payload.append('category', form.category || 'Kalaam');
      payload.append('content', JSON.stringify(form.content));
      payload.append('likes', '0');
      payload.append('comments', '0');
      payload.append('liked', String(Boolean(form.liked)));
      payload.append('following', String(Boolean(form.following)));
      payload.append('saved', String(Boolean(form.saved)));

      if (imagePath) {
        payload.append('image', imagePath);
        payload.append('avatar', imagePath);
      }

      const res = await fetch(API + '/homefeeds', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Create homefeed failed', res.status, text);
        alert('Failed to add feed');
        return;
      }

      setForm((prev) => ({ ...prev, poetId: generatedPoetId }));
      resetForm();
      fetchList();
    } catch (err) {
      console.error('Create homefeed upload failed', err);
      alert(err.message || 'Failed to add feed');
    }
  };

  const handleSelectPoet = (poet) => {
    if (!poet) return;
    setForm((prev) => ({
      ...prev,
      poetId: poet._id || poet.id || prev.poetId || generatePoetId(),
      poet: poet.name || '',
      born: poet.years || '',
      type: poet.famousFor || 'Poet',
    }));
    setShowPoetMenu(false);
  };

  const startEdit = (item) => {
    const matchedPoet = poets.find((poet) => (poet.name || '').toLowerCase() === (item.poet || '').toLowerCase());
    setEditingId(item._id || item.id);
    setForm({
      poetId: item.poetId || matchedPoet?._id || matchedPoet?.id || '',
      poet: item.poet || matchedPoet?.name || '',
      born: item.born || matchedPoet?.years || '',
      avatar: item.avatar || '',
      type: item.type || matchedPoet?.famousFor || 'Poet',
      category: CATEGORY_OPTIONS.includes(item.category) ? item.category : 'Kalaam',
      content: typeof item.content === 'string' ? JSON.parse(item.content || '{}') : (item.content || { roman: '', urdu: '', hindi: '' }),
      likes: item.likes || 0,
      comments: item.comments || 0,
      liked: Boolean(item.liked),
      following: Boolean(item.following),
      saved: Boolean(item.saved),
    });
    setImage(item.avatar ? resolveImageUrl(item.avatar) : null);
    setShowCategoryMenu(false);
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

      const generatedPoetId = form.poetId || generatePoetId();
      const payload = new FormData();
      payload.append('poetId', generatedPoetId);
      payload.append('poet', form.poet);
      payload.append('born', form.born || '');
      payload.append('type', imagePath ? 'image' : (form.type || 'Poet'));
      payload.append('category', form.category || 'Kalaam');
      payload.append('content', JSON.stringify(form.content));
      payload.append('likes', String(form.likes || 0));
      payload.append('comments', String(form.comments || 0));
      payload.append('liked', String(Boolean(form.liked)));
      payload.append('following', String(Boolean(form.following)));
      payload.append('saved', String(Boolean(form.saved)));

      if (imagePath) {
        payload.append('image', imagePath);
        payload.append('avatar', imagePath);
      }

      const res = await fetch(API + '/homefeeds/' + id, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Update homefeed failed', res.status, text);
        alert('Failed to update feed');
        return;
      }

      setForm((prev) => ({ ...prev, poetId: generatedPoetId }));
      resetForm();
      fetchList();
    } catch (err) {
      console.error('Update homefeed upload failed', err);
      alert(err.message || 'Failed to update feed');
    }
  };

  const remove = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }
    await fetch(API + '/homefeeds/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + authToken } });
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
    if (draft && (!/^\d+$/.test(draft) || Number(draft) > MAX_FEATURED_POSTS)) {
      alert('Enter a whole number from 1 to 50, or leave it blank for automatic order.');
      return;
    }

    try {
      const res = await fetch(`${API}/homefeeds/${id}/order`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: draft ? Number(draft) : null }),
      });
      const result = await parseApiResponse(res);
      if (!res.ok) {
        alert(result.message || 'Unable to update post order.');
        return;
      }
      await fetchList();
    } catch (error) {
      alert(error.message || 'Unable to update post order.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Home Feeds</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Post data</Text>

          <Text style={styles.fieldLabel}>Poet</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPoetMenu((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{form.poet || 'Select poet'}</Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>

          {showPoetMenu ? (
            <View style={styles.dropdownMenu}>
              {poets.length ? poets.map((poet) => (
                <TouchableOpacity
                  key={poet._id || poet.id}
                  style={[
                    styles.dropdownOption,
                    form.poet === poet.name && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => handleSelectPoet(poet)}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    form.poet === poet.name && styles.dropdownOptionTextSelected,
                  ]}>{poet.name}</Text>
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyPoetState}>
                  <Text style={styles.emptyPoetText}>No poets available. Create a poet first.</Text>
                </View>
              )}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowCategoryMenu((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{form.category || 'Select category'}</Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>

          {showCategoryMenu ? (
            <View style={styles.dropdownMenu}>
              {CATEGORY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownOption,
                    form.category === option && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => {
                    updateField('category', option);
                    setShowCategoryMenu(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    form.category === option && styles.dropdownOptionTextSelected,
                  ]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TextInput style={[styles.input, styles.textarea]} placeholder="Roman version" value={form.content?.roman || ''} onChangeText={(v) => updateContent('roman', v)} placeholderTextColor={Colors.light.textSecondary} multiline />
          <TextInput style={[styles.input, styles.textarea]} placeholder="Urdu version" value={form.content?.urdu || ''} onChangeText={(v) => updateContent('urdu', v)} placeholderTextColor={Colors.light.textSecondary} multiline />
          <TextInput style={[styles.input, styles.textarea]} placeholder="Hindi version" value={form.content?.hindi || ''} onChangeText={(v) => updateContent('hindi', v)} placeholderTextColor={Colors.light.textSecondary} multiline />

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
          <Text style={styles.listTitle}>Feed list</Text>
          <Text style={styles.listCount}>{items.length} items</Text>
        </View>
        <Text style={styles.orderHelp}>
          {`Assign positions 1–${MAX_FEATURED_POSTS} for featured posts. Leave blank for newest-first order.`}
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search category, poet, or Roman text"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.light.textSecondary}
          returnKeyType="search"
        />

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item._id || item.id)}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyResult}>No feeds match your search.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image source={{ uri: resolveImageUrl(item.avatar || item.image) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }} style={styles.rowImage} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={styles.itemTitle}>{item.poet}</Text>
                <Text style={styles.itemMeta}>{item.category} • {item.type}</Text>
                <Text style={styles.itemText} numberOfLines={2}>{typeof item.content === 'string' ? item.content : (item.content?.roman || item.content?.urdu || item.content?.hindi || '')}</Text>
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
                    accessibilityLabel={`Featured position for ${item.poet} post`}
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7DED0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  dropdownText: { color: Colors.light.text, fontWeight: '600' },
  dropdownArrow: { color: Colors.light.textSecondary, fontSize: 18 },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7DED0',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E6DA',
  },
  dropdownOptionSelected: { backgroundColor: '#F5EADA' },
  dropdownOptionText: { color: Colors.light.text, fontWeight: '600' },
  dropdownOptionTextSelected: { color: '#C49A32' },
  emptyPoetState: { padding: 12 },
  emptyPoetText: { color: Colors.light.textSecondary },
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
  emptyResult: { color: Colors.light.textSecondary, paddingVertical: 16 },
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
