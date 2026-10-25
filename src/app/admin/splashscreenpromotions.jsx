import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';

const createBlankSlide = (key = '') => ({
  key,
  title: '',
  subtitle: '',
  image: '',
  socialLinks: {
    instagram: '',
    whatsapp: '',
    facebook: '',
    youtube: '',
  },
});

const initialSlides = [
  {
    key: '1',
    title: 'Words of the Heart',
    subtitle: 'Express your deepest feelings through beautiful shayari',
    image: '',
    socialLinks: {
      instagram: 'https://www.instagram.com/mawaddat.shayari/',
      whatsapp: 'https://wa.me/923001234567',
      facebook: 'https://www.facebook.com/mawaddatshayari',
      youtube: 'https://www.youtube.com/@mawaddatshayari',
    },
  },
  {
    key: '2',
    title: 'Love & Emotions',
    subtitle: 'Discover romantic, heart-touching, and soulful poetry',
    image: '',
    socialLinks: {
      instagram: 'https://www.instagram.com/poetry.moods/',
      whatsapp: 'https://wa.me/923005551234',
      facebook: 'https://www.facebook.com/poetrymoods',
      youtube: 'https://www.youtube.com/@poetrymoods',
    },
  },
  {
    key: '3',
    title: 'Feel the Shayari',
    subtitle: 'Find the perfect words for every moment of life and love',
    image: '',
    socialLinks: {
      instagram: 'https://www.instagram.com/urdu.shayari.page/',
      whatsapp: '',
      facebook: 'https://www.facebook.com/urdushayari.page',
      youtube: 'https://www.youtube.com/@urdushayaripage',
    },
  },
];

export default function SplashScreenPromotions() {
  const [slides, setSlides] = useState(initialSlides);

  const addSlide = () => {
    const nextKey = String(slides.length + 1);
    setSlides((prev) => [...prev, createBlankSlide(nextKey)]);
  };

  const deleteSlide = (index) => {
    if (slides.length <= 1) {
      Alert.alert('Minimum required', 'At least one splash slide is required.');
      return;
    }

    setSlides((prev) => prev.filter((_, i) => i !== index).map((slide, idx) => ({
      ...slide,
      key: String(idx + 1),
    })));
  };

  const updateSlide = (index, field, value) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateSocialLink = (index, platform, value) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        socialLinks: {
          ...(next[index].socialLinks || {}),
          [platform]: value,
        },
      };
      return next;
    });
  };

  const pickImage = async (index) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      updateSlide(index, 'image', result.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}> Promotions</Text>
          <Text style={styles.subtitle}>Manage all welcome slides, text, images and social links.</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={addSlide}>
          <Text style={styles.addButtonText}>+ Add Slide</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.listTitle}>Slides list</Text>
        {slides.map((slide, index) => (
          <View key={`${slide.key}-${index}`} style={styles.slideListItem}>
            <View style={styles.slideListInfo}>
              <Text style={styles.slideListNumber}>Slide {slide.key}</Text>
              <Text style={styles.slideListText} numberOfLines={1}>{slide.title || 'Untitled slide'}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSlide(index)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {slides.map((slide, index) => (
        <View key={`${slide.key}-${index}`} style={styles.slideCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Slide {slide.key}</Text>
            <TouchableOpacity style={styles.deleteMiniBtn} onPress={() => deleteSlide(index)}>
              <Text style={styles.deleteMiniText}>Remove</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={slide.title}
            onChangeText={(text) => updateSlide(index, 'title', text)}
            placeholder="Enter title"
            placeholderTextColor={Colors.light.textSecondary}
          />

          <Text style={styles.label}>Subtitle</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={slide.subtitle}
            onChangeText={(text) => updateSlide(index, 'subtitle', text)}
            placeholder="Enter subtitle"
            placeholderTextColor={Colors.light.textSecondary}
            multiline
          />

          <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(index)}>
            <Text style={styles.imageBtnText}>{slide.image ? 'Change Image' : 'Upload Image'}</Text>
          </TouchableOpacity>

          {slide.image ? (
            <Image source={{ uri: slide.image }} style={styles.previewImage} />
          ) : null}

          <Text style={styles.socialTitle}>Social Links</Text>

          <Text style={styles.label}>Instagram</Text>
          <TextInput
            style={styles.input}
            value={slide.socialLinks?.instagram || ''}
            onChangeText={(text) => updateSocialLink(index, 'instagram', text)}
            placeholder="Instagram URL"
            placeholderTextColor={Colors.light.textSecondary}
          />

          <Text style={styles.label}>WhatsApp</Text>
          <TextInput
            style={styles.input}
            value={slide.socialLinks?.whatsapp || ''}
            onChangeText={(text) => updateSocialLink(index, 'whatsapp', text)}
            placeholder="WhatsApp URL"
            placeholderTextColor={Colors.light.textSecondary}
          />

          <Text style={styles.label}>Facebook</Text>
          <TextInput
            style={styles.input}
            value={slide.socialLinks?.facebook || ''}
            onChangeText={(text) => updateSocialLink(index, 'facebook', text)}
            placeholder="Facebook URL"
            placeholderTextColor={Colors.light.textSecondary}
          />

          <Text style={styles.label}>YouTube</Text>
          <TextInput
            style={styles.input}
            value={slide.socialLinks?.youtube || ''}
            onChangeText={(text) => updateSocialLink(index, 'youtube', text)}
            placeholder="YouTube URL"
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    maxWidth: 220,
  },
  addButton: {
    backgroundColor: Colors.light.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    color: Colors.light.background,
    fontWeight: '800',
    fontSize: 12,
  },
  listCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7DED0',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 10,
  },
  slideListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7DED0',
  },
  slideListInfo: {
    flex: 1,
    paddingRight: 10,
  },
  slideListNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C49A32',
    marginBottom: 2,
  },
  slideListText: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    backgroundColor: '#FDECEC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteBtnText: {
    color: '#C0392B',
    fontWeight: '700',
    fontSize: 11,
  },
  slideCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7DED0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  deleteMiniBtn: {
    backgroundColor: '#FDECEC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteMiniText: {
    color: '#C0392B',
    fontWeight: '700',
    fontSize: 11,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E7DED0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.light.text,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageBtn: {
    backgroundColor: '#C49A32',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  imageBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginTop: 12,
  },
  socialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 18,
    marginBottom: 6,
  },
});
