import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from "@/utils/secureStorage";
import { AdminContext } from './_layout';
import { Colors } from '../../constants/theme';
import { getApiBase, normalizeImageUrl, uploadImageToApi } from '../../utils/api';

const getAdminToken = async (currentToken) => {
  if (currentToken) return currentToken;
  return await SecureStore.getItemAsync('admin_token');
};

const API = `${getApiBase()}/api`;
const HOME_CAROUSELS_API = `${API}/carousels`;

const resolveImageUrl = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) return value;
  return normalizeImageUrl(value);
};

const emptySlide = {
  label: '',
  description: '',
  image: '',
};

const uploadImageFile = async (localUri, authTokenValue) => {
  if (!localUri || localUri.startsWith('http')) return localUri || null;
  return uploadImageToApi({
    uri: localUri,
    authToken: authTokenValue,
    apiBase: getApiBase(),
    fallbackName: 'slide.jpg',
  });
};

export default function AdminCarousels() {
  const { token } = useContext(AdminContext);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptySlide);
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchList = async () => {
    const res = await fetch(HOME_CAROUSELS_API);
    const json = await res.json();
    setItems(json || []);
  };

  useEffect(() => { Promise.resolve().then(fetchList); }, []);

  const resetForm = () => {
    setForm(emptySlide);
    setImage(null);
    setEditingId(null);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const pickImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return;
    const p = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (p.canceled) return;
    const uri = p.assets?.[0]?.uri || null;
    if (!uri) {
      alert('No image selected');
      return;
    }
    setImage(uri);
  };

  const create = async () => {
    if (!form.label) return;

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
      payload.append('label', form.label);
      payload.append('description', form.description || '');
      if (imagePath) {
        payload.append('image', imagePath);
      }

      const res = await fetch(HOME_CAROUSELS_API, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Create carousel failed', res.status, text);
        alert('Failed to add slide');
        return;
      }

      resetForm();
      fetchList();
    } catch (err) {
      console.error('Create carousel upload failed', err);
      alert(err.message || 'Failed to add slide');
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id || item.id);
    setForm({
      label: item.label || '',
      description: item.description || '',
      image: item.image || '',
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
      payload.append('label', form.label);
      payload.append('description', form.description || '');
      if (imagePath) {
        payload.append('image', imagePath);
      }

      const res = await fetch(HOME_CAROUSELS_API + '/' + id, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Update carousel failed', res.status, text);
        alert('Failed to update slide');
        return;
      }

      resetForm();
      fetchList();
    } catch (err) {
      console.error('Update carousel upload failed', err);
      alert(err.message || 'Failed to update slide');
    }
  };

  const remove = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }
    await fetch(HOME_CAROUSELS_API + '/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + authToken } });
    fetchList();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Carousels</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Carousel slide</Text>

          <TextInput style={styles.input} placeholder="Label" value={form.label} onChangeText={(v) => updateField('label', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={[styles.input, styles.textarea]} placeholder="Description" value={form.description} onChangeText={(v) => updateField('description', v)} placeholderTextColor={Colors.light.textSecondary} multiline />

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
          <Text style={styles.listTitle}>Slide list</Text>
          <Text style={styles.listCount}>{items.length} items</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id || item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image source={{ uri: resolveImageUrl(item.image) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }} style={styles.rowImage} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={styles.itemTitle}>{item.label}</Text>
                <Text style={styles.itemMeta}>{item.description || 'No description'}</Text>
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
  input: { borderWidth: 1, borderColor: '#E7DED0', padding: 12, borderRadius: 12, backgroundColor: '#fff', color: Colors.light.text, marginBottom: 10 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: Colors.light.text, padding: 12, borderRadius: 10, alignItems: 'center', flex: 1 },
  imageBtn: { backgroundColor: '#D5C8B0' },
  btnText: { color: '#fff', fontWeight: '700' },
  preview: { height: 100, width: 100, marginTop: 10, borderRadius: 12 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontWeight: '800', fontSize: 16, color: Colors.light.text },
  listCount: { color: Colors.light.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.light.backgroundElement, borderRadius: 12, marginBottom: 10 },
  rowImage: { width: 72, height: 72, borderRadius: 10 },
  itemTitle: { color: Colors.light.text, fontWeight: '700', fontSize: 15 },
  itemMeta: { color: Colors.light.textSecondary, marginTop: 4 },
  rowActions: { marginLeft: 8 },
  editBtn: { backgroundColor: '#C49A32', padding: 8, borderRadius: 8, marginBottom: 6 },
  editText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  del: { backgroundColor: '#d9534f', padding: 8, borderRadius: 8 },
  delText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
