import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Platform,
  ActivityIndicator,
  AppState,
  BackHandler
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { supabase } from '../services/supabase';

export default function TestScreen({ route, navigation }) {
  const { test, attemptId } = route.params; 
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // States for LMS tracking
  const [selectedAnswers, setSelectedAnswers] = useState({}); 
  const [markedForReview, setMarkedForReview] = useState({}); 
  const [isFullScreenLock, setIsFullScreenLock] = useState(true); // ENFORCE FULL SCREEN
  
  const totalTimeSeconds = test.duration_minutes * 60;
  const [timeLeft, setTimeLeft] = useState(totalTimeSeconds);

  const appState = useRef(AppState.currentState);
  const isSubmitting = useRef(false); 

  if (Platform.OS !== 'web') {
    ScreenCapture.usePreventScreenCapture();
  }

  // ==========================================
  // JABARDASTI FULL-SCREEN ENFORCEMENT & SECURITY
  // ==========================================
  useEffect(() => {
    const backAction = () => {
      alert("SECURITY WARNING: You cannot go back during a live test! Use the Submit button.");
      return true; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (!isSubmitting.current) {
          alert("SECURITY VIOLATION: You switched apps or minimized the test. Auto-submitting...");
          handleSubmitTest('disqualified');
        }
      }
      appState.current = nextAppState;
    });

    let preventDefaultAction, preventKeyboardShortcuts, handleVisibilityChange, handleFullScreenChange;
    
    if (Platform.OS === 'web') {
      preventDefaultAction = (e) => { e.preventDefault(); };
      
      preventKeyboardShortcuts = (e) => {
        if (e.key === 'PrintScreen' || (e.ctrlKey && ['c', 'v', 'x', 'p', 's'].includes(e.key.toLowerCase())) || (e.metaKey && ['c', 'v', 'x', 'p', 's'].includes(e.key.toLowerCase()))) {
          e.preventDefault(); alert("Screenshots and Copy/Paste are strictly prohibited!");
        }
      };

      handleVisibilityChange = () => {
        if (document.hidden && !isSubmitting.current) {
          alert("SECURITY VIOLATION: You switched tabs. Auto-submitting...");
          handleSubmitTest('disqualified');
        }
      };

      // ZIDDI FULL SCREEN TRACKER
      handleFullScreenChange = () => {
        if (!document.fullscreenElement && !isSubmitting.current) {
          setIsFullScreenLock(false); // Lock the screen if they exit
        } else {
          setIsFullScreenLock(true);
        }
      };

      document.addEventListener('contextmenu', preventDefaultAction);
      document.addEventListener('copy', preventDefaultAction);
      document.addEventListener('keydown', preventKeyboardShortcuts);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullScreenChange);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener('contextmenu', preventDefaultAction);
        document.removeEventListener('copy', preventDefaultAction);
        document.removeEventListener('keydown', preventKeyboardShortcuts);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, selectedAnswers, timeLeft]);

  const forceReturnToFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => alert("Please press F11 or enable full screen to continue."));
    }
  };

  // ==========================================
  // FETCH QUESTIONS & TIMER
  // ==========================================
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase.from('questions').select('*').eq('test_id', test.id);
        if (error) throw error;
        setQuestions(data || []);
      } catch (err) {
        alert("Error loading questions: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [test.id]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitTest('completed'); 
      return;
    }
    if (!isFullScreenLock && Platform.OS === 'web') return; 

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isFullScreenLock]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: option });
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview({ ...markedForReview, [questionId]: !markedForReview[questionId] });
  };

  // ==========================================
  // 🚀 FINAL SUBMIT (SMART SCORE FIX)
  // ==========================================
  const handleSubmitTest = async (finalStatus = 'completed') => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    try {
      // 1. SMART SCORE CALCULATION
      let calculatedScore = 0;
      questions.forEach(q => {
        if (selectedAnswers[q.id] && q.correct_option) {
          const studentAns = selectedAnswers[q.id].toString().toLowerCase().trim();
          const correctAns = q.correct_option.toString().toLowerCase().trim();

          if (
            studentAns === correctAns || 
            studentAns.includes(correctAns) || 
            correctAns.includes(studentAns)
          ) {
            calculatedScore += 1;
          }
        }
      });

      const timeTakenSeconds = totalTimeSeconds - timeLeft;

      const payloadData = {
        answers: selectedAnswers,
        review_marked: markedForReview
      };

      const { error } = await supabase
        .from('test_attempts')
        .update({
          status: finalStatus,
          score: calculatedScore,
          total_questions: questions.length,
          time_taken_seconds: timeTakenSeconds,
          responses: payloadData,
          completed_at: new Date().toISOString()
        })
        .eq('id', attemptId); 

      if (error) throw error;

      if (Platform.OS === 'web' && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      alert("Test Submitted Successfully!\nYour results are saved securely.");
      navigation.replace('Dashboard');

    } catch (err) {
      alert("Submission Error: " + err.message);
      isSubmitting.current = false;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 12, fontWeight: '600' }}>Loading Secure Environment...</Text>
      </View>
    );
  }

  // JABARDASTI OVERLAY UI
  if (!isFullScreenLock && Platform.OS === 'web') {
    return (
      <View style={styles.lockScreenContainer}>
        <Feather name="maximize" size={64} color="#DC2626" style={{marginBottom: 20}} />
        <Text style={styles.lockScreenTitle}>Full-Screen Exited!</Text>
        <Text style={styles.lockScreenSub}>You are required to stay in full-screen mode to continue this test. The timer has been paused.</Text>
        <TouchableOpacity style={styles.returnFsBtn} onPress={forceReturnToFullScreen}>
          <Text style={styles.returnFsBtnText}>Return to Full Screen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.returnFsBtn, {backgroundColor: '#FEF2F2', marginTop: 16}]} onPress={() => handleSubmitTest('disqualified')}>
          <Text style={[styles.returnFsBtnText, {color: '#DC2626'}]}>Submit & Exit Test</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <View style={styles.container}>
      
      {/* TOP HEADER */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <MaterialIcons name="view-in-ar" size={28} color="#16A34A" />
          <Text style={styles.brandTitle}>{test.title}</Text>
        </View>
        <View style={styles.topRightControls}>
          <View style={styles.timerBadge}>
            <Feather name="clock" size={16} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerSub}>Time Remaining</Text>
          </View>
          <TouchableOpacity style={styles.endTestBtn} onPress={() => handleSubmitTest('completed')}>
            <Text style={styles.endTestText}>End Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.examBody}>
        
        {/* LEFT: QUESTION PANE */}
        <View style={styles.questionPane}>
          <View style={styles.qHeaderRow}>
            <Text style={styles.qCountText}>Question {currentIndex + 1} of {questions.length}</Text>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{currentQ?.section_name || 'General'}</Text></View>
          </View>

          <Text style={styles.questionText} selectable={false}>{currentQ?.question_text}</Text>

          <View style={styles.optionsList}>
            {currentQ?.options?.map((opt, idx) => {
              const isSelected = selectedAnswers[currentQ.id] === opt;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                  onPress={() => handleSelectOption(currentQ.id, opt)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, isSelected && styles.selectedRadio]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.selectedOptionText]} selectable={false}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* NAVIGATION BUTTONS */}
          <View style={styles.navButtonsRow}>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity 
                style={[styles.navBtn, currentIndex === 0 && { opacity: 0.5 }]} 
                disabled={currentIndex === 0}
                onPress={() => setCurrentIndex(currentIndex - 1)}
              >
                <Feather name="arrow-left" size={18} color="#374151" style={{ marginRight: 6 }} />
                <Text style={styles.navBtnText}>Previous</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navBtn, {backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1}]} 
                onPress={() => toggleMarkForReview(currentQ.id)}
              >
                <Feather name="bookmark" size={18} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={[styles.navBtnText, {color: '#D97706'}]}>
                  {markedForReview[currentQ.id] ? 'Unmark' : 'Mark for Review'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.nextBtn} 
              onPress={() => {
                if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
                else handleSubmitTest('completed');
              }}
            >
              <Text style={styles.nextBtnText}>{currentIndex === questions.length - 1 ? 'Submit Test' : 'Save and Next'}</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT: QUESTION PALETTE */}
        <View style={styles.palettePane}>
          <Text style={styles.paletteTitle} selectable={false}>Question Palette</Text>
          
          <View style={styles.paletteLegend}>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#16A34A'}]}/><Text style={styles.legendText}>Answered</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#E5E7EB'}]}/><Text style={styles.legendText}>Unanswered</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#F59E0B'}]}/><Text style={styles.legendText}>Review</Text></View>
          </View>

          <ScrollView contentContainerStyle={styles.gridContainer}>
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isMarked = markedForReview[q.id];
              const isCurrent = currentIndex === idx;

              let bgColor = '#F3F4F6';
              let borderColor = '#E5E7EB';
              let textColor = '#374151';

              if (isMarked) { bgColor = '#FEF3C7'; borderColor = '#F59E0B'; textColor = '#D97706'; }
              else if (isAnswered) { bgColor = '#DCFCE7'; borderColor = '#16A34A'; textColor = '#16A34A'; }

              return (
                <TouchableOpacity 
                  key={q.id}
                  style={[
                    styles.gridBox, 
                    { backgroundColor: bgColor, borderColor: borderColor },
                    isCurrent && { borderWidth: 2, borderColor: '#111827' }
                  ]}
                  onPress={() => setCurrentIndex(idx)}
                >
                  <Text style={[styles.gridBoxText, { color: textColor, fontWeight: (isAnswered || isMarked) ? 'bold' : '600' }]}>{idx + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', ...Platform.select({ web: { userSelect: 'none', WebkitUserSelect: 'none' } }) },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  
  lockScreenContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 40 },
  lockScreenTitle: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  lockScreenSub: { fontSize: 16, color: '#4B5563', textAlign: 'center', maxWidth: 600, marginBottom: 30 },
  returnFsBtn: { backgroundColor: '#16A34A', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  returnFsBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 30, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  brandTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 10 },
  topRightControls: { flexDirection: 'row', alignItems: 'center' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0', marginRight: 16 },
  timerText: { fontSize: 16, fontWeight: 'bold', color: '#16A34A', marginLeft: 6 },
  timerSub: { fontSize: 11, color: '#6B7280', marginLeft: 8 },
  endTestBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  endTestText: { color: '#DC2626', fontWeight: 'bold', fontSize: 14 },
  
  examBody: { flex: 1, flexDirection: 'row', padding: 24, gap: 24 },
  questionPane: { flex: 3, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, ...Platform.select({ web: { boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}) },
  qHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qCountText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280' },
  sectionBadge: { backgroundColor: '#F0FDF4', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  sectionBadgeText: { color: '#16A34A', fontWeight: 'bold', fontSize: 12 },
  questionText: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 24, lineHeight: 28 },
  
  optionsList: { marginBottom: 30 },
  optionCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 16, marginBottom: 12, backgroundColor: '#F9FAFB' },
  selectedOptionCard: { backgroundColor: '#F0FDF4', borderColor: '#16A34A' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  selectedRadio: { borderColor: '#16A34A' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16A34A' },
  optionText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  selectedOptionText: { color: '#111827', fontWeight: 'bold' },
  
  navButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 20 },
  navBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  navBtnText: { fontWeight: '600', color: '#374151' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  nextBtnText: { fontWeight: 'bold', color: '#FFFFFF' },
  
  palettePane: { width: 300, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, ...Platform.select({ web: { boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}) },
  paletteTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  paletteLegend: { flexDirection: 'row', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 11, color: '#6B7280' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridBox: { width: 42, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  gridBoxText: { fontSize: 14 }
});