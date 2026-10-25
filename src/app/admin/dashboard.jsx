import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { AdminContext } from './_layout';

const cards = [
  {
    title: 'Manage Events',
    route: '/admin/events',
    subtitle: 'Create, edit, and arrange event listings',
    accent: '#C49A32',
  },
  {
    title: 'Manage Poets',
    route: '/admin/poets',
    subtitle: 'Add poet profiles and control display order',
    accent: '#8B5E3C',
  },
  {
    title: 'Manage Home Feeds',
    route: '/admin/homefeeds',
    subtitle: 'Publish shayari posts and manage sequence',
    accent: '#B85C38',
  },
  {
    title: 'Manage Carousels',
    route: '/admin/carousels',
    subtitle: 'Update featured hero banners and promo slides',
    accent: '#6C7B4B',
  },
  {
    title: 'Splash Promotions',
    route: '/admin/splashscreenpromotions',
    subtitle: 'Manage onboarding slides, text, images, and social links',
    accent: '#D45D4B',
  },
];

export default function Dashboard() {
  const { logout, admin } = useContext(AdminContext);
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topCard}>
        <Text style={styles.kicker}>Admin Control Center</Text>
        <Text style={styles.welcome}>Welcome back, {admin?.name || admin?.email || 'Admin'}</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={[styles.card, { borderTopColor: card.accent }]}
            onPress={() => router.push(card.route)}
            activeOpacity={0.9}
          >
            <View style={[styles.badge, { backgroundColor: `${card.accent}20` }]}>
              <Text style={[styles.badgeText, { color: card.accent }]}>{card.title.split(' ')[1] || 'Panel'}</Text>
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardHint}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          await logout();
          router.replace('/signin');
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 28,
  },
  topCard: {
    backgroundColor: '#F8F4EE',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EADFCF',
  },
  kicker: {
    color: '#C49A32',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  welcome: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  grid: {
    gap: 10,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EADFCF',
    borderTopWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: Colors.light.text,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: { color: Colors.light.background, fontWeight: '800', fontSize: 15 },
});
