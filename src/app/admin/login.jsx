import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { AdminContext } from './_layout';
import { getApiBase } from '../../utils/api';

export default function AdminLogin() {
  const { login } = useContext(AdminContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const trimmedEmail = String(email || '').trim();
      const base = getApiBase();

      await SecureStore.deleteItemAsync('admin_token');
      await SecureStore.deleteItemAsync('admin_user');

      console.log('ADMIN LOGIN START');
      console.log('BASE_URL:', base);
      console.log('PAYLOAD:', { email: trimmedEmail, password: '***' });

      const res = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const text = await res.text();
      console.log('RESPONSE_STATUS:', res.status);
      console.log('RESPONSE_RAW:', text);

      let json = {};
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = { message: text };
      }

      if (!res.ok) return setError(json.message || `Login failed (${res.status})`);
      await login(json.token, json.admin);
      console.log('ADMIN LOGIN SUCCESS');
      router.replace('/admin/dashboard');
    } catch (err) {
      console.log('ADMIN LOGIN CATCH ERROR:', err);
      setError('Network error: ' + (err.message || String(err)));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Login</Text>
        <TextInput placeholder="Email" placeholderTextColor={Colors.light.textSecondary} style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput placeholder="Password" placeholderTextColor={Colors.light.textSecondary} style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: Colors.light.backgroundElement, padding: 18, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: Colors.light.text },
  input: { borderWidth: 1, borderColor: Colors.light.backgroundElement, backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12, color: Colors.light.text },
  btn: { backgroundColor: '#C49A32', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnText: { color: Colors.light.background, fontWeight: '700' },
  error: { color: '#d9534f', marginBottom: 8 },
});
