import React, { useState, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator, Alert
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';

export default function AdminDashboardScreen({ navigation }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchTests();
    }, [])
  );

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      alert("Error fetching tests: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      alert("Error logging out: " + error.message);
    }
  };

  // ==========================================
  // LIVE / DRAFT TOGGLE LOGIC
  // ==========================================
  const toggleTestStatus = async (testId, currentStatus) => {
    const newStatus = currentStatus === 'live' ? 'draft' : 'live';
    try {
      const { error } = await supabase
        .from('tests')
        .update({ status: newStatus })
        .eq('id', testId);
      
      if (error) throw error;
      
      // Update local state directly so UI changes instantly
      setTests(tests.map(t => t.id === testId ? { ...t, status: newStatus } : t));
    } catch (error) {
      alert("Error updating test status: " + error.message);
    }
  };

  // ==========================================
  // DELETE LOGIC
  // ==========================================
  const executeDelete = async (testId) => {
    try {
      await supabase.from('questions').delete().eq('test_id', testId);
      await supabase.from('test_attempts').delete().eq('test_id', testId);
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      
      if (error) throw error;
      fetchTests(); 
    } catch (error) {
      alert("Error deleting test: " + error.message);
    }
  };

  const confirmDelete = (testId, testTitle) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to permanently delete "${testTitle}"?`);
      if (confirm) executeDelete(testId);
    } else {
      Alert.alert(
        "Delete Test", `Are you sure you want to permanently delete "${testTitle}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => executeDelete(testId) }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navbar}>
        <View style={styles.logoRow}>
          <MaterialIcons name="admin-panel-settings" size={32} color="#16A34A" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.brandTitle}>ADMIN PANEL</Text>
            <Text style={styles.brandSubtitle}>Manage MCQ Platform</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.mainContent}>
        
        <View style={styles.headerArea}>
          <View>
            <Text style={styles.pageTitle}>Manage Tests</Text>
            <Text style={styles.pageSubtitle}>Create, edit and manage your tests.</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateTest')}>
            <Feather name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Test</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#16A34A" />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {tests.length > 0 ? (
              tests.map((test) => (
                <View key={test.id} style={styles.testCard}>
                  <View style={styles.testInfo}>
                    <Text style={styles.testTitle}>{test.title}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaBadge}>
                        <Feather name="clock" size={14} color="#6B7280" />
                        <Text style={styles.metaText}>{test.duration_minutes} mins</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionsContainer}>
                    
                    {/* TOGGLE LIVE/DRAFT BUTTON (Fixed) */}
                    <TouchableOpacity 
                      style={[styles.statusBadge, test.status === 'live' ? styles.statusLive : styles.statusDraft]}
                      onPress={() => toggleTestStatus(test.id, test.status)}
                    >
                      <Text style={[styles.statusText, test.status === 'live' ? styles.statusTextLive : styles.statusTextDraft]}>
                        {test.status === 'live' ? 'LIVE' : 'DRAFT'}
                      </Text>
                    </TouchableOpacity>

                    {/* EDIT BUTTON */}
                    <TouchableOpacity 
                      style={styles.iconBtn}
                      onPress={() => navigation.navigate('EditTest', { testId: test.id })}
                    >
                      <Feather name="edit-2" size={18} color="#4B5563" />
                    </TouchableOpacity>

                    {/* DELETE BUTTON */}
                    <TouchableOpacity 
                      style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => confirmDelete(test.id, test.title)}
                    >
                      <Feather name="trash-2" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Feather name="folder-minus" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No tests created yet.</Text>
                <Text style={styles.emptySubText}>Click the "Create Test" button to get started.</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 30, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerTextContainer: { marginLeft: 12 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  brandSubtitle: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  logoutText: { marginLeft: 8, color: '#DC2626', fontWeight: 'bold', fontSize: 14 },
  mainContent: { padding: 30, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  headerArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, ...Platform.select({ web: { flexWrap: 'wrap', gap: 16 }}) },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  pageSubtitle: { fontSize: 15, color: '#6B7280' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}) },
  createBtnText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  loaderContainer: { padding: 50, alignItems: 'center' },
  listContainer: { width: '100%' },
  testCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ web: { boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }, default: { elevation: 2 }}) },
  testInfo: { flex: 1 },
  testTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metaBadge: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#6B7280', marginLeft: 6, fontWeight: '500' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  // Status Badge / Button Styles
  statusBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  statusLive: { backgroundColor: '#DCFCE7' },
  statusDraft: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  statusTextLive: { color: '#16A34A' },
  statusTextDraft: { color: '#6B7280' },
  
  iconBtn: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 }
});