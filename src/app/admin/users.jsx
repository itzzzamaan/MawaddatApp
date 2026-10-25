import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { AdminContext } from './_layout';
import { Colors } from '../../constants/theme';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const HOST = (() => {
  const expoHost = Constants.manifest?.debuggerHost?.split(':')[0];
  if (expoHost) return expoHost;
  if (Platform.OS === 'android') return '10.0.2.2';
  if (typeof window !== 'undefined' && window.location) return window.location.hostname;
  return 'localhost';
})();

const API = `http://${HOST}:4000/api`;

export default function AdminUsers() {
  const { token } = useContext(AdminContext);
  const [users, setUsers] = useState([]);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(API + '/users', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return setUsers([]);
      const json = await res.json();
      setUsers(json || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users</Text>
      <FlatList
        data={users}
        keyExtractor={(u) => String(u._id || u.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name || '(no name)'}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontWeight: '800', fontSize: 24, color: Colors.light.text, marginBottom: 12 },
  row: { padding: 12, borderRadius: 10, backgroundColor: Colors.light.backgroundElement, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: '700', color: Colors.light.text },
  email: { color: Colors.light.textSecondary, fontSize: 12 },
  date: { color: Colors.light.textSecondary, fontSize: 12, marginLeft: 8 },
});
