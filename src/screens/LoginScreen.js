import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Platform,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

// Custom Input Component design ko match karne ke liye (Icon + Input)
const CustomInput = ({ icon, label, placeholder, secureTextEntry, value, onChangeText, keyboardType, isActive }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputContainer, 
        (isFocused || isActive) && styles.inputContainerFocused // Active hone par Green border
      ]}>
        <View style={[styles.iconBox, (isFocused || isActive) && styles.iconBoxFocused]}>
          <MaterialIcons name={icon} size={20} color={(isFocused || isActive) ? "#16A34A" : "#6B7280"} />
        </View>
        <TextInput 
          style={styles.textInput} 
          placeholder={placeholder} 
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
};

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Authentication Logic (Same as before)
  const handleAuth = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      alert("Error: Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      alert("Error: Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) throw error;
      } else {
        if (!fullName) {
          alert("Error: Full Name is required for registration.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { full_name: fullName, branch: branch, phone: phone, role: 'student' }
          }
        });

        if (error) throw error;
        alert("Success: Registration complete! You can now log in.");
        setIsLogin(true);
        setPassword('');
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background decoration matching the image */}
      <View style={styles.bgBlobTopRight} />
      <View style={styles.bgBlobBottomLeft} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          
          {/* Header Area with Logo */}
          <View style={styles.headerArea}>
            <View style={styles.logoRow}>

              {/* Council Logo */}
              <Image
                source={require('../../assests/favicon.png')}
                style={styles.logo}
              />

              <View style={styles.headerTextContainer}>
                <Text style={styles.brandTitle}>TECH COUNCIL</Text>
                <Text style={styles.brandSubtitle}>MCQ PLATFORM</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, isLogin && styles.tabButtonActive]} 
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>LOGIN</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, !isLogin && styles.tabButtonActive]} 
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>REGISTER</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.heading}>
              {isLogin ? 'Enter your Details to Login' : 'Create a New Account'}
            </Text>

            {/* LOGIN FORM */}
            {isLogin ? (
              <View>
                <CustomInput 
                  label="Mail" 
                  icon="person" 
                  placeholder="Enter your Email Address" 
                  value={email}
                  onChangeText={setEmail}
                  isActive={true} // Matching the image's green border highlight
                />

                <CustomInput 
                  label="Password" 
                  icon="lock" 
                  placeholder="Enter your Password" 
                  secureTextEntry 
                  value={password}
                  onChangeText={setPassword}
                  isActive={true}
                />
                
                {/* Remember Me & Forgot Password Row */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity style={styles.checkboxRow}>
                    <MaterialIcons name="check-box" size={20} color="#16A34A" />
                    <Text style={styles.rememberText}>Remember Me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.actionBtn, loading && { opacity: 0.7 }]} 
                  onPress={handleAuth} 
                  disabled={loading}
                >
                  <Text style={styles.actionBtnText}>
                    {loading ? 'Logging in...' : 'Log In'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.switchRow}>
                  <Text style={styles.switchTextNormal}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => setIsLogin(false)}>
                    <Text style={styles.switchTextLink}>New Registration</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* REGISTER FORM */
              <View>
                <CustomInput 
                  label="Name" 
                  icon="person" 
                  placeholder="Enter Full Name" 
                  value={fullName}
                  onChangeText={setFullName}
                />

                <CustomInput 
                  label="Mail" 
                  icon="mail" 
                  placeholder="Enter Email Address" 
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />

                <CustomInput 
                  label="Branch" 
                  icon="domain" 
                  placeholder="Select your Branch" 
                  value={branch}
                  onChangeText={setBranch}
                />

                <CustomInput 
                  label="Phone No." 
                  icon="phone" 
                  placeholder="Enter Phone Number" 
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <CustomInput 
                  label="Create Password" 
                  icon="lock" 
                  placeholder="Create a Password" 
                  secureTextEntry 
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity 
                  style={[styles.actionBtn, loading && { opacity: 0.7 }, { marginTop: 16 }]} 
                  onPress={handleAuth} 
                  disabled={loading}
                >
                  <Text style={styles.actionBtnText}>
                    {loading ? 'Registering...' : 'Register'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.switchRow}>
                  <Text style={styles.switchTextNormal}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => setIsLogin(true)}>
                    <Text style={styles.switchTextLink}>Log In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// STYLES 
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB', // Light gray/white background
    position: 'relative'
  },

  // Decorative Background blobs mimicking the image
  bgBlobTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: '#D1FAE5', // Very light green
    borderRadius: 150,
    opacity: 0.5,
  },

  bgBlobBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 400,
    height: 400,
    backgroundColor: '#D1FAE5',
    borderRadius: 200,
    opacity: 0.5,
  },

  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },

  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    width: '100%', 
    maxWidth: 480, // Perfect size for web and mobile
    overflow: 'hidden',
    ...Platform.select({ 
      web: { boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }, 
      default: { elevation: 5 } 
    }) 
  },

  headerArea: {
    backgroundColor: '#F0FDF4', // Light green header background
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Council Logo
  logo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },

  headerTextContainer: {
    marginLeft: 12,
  },

  brandTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#111827',
    letterSpacing: 0.5,
  },

  brandSubtitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#111827', 
  },

  tabContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
  },

  tabButton: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  tabButtonActive: { 
    borderBottomWidth: 3, 
    borderBottomColor: '#16A34A' 
  },

  tabText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#6B7280' 
  },

  tabTextActive: { 
    color: '#16A34A' 
  },

  formContainer: {
    padding: 24,
  },

  heading: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 20,
    textAlign: 'center'
  },

  // Custom Input Styles
  inputWrapper: { 
    marginBottom: 16 
  },

  inputLabel: { 
    fontSize: 13, 
    color: '#374151', 
    marginBottom: 6, 
    fontWeight: '500' 
  },

  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB', // Default gray border
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6', // Default gray background
  },

  inputContainerFocused: {
    borderColor: '#16A34A', // Green border when active/focused
    backgroundColor: '#FFFFFF',
  },

  iconBox: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
  },

  iconBoxFocused: {
    backgroundColor: '#F0FDF4',
    borderRightColor: '#16A34A',
  },

  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },

  // Options Row (Remember Me)
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rememberText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  forgotText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },

  actionBtn: { 
    backgroundColor: '#16A34A', 
    borderRadius: 8, 
    paddingVertical: 14, 
    alignItems: 'center', 
    ...Platform.select({ 
      web: { boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }, 
      default: { elevation: 3 } 
    }) 
  },

  actionBtnText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  switchTextNormal: {
    color: '#6B7280',
    fontSize: 14,
  },

  switchTextLink: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '600',
  }
});