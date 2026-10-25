import React, { createContext, useEffect, useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import * as SecureStore from 'expo-secure-store';

export const AdminContext = createContext(null);

export default function AdminLayout() {
  const [token, setToken] = useState(null);
  const [admin, setAdmin] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const t = await SecureStore.getItemAsync('admin_token');
      const a = await SecureStore.getItemAsync('admin_user');
      if (t) setToken(t);
      if (a) setAdmin(JSON.parse(a));
    })();
  }, []);

  const login = async (jwt, adminObj) => {
    setToken(jwt);
    setAdmin(adminObj);
    await SecureStore.setItemAsync('admin_token', jwt);
    await SecureStore.setItemAsync('admin_user', JSON.stringify(adminObj));
  };

  const logout = async () => {
    setToken(null);
    setAdmin(null);
    await SecureStore.deleteItemAsync('admin_token');
    await SecureStore.deleteItemAsync('admin_user');
  };

  const goBack = () => {
    if (pathname === '/admin/dashboard') return;
    router.back();
  };

  const showBack = pathname !== '/admin/dashboard' && pathname !== '/admin/login';

  return (
    <AdminContext.Provider value={{ token, admin, login, logout }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {showBack ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}

          <Text style={styles.headerTitle}>Admin Panel</Text>

          {pathname !== '/admin/login' ? (
            <TouchableOpacity
              style={styles.logoutChip}
              onPress={async () => {
                await logout();
                router.replace('/signin');
              }}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <View style={styles.content}>
          <Slot />
        </View>
      </SafeAreaView>
    </AdminContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.light.background,
  },
  backBtn: { paddingVertical: 8, paddingRight: 12 },
  backText: { color: Colors.light.text, fontWeight: '700', fontSize: 14 },
  logoutChip: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { fontWeight: '700', color: Colors.light.text },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  placeholder: { width: 60 },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
});
