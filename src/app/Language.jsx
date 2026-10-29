import { useRouter } from "expo-router";
import * as SecureStore from "@/utils/secureStorage";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon } from "react-native-elements";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Colors } from "../constants/theme";

const languages = [
  { name: "English", code: "en", flag: "https://flagcdn.com/w320/us.png" },
  { name: "Hindi", code: "in", flag: "https://flagcdn.com/w320/in.png" },
];

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [searchText, setSearchText] = useState("");

  const filteredLanguages = languages.filter((lang) =>
    lang.name.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    (async () => {
      const storedLang = await SecureStore.getItemAsync("appLanguage");
      if (storedLang) setSelected(storedLang);

      const adminToken = await SecureStore.getItemAsync("admin_token");
      if (adminToken) {
        router.replace("/admin/dashboard");
        return;
      }

      const userToken = await SecureStore.getItemAsync("user_token");
      if (userToken) {
        router.replace("/(tabs)/Home");
      }
    })();
  }, []);

  const handleContinue = async () => {
    if (selected) {
      await SecureStore.setItemAsync("appLanguage", selected);
      router.push("/Splash-carousel");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- Globe Icon ---------- */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Icon name="language" size={28} color={Colors.light.background} />
        </View>
      </View>

      {/* ---------- Title ---------- */}
      <Text style={styles.title}>Select Language</Text>

      {/* ---------- Search ---------- */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={22} color={Colors.light.textSecondary} />
        <TextInput
          placeholder="Search languages"
          placeholderTextColor="#aaa"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* ---------- Section ---------- */}
      <Text style={styles.sectionTitle}>All Languages</Text>

      {/* ---------- Language List ---------- */}
      <FlatList
        data={filteredLanguages}
        keyExtractor={(item, index) => item.name + index}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isSelected = selected === item.name;

          return (
            <Pressable
                android_ripple={{ color: Colors.light.backgroundSelected }}
              onPress={() => setSelected(item.name)}
              style={({ pressed }) => [
                styles.languageItem,
                isSelected && styles.languageSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.langRow}>
                <Image source={{ uri: item.flag }} style={styles.flag} />
                <Text style={styles.langText}>{item.name}</Text>
              </View>

              {isSelected && (
                <Icon name="check" type="feather" size={18} color={Colors.light.textSecondary} />
              )}
            </Pressable>
          );
        }}
      />

      {/* ---------- Continue Button ---------- */}
      <Pressable
        style={({ pressed }) => [
          styles.continueBtn,
          pressed && { opacity: 0.9 },
        ]}
        onPress={handleContinue}
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: Platform.OS === "android" ? wp(2) : wp(3),
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: Platform.OS === "android" ? 38 : 20,
  },

  /* ---------- Icon ---------- */
  iconContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  iconCircle: {
    backgroundColor: Colors.light.textSecondary,
    borderRadius: 40,
    padding: 20,
    elevation: 4,
  },

  /* ---------- Title ---------- */
  title: {
    textAlign: "center",
    fontSize: wp(5.2),
    fontWeight: "600",
    marginBottom: 14,
    color: Colors.light.text,
  },


  searchContainer: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: Colors.light.backgroundElement,
  borderRadius: 25,
  paddingVertical: Platform.OS === "android" ? 6 : 14,
  paddingHorizontal: 14,
  marginLeft: 14,
  marginRight: 14, // ✅ NEW
},

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: wp(4),
    color: Colors.light.text,
  },

  /* ---------- Section ---------- */
  sectionTitle: {
    color: Colors.light.text,
    marginTop: 22,
    marginBottom: 12,
    fontWeight: "500",
    marginLeft: 14,
  marginRight: 14,
  },

  /* ---------- Language Item ---------- */
  languageItem: {
    paddingVertical: wp(4),
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    marginBottom: 12,
    marginLeft: 14,
  marginRight: 14,
  },
  languageSelected: {
    borderWidth: 1.5,
    borderColor: Colors.light.textSecondary,
    backgroundColor: Colors.light.backgroundSelected,
  },

  langRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flag: {
    width: 30,
    height: 20,
    marginRight: 12,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: Colors.light.backgroundElement,
  },
  langText: {
    fontSize: 16,
    color: Colors.light.text,
  },

  /* ---------- Button ---------- */
  continueBtn: {
    backgroundColor: Colors.light.text,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    marginLeft: 14,
  marginRight: 14,
  },
  continueText: {
    color: Colors.light.background,
    fontSize: wp(4),
    fontWeight: "600",
  },
});
