import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function TestInstructionsScreen({ route, navigation }) {
  const { test } = route.params; 
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [hasAttempted, setHasAttempted] = useState(false);
  const [checkingAttempt, setCheckingAttempt] = useState(true);

  // STRICT ATTEMPT CHECK
  useEffect(() => {
    const checkPreviousAttempt = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('test_attempts')
            .select('id, status')
            .eq('student_id', user.id)
            .eq('test_id', test.id);
          
          // Agar ek bhi record exist karta hai, matlab attempt ho chuka hai
          if (data && data.length > 0) {
            setHasAttempted(true); 
          }
        }
      } catch (err) {
        console.error("Attempt check error:", err);
      } finally {
        setCheckingAttempt(false);
      }
    };
    checkPreviousAttempt();
  }, [test.id]);

  const enterFullScreenAndStart = async () => {
    if (!isChecked) {
      alert("Please agree to the instructions first.");
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // INSERT "in_progress" ROW (Locks the attempt permanently)
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          student_id: user.id,
          test_id: test.id,
          status: 'in_progress', 
          score: 0,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Force Web Full-Screen
      if (Platform.OS === 'web') {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      }

      setTimeout(() => {
        setLoading(false);
        navigation.replace('TestEngine', { test, attemptId: attemptData.id });
      }, 1500);

    } catch (error) {
      alert("Error starting test: " + error.message);
      setLoading(false);
    }
  };

  if (checkingAttempt) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{marginTop: 10, fontWeight: 'bold'}}>Verifying student records...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Feather name="shield" size={64} color="#16A34A" style={{ marginBottom: 16 }} />
            <Text style={styles.loadingTitle}>Entering Secure Test Environment...</Text>
            <Text style={styles.loadingSub}>Locking screen and registering your attempt.</Text>
          </View>
        ) : hasAttempted ? (
          <View style={styles.loadingContainer}>
            <Feather name="alert-triangle" size={64} color="#DC2626" style={{ marginBottom: 16 }} />
            <Text style={styles.loadingTitle}>Attempt Restricted!</Text>
            <Text style={styles.loadingSub}>You have already attempted or abandoned this test. Multiple attempts are not allowed.</Text>
            <TouchableOpacity style={[styles.startBtn, { marginTop: 20 }]} onPress={() => navigation.goBack()}>
              <Text style={styles.startBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{test.title}</Text>
            
            <View style={styles.metaRow}>
              <Text style={styles.metaText}><Feather name="file-text"/> Multiple Choice</Text>
              <Text style={styles.metaText}><Feather name="clock"/> {test.duration_minutes} Minutes</Text>
            </View>

            <View style={styles.instructionBox}>
              <Text style={styles.instTitle}>Important Instructions & Anti-Cheat</Text>
              <Text style={styles.instItem}>• The test will open in <Text style={{fontWeight:'bold'}}>Strict Full-Screen Mode</Text>.</Text>
              <Text style={styles.instItem}>• <Text style={{fontWeight:'bold', color:'#DC2626'}}>DO NOT exit full-screen, switch tabs, or open other apps.</Text></Text>
              <Text style={styles.instItem}>• Exiting the secure environment will trigger an immediate warning or auto-submission.</Text>
              <Text style={styles.instItem}>• Copy/Paste and screenshots are disabled.</Text>
            </View>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsChecked(!isChecked)}>
              <View style={[styles.checkbox, isChecked && styles.checkedBox]}>
                {isChecked && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>I agree to the strict anti-cheat rules and regulations.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.startBtn, !isChecked && { backgroundColor: '#9CA3AF' }]} 
              onPress={enterFullScreenAndStart}
              disabled={!isChecked}
            >
              <Text style={styles.startBtnText}>Start Test in Secure Mode</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 700, padding: 40, ...Platform.select({ web: { boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }, default: { elevation: 5 } }) },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 20 },
  metaText: { color: '#4B5563', fontWeight: '600', fontSize: 14 },
  instructionBox: { backgroundColor: '#F9FAFB', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 },
  instTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  instItem: { fontSize: 14, color: '#4B5563', marginBottom: 6, lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#16A34A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkedBox: { backgroundColor: '#16A34A' },
  checkboxLabel: { fontSize: 14, color: '#374151', fontWeight: '500', flex: 1 },
  startBtn: { backgroundColor: '#16A34A', paddingVertical: 16, borderRadius: 12, alignItems: 'center', paddingHorizontal: 20 },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  loadingSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 }
});