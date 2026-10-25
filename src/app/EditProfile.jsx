import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const EditProfile = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [imageUri, setImageUri] = useState("https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png");
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos to upload a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow camera access to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    setIsLoading(true);
    (async () => {
      try {
        const updated = {
          name: fullName,
          fullName,
          email,
          mobile,
          address,
          imageUri,
        };

        // save user_profile
        await SecureStore.setItemAsync("user_profile", JSON.stringify(updated));

        // also update user_account if present (keep credentials)
        const accountRaw = await SecureStore.getItemAsync("user_account");
        if (accountRaw) {
          try {
            const account = JSON.parse(accountRaw);
            const merged = { ...account, ...updated };
            await SecureStore.setItemAsync("user_account", JSON.stringify(merged));
          } catch (e) {
            // ignore
          }
        }

        setIsLoading(false);
        Alert.alert("Profile Updated", "Your profile has been updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } catch (err) {
        setIsLoading(false);
        Alert.alert("Error", "Unable to save profile. Please try again.");
      }
    })();
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync("user_profile");
        const accountRaw = await SecureStore.getItemAsync("user_account");
        const user = raw ? JSON.parse(raw) : accountRaw ? JSON.parse(accountRaw) : null;

        if (user) {
          if (user.fullName) setFullName(user.fullName);
          else if (user.name) setFullName(user.name);

          if (user.email) setEmail(user.email);
          if (user.mobile) setMobile(user.mobile);
          if (user.address) setAddress(user.address);
          if (user.imageUri) setImageUri(user.imageUri);
          if (user.avatar) setImageUri(user.avatar);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleDiscard = () => {
    setShowDiscardModal(true);
  };

  const confirmDiscard = () => {
    setShowDiscardModal(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleDiscard}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#2C1810" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Image Section */}
          <View style={styles.profileImageSection}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
              <TouchableOpacity style={styles.imageEditButton} onPress={handlePickImage}>
                <Feather name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.imageHelperText}>
              Tap camera icon to change photo
            </Text>
            
            {/* Photo Options */}
            {/* <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoOption} onPress={handlePickImage}>
                <Ionicons name="images-outline" size={22} color="#706D75" />
                <Text style={styles.photoOptionText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoOption} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={22} color="#706D75" />
                <Text style={styles.photoOptionText}>Camera</Text>
              </TouchableOpacity>
            </View> */}
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={22} color="#706D75" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    style={[styles.input, { backgroundColor: '#F5F5F5' }]}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Email Address <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.input, { backgroundColor: '#F5F5F5' }]}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Mobile Number <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    value={mobile}
                    onChangeText={setMobile}
                    style={styles.input}
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Address <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <Ionicons name="location-outline" size={20} color="#666" marginTop={hp(1.3)} style={styles.inputIcon} />
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter your complete address"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* Additional Info Section */}
            {/* <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={22} color="#706D75" />
                <Text style={styles.sectionTitle}>Additional Information</Text>
              </View>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Ionicons name="calendar-outline" size={20} color="#706D75" />
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>Not set</Text>
                  <TouchableOpacity style={styles.infoEditButton}>
                    <Text style={styles.infoEditText}>Add</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.infoCard}>
                  <Ionicons name="transgender-outline" size={20} color="#706D75" />
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>Male</Text>
                  <TouchableOpacity style={styles.infoEditButton}>
                    <Text style={styles.infoEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View> */}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleDiscard}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.submitText}>Updating...</Text>
                ) : (
                  <>
                    <Text style={styles.submitText}>Save Changes</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.submitIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Discard Changes Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDiscardModal}
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={48} color="#706D75" />
            </View>
            <Text style={styles.modalTitle}>Discard Changes?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to discard all changes? Your edits will not be saved.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDiscardModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Continue Editing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDiscardButton]}
                onPress={confirmDiscard}
              >
                <Text style={styles.modalDiscardButtonText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 69, 19, 0.1)",
  },
  backButton: {
    padding: wp(1),
  },
  headerTitle: {
    fontSize: wp(4.8),
    fontWeight: "700",
    color: "#2C1810",
    fontFamily: "System",
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(0.5),
  },
  profileImageSection: {
    alignItems: "center",
    paddingVertical: hp(1.5),
    backgroundColor: "#fff",
    marginBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 69, 19, 0.1)",
  },
  imageContainer: {
    position: "relative",
    marginBottom: hp(1),
  },
  profileImage: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(14),
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  imageEditButton: {
    position: "absolute",
    bottom: wp(1),
    right: wp(1),
    backgroundColor: "#706D75",
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageHelperText: {
    fontSize: wp(3.2),
    color: "#666",
    marginBottom: hp(0.5),
  },
  photoOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: wp(8),
  },
  photoOption: {
    alignItems: "center",
    padding: wp(2),
  },
  photoOptionText: {
    fontSize: wp(3),
    color: "#706D75",
    fontWeight: "500",
    marginTop: hp(0.5),
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: wp(4),
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    padding: wp(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(228, 112, 18, 0.1)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(2),
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 69, 19, 0.1)",
  },
  sectionTitle: {
    fontSize: wp(4),
    fontWeight: "700",
    color: "#2C1810",
    marginLeft: wp(2),
  },
  inputGroup: {
    gap: hp(2),
  },
  inputContainer: {
    marginBottom: hp(1),
  },
  label: {
    fontSize: wp(3.5),
    fontWeight: "600",
    color: "#2C1810",
    marginBottom: hp(1),
  },
  required: {
    color: "#706D75",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F5F2",
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: "rgba(228, 112, 18, 0.2)",
    paddingHorizontal: wp(3),
    overflow: "hidden",
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    minHeight: hp(10),
  },
  inputIcon: {
    marginRight: wp(2),
  },
  input: {
    flex: 1,
    fontSize: wp(3.8),
    color: "#2C1810",
    paddingVertical: hp(1.5),
  },
  textArea: {
    minHeight: hp(8),
    paddingTop: hp(1.5),
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(3),
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#F9F5F2",
    borderRadius: wp(3),
    padding: wp(3),
    borderWidth: 1,
    borderColor: "rgba(228, 112, 18, 0.15)",
  },
  infoLabel: {
    fontSize: wp(3),
    color: "#666",
    marginTop: hp(0.5),
    marginBottom: hp(0.3),
  },
  infoValue: {
    fontSize: wp(3.5),
    fontWeight: "600",
    color: "#2C1810",
    marginBottom: hp(1),
  },
  infoEditButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(228, 112, 18, 0.1)",
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(2),
  },
  infoEditText: {
    fontSize: wp(3),
    color: "#706D75",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: hp(2),
    gap: wp(3),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 69, 19, 0.1)",
  },
  cancelButtonText: {
    fontSize: wp(3.8),
    fontWeight: "600",
    color: "#374151",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#706D75",
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    shadowColor: "#706D75",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: wp(3.8),
    fontWeight: "700",
    color: "#fff",
  },
  submitIcon: {
    marginLeft: wp(1.5),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(4),
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: wp(5),
    padding: wp(6),
    width: "100%",
    maxWidth: wp(90),
    alignItems: "center",
  },
  modalIcon: {
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: wp(4.5),
    fontWeight: "700",
    color: "#2C1810",
    marginBottom: hp(1),
    textAlign: "center",
  },
  modalText: {
    fontSize: wp(3.5),
    color: "#666",
    textAlign: "center",
    lineHeight: wp(5),
    marginBottom: hp(3),
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: wp(3),
  },
  modalButton: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: wp(2.5),
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F3F4F6",
  },
  modalCancelButtonText: {
    color: "#374151",
    fontSize: wp(3.5),
    fontWeight: "600",
  },
  modalDiscardButton: {
    backgroundColor: "#706D75",
  },
  modalDiscardButtonText: {
    color: "#fff",
    fontSize: wp(3.5),
    fontWeight: "600",
  },
});