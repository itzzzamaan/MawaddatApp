import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { AdminContext } from './_layout';
import { Colors } from '../../constants/theme';
import Constants from 'expo-constants';
import { normalizeImageUrl, uploadImageToApi } from '../../utils/api';

const getAdminToken = async (currentToken) => {
  if (currentToken) return currentToken;
  return await SecureStore.getItemAsync('admin_token');
};

const getApiBase = () => {
  const envHost = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envHost) {
    const normalized = envHost.replace(/\/$/, '');
    return /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`;
  }

  const expoHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (expoHost) {
    const host = expoHost.split(':')[0];
    return `http://${host}:4000`;
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  if (typeof window !== 'undefined' && window.location) return `http://${window.location.hostname}:4000`;
  return 'http://localhost:4000';
};

const API = `${getApiBase()}/api`;

const resolveImageUrl = (value) => {
  return normalizeImageUrl(value);
};

const emptyEvent = {
  title: '',
  subtitle: '',
  category: 'Love',
  date: '',
  time: '',
  venue: '',
  host: '',
  description: '',
  highlights: '',
  featured: false,
};

const uploadImageFile = async (localUri, authTokenValue, base64Value) => {
  if (!localUri || localUri.startsWith('http')) return localUri || null;
  return uploadImageToApi({
    uri: localUri,
    base64: base64Value,
    authToken: authTokenValue,
    apiBase: getApiBase(),
    fallbackName: 'event.jpg',
  });
};

export default function AdminEvents() {
  const { token } = useContext(AdminContext);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyEvent);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    const res = await fetch(API + '/events');
    const json = await res.json();
    setItems(json || []);
  };

  const resetForm = () => {
    setForm(emptyEvent);
    setImage(null);
    setImageBase64(null);
    setEditingId(null);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) return;
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
  };

  const create = async () => {
    if (!form.title) return;

    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }

    try {
      let imagePath = null;
      if (image && !image.startsWith('http')) {
        imagePath = await uploadImageFile(image, authToken, imageBase64);
      }

      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('subtitle', form.subtitle || '');
      payload.append('category', form.category || 'Love');
      payload.append('date', form.date || '');
      payload.append('time', form.time || '');
      payload.append('venue', form.venue || '');
      payload.append('host', form.host || '');
      payload.append('description', form.description || '');
      payload.append('highlights', form.highlights || '');
      payload.append('featured', String(Boolean(form.featured)));
      if (imagePath) {
        payload.append('image', imagePath);
      }

      const res = await fetch(API + '/events', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Create event failed', res.status, text);
        alert('Failed to add event');
        return;
      }

      resetForm();
      fetchList();
    } catch (err) {
      console.error('Create event upload failed', err);
      alert(err.message || 'Failed to add event');
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id || item.id);
    setForm({
      title: item.title || '',
      subtitle: item.subtitle || '',
      category: item.category || 'Love',
      date: item.date || '',
      time: item.time || '',
      venue: item.venue || '',
      host: item.host || '',
      description: item.description || '',
      highlights: Array.isArray(item.highlights) ? item.highlights.join('\n') : '',
      featured: Boolean(item.featured),
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
        imagePath = await uploadImageFile(image, authToken, imageBase64);
      }

      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('subtitle', form.subtitle || '');
      payload.append('category', form.category || 'Love');
      payload.append('date', form.date || '');
      payload.append('time', form.time || '');
      payload.append('venue', form.venue || '');
      payload.append('host', form.host || '');
      payload.append('description', form.description || '');
      payload.append('highlights', form.highlights || '');
      payload.append('featured', String(Boolean(form.featured)));
      if (imagePath) {
        payload.append('image', imagePath);
      }

      const res = await fetch(API + '/events/' + id, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + authToken },
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Update event failed', res.status, text);
        alert('Failed to update event');
        return;
      }

      resetForm();
      fetchList();
    } catch (err) {
      console.error('Update event upload failed', err);
      alert(err.message || 'Failed to update event');
    }
  };

  const remove = async (id) => {
    const authToken = await getAdminToken(token);
    if (!authToken) {
      alert('Not authenticated. Please login as admin.');
      return;
    }
    await fetch(API + '/events/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + authToken } });
    fetchList();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Events</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Event details</Text>

          <TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(v) => updateField('title', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Subtitle" value={form.subtitle} onChangeText={(v) => updateField('subtitle', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Category" value={form.category} onChangeText={(v) => updateField('category', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Date" value={form.date} onChangeText={(v) => updateField('date', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Time" value={form.time} onChangeText={(v) => updateField('time', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Venue" value={form.venue} onChangeText={(v) => updateField('venue', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={styles.input} placeholder="Host" value={form.host} onChangeText={(v) => updateField('host', v)} placeholderTextColor={Colors.light.textSecondary} />
          <TextInput style={[styles.input, styles.textarea]} placeholder="Description" value={form.description} onChangeText={(v) => updateField('description', v)} placeholderTextColor={Colors.light.textSecondary} multiline />
          <TextInput style={[styles.input, styles.textarea]} placeholder="Highlights" value={form.highlights} onChangeText={(v) => updateField('highlights', v)} placeholderTextColor={Colors.light.textSecondary} multiline />

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
          <Text style={styles.listTitle}>Event list</Text>
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
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.category} • {item.date}</Text>
                <Text style={styles.itemText} numberOfLines={2}>{item.description}</Text>
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
  itemText: { color: Colors.light.text, marginTop: 4 },
  rowActions: { marginLeft: 8 },
  editBtn: { backgroundColor: '#C49A32', padding: 8, borderRadius: 8, marginBottom: 6 },
  editText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  del: { backgroundColor: '#d9534f', padding: 8, borderRadius: 8 },
  delText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
