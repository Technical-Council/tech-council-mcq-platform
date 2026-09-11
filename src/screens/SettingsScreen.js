import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [userProfile, setUserProfile] = useState({
    id: '',
    fullName: '',
    branch: '',
    phone: '',
    avatarUrl: null
  });
  const [newPassword, setNewPassword] = useState('');

  // 1. Data load karo (Ab hum cloud se direct URL nikalenge)
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          id: user.id,
          fullName: user.user_metadata?.full_name || '',
          branch: user.user_metadata?.branch || '',
          phone: user.user_metadata?.phone || '',
          avatarUrl: user.user_metadata?.avatarUrl || null // Cloud URL fetching
        });
      }
    };
    loadUserData();
  }, []);

  // 2. Image Select & Upload to Supabase Storage
  // 2. Image Select & Upload to Supabase Storage (Updated & Bulletproof)
  const pickAndUploadImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) return;

      setImageUploading(true);
      const imageUri = result.assets[0].uri;
      
      // Temporary preview on screen
      setUserProfile(prev => ({ ...prev, avatarUrl: imageUri }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found!");

      console.log("1. Image selected, starting conversion...");

      // Web me image ko properly upload karne ke liye Blob conversion
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileName = `${user.id}-${Date.now()}.jpeg`; // Force JPEG extension

      console.log("2. Uploading to Supabase bucket 'avatars'...");
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { 
          contentType: 'image/jpeg', // Ye line zaroori hai web ke liye
          upsert: true 
        });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
        throw uploadError;
      }

      console.log("3. Upload Success! Getting URL...");
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log("4. Updating Profile Metadata...", publicUrl);
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatarUrl: publicUrl }
      });

      if (updateError) throw updateError;
      
      setUserProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
      alert("Profile photo updated permanently!");
      console.log("5. All Done!");

    } catch (error) {
      console.error("Final Catch Error:", error);
      alert("Upload Failed: " + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  // 3. Save Changes (Name, Branch, etc.)
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const updates = {
        data: {
          full_name: userProfile.fullName,
          branch: userProfile.branch,
          phone: userProfile.phone,
        }
      };

      if (newPassword.length > 0) {
        if (newPassword.length < 6) {
          alert("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        updates.password = newPassword;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      alert("Success! Profile details updated.");
      setNewPassword(''); 
      navigation.goBack(); 
      
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgBlobTopRight} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#1F2937" />
          <Text style={styles.backText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.pageTitle}>Profile Settings</Text>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarLarge} onPress={pickAndUploadImage} disabled={imageUploading}>
              {imageUploading ? (
                <ActivityIndicator size="large" color="#16A34A" />
              ) : userProfile.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Feather name="camera" size={32} color="#9CA3AF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.changePhotoBtn} onPress={pickAndUploadImage} disabled={imageUploading}>
              <Text style={styles.changePhotoText}>
                {imageUploading ? 'Uploading...' : 'Change Profile Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={userProfile.fullName}
              onChangeText={(text) => setUserProfile({ ...userProfile, fullName: text })}
            />

            <Text style={styles.inputLabel}>Branch</Text>
            <TextInput 
              style={styles.input} 
              value={userProfile.branch}
              onChangeText={(text) => setUserProfile({ ...userProfile, branch: text })}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput 
              style={styles.input} 
              value={userProfile.phone}
              keyboardType="phone-pad"
              onChangeText={(text) => setUserProfile({ ...userProfile, phone: text })}
            />

            <View style={styles.divider} />
            <Text style={styles.sectionSubtitle}>Security</Text>

            <Text style={styles.inputLabel}>New Password (Optional)</Text>
            <TextInput 
              style={styles.input} 
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Leave blank to keep current"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSaveChanges}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', position: 'relative' },
  bgBlobTopRight: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, backgroundColor: '#D1FAE5', borderRadius: 150, opacity: 0.6 },
  header: { paddingHorizontal: 30, paddingTop: Platform.OS === 'web' ? 40 : 60, paddingBottom: 20, zIndex: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#1F2937' },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 500, padding: 32, ...Platform.select({ web: { boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }, default: { elevation: 4 } }) },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 24, textAlign: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 12 },
  avatarImage: { width: '100%', height: '100%' },
  changePhotoBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F0FDF4' },
  changePhotoText: { color: '#16A34A', fontWeight: '600', fontSize: 14 },
  formSection: { width: '100%' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, fontSize: 15, color: '#1F2937' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  sectionSubtitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  saveBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});