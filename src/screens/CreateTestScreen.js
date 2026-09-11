import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { supabase } from '../services/supabase';

export default function CreateTestScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Test Details State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  
  // Questions Master State
  const [questionsList, setQuestionsList] = useState([]);
  
  // UI States for Step 2
  const [inputMode, setInputMode] = useState('manual'); // 'manual' or 'csv'
  const [editQuestionId, setEditQuestionId] = useState(null);

  // Manual Form States
  const [mSection, setMSection] = useState('');
  const [mQuestion, setMQuestion] = useState('');
  const [mOpt1, setMOpt1] = useState('');
  const [mOpt2, setMOpt2] = useState('');
  const [mOpt3, setMOpt3] = useState('');
  const [mOpt4, setMOpt4] = useState('');
  const [mCorrect, setMCorrect] = useState('');

  // -----------------------------------------
  // CSV LOGIC
  // -----------------------------------------
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        if (Platform.OS === 'web') {
          Papa.parse(result.assets[0].file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
              const newQuestions = results.data.map((item, index) => ({
                id: Date.now() + index, // Temp ID for UI management
                Section: item.Section,
                Question: item.Question,
                Option1: item.Option1,
                Option2: item.Option2,
                Option3: item.Option3,
                Option4: item.Option4,
                CorrectOption: item.CorrectOption
              }));
              // Merge CSV questions with existing ones
              setQuestionsList([...questionsList, ...newQuestions]);
              alert(`${newQuestions.length} questions added from CSV!`);
            }
          });
        } else {
          alert("CSV upload optimized for Web Admin.");
        }
      }
    } catch (error) {
      alert("Error reading file: " + error.message);
    }
  };

  // -----------------------------------------
  // MANUAL ADD / EDIT LOGIC
  // -----------------------------------------
  const handleSaveManualQuestion = () => {
    if (!mQuestion || !mOpt1 || !mOpt2 || !mOpt3 || !mOpt4 || !mCorrect) {
      alert("Please fill all question fields and options.");
      return;
    }

    const newQ = {
      id: editQuestionId ? editQuestionId : Date.now(),
      Section: mSection || 'General',
      Question: mQuestion,
      Option1: mOpt1,
      Option2: mOpt2,
      Option3: mOpt3,
      Option4: mOpt4,
      CorrectOption: mCorrect
    };

    if (editQuestionId) {
      // Update existing
      setQuestionsList(questionsList.map(q => q.id === editQuestionId ? newQ : q));
      setEditQuestionId(null);
    } else {
      // Add new
      setQuestionsList([...questionsList, newQ]);
    }

    // Clear form
    setMQuestion(''); setMOpt1(''); setMOpt2(''); setMOpt3(''); setMOpt4(''); setMCorrect('');
  };

  const handleEdit = (q) => {
    setInputMode('manual');
    setEditQuestionId(q.id);
    setMSection(q.Section);
    setMQuestion(q.Question);
    setMOpt1(q.Option1);
    setMOpt2(q.Option2);
    setMOpt3(q.Option3);
    setMOpt4(q.Option4);
    setMCorrect(q.CorrectOption);
  };

  const handleDelete = (id) => {
    setQuestionsList(questionsList.filter(q => q.id !== id));
  };

  // -----------------------------------------
  // FINAL SUBMIT TO DATABASE
  // -----------------------------------------
  const handleCreateTest = async () => {
    if (questionsList.length === 0) {
      alert("Please add at least one question.");
      return;
    }

    setLoading(true);
    try {
      // 1. Insert Test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title: title,
          description: description,
          duration_minutes: parseInt(duration),
          status: 'draft'
        })
        .select()
        .single();

      if (testError) throw testError;

      // 2. Format Questions
      const questionsToInsert = questionsList.map((q) => ({
        test_id: testData.id,
        section_name: q.Section,
        question_text: q.Question,
        options: [q.Option1, q.Option2, q.Option3, q.Option4],
        correct_option: q.CorrectOption
      }));

      // 3. Bulk Insert
      const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
      if (qError) throw qError;

      alert("Success! Test created.");
      navigation.navigate('AdminDashboard');

    } catch (error) {
      alert("Error saving test: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#1F2937" />
          <Text style={styles.backText}>{step === 2 ? 'Back to Details' : 'Back to Dashboard'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          
          <View style={styles.progressRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step === 2 && styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
          </View>
          <Text style={styles.pageTitle}>{step === 1 ? 'Basic Details' : 'Manage Questions'}</Text>

          {/* ================= STEP 1: BASIC DETAILS ================= */}
          {step === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Test Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Data Structures Challenge" />

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline />

              <Text style={styles.inputLabel}>Duration (in minutes) *</Text>
              <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="60" />

              <TouchableOpacity 
                style={[styles.btnPrimary, { marginTop: 24 }]} 
                onPress={() => {
                  if(!title || !duration) alert("Title and Duration required!");
                  else setStep(2);
                }}
              >
                <Text style={styles.btnText}>Next: Add Questions</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" style={{marginLeft: 8}} />
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 2: QUESTIONS WIZARD ================= */}
          {step === 2 && (
            <View style={styles.formSection}>
              
              {/* Toggle Manual / CSV */}
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, inputMode === 'manual' && styles.toggleActive]} onPress={() => setInputMode('manual')}>
                  <Text style={[styles.toggleText, inputMode === 'manual' && {color:'#16A34A'}]}>Manual Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, inputMode === 'csv' && styles.toggleActive]} onPress={() => setInputMode('csv')}>
                  <Text style={[styles.toggleText, inputMode === 'csv' && {color:'#16A34A'}]}>Upload CSV</Text>
                </TouchableOpacity>
              </View>

              {/* MANUAL FORM */}
              {inputMode === 'manual' && (
                <View style={styles.manualBox}>
                  <Text style={styles.sectionSubtitle}>{editQuestionId ? 'Edit Question' : 'Add New Question'}</Text>
                  
                  <Text style={styles.inputLabel}>Section Name</Text>
                  <TextInput style={styles.input} value={mSection} onChangeText={setMSection} placeholder="e.g. Logical Reasoning" />
                  
                  <Text style={styles.inputLabel}>Question Text</Text>
                  <TextInput style={[styles.input, { height: 60 }]} value={mQuestion} onChangeText={setMQuestion} multiline />
                  
                  <View style={styles.optionsGrid}>
                    <View style={{flex: 1, marginRight: 10}}>
                      <Text style={styles.inputLabel}>Option 1</Text>
                      <TextInput style={styles.input} value={mOpt1} onChangeText={setMOpt1} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.inputLabel}>Option 2</Text>
                      <TextInput style={styles.input} value={mOpt2} onChangeText={setMOpt2} />
                    </View>
                  </View>
                  <View style={styles.optionsGrid}>
                    <View style={{flex: 1, marginRight: 10}}>
                      <Text style={styles.inputLabel}>Option 3</Text>
                      <TextInput style={styles.input} value={mOpt3} onChangeText={setMOpt3} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.inputLabel}>Option 4</Text>
                      <TextInput style={styles.input} value={mOpt4} onChangeText={setMOpt4} />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Exact Correct Option (Text must match)</Text>
                  <TextInput style={styles.input} value={mCorrect} onChangeText={setMCorrect} placeholder="Paste the correct option here" />

                  <TouchableOpacity style={styles.addSaveBtn} onPress={handleSaveManualQuestion}>
                    <Text style={styles.addSaveText}>{editQuestionId ? 'Update Question' : '+ Add Question'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CSV UPLOAD */}
              {inputMode === 'csv' && (
                <View style={styles.uploadBox}>
                  <Feather name="file-text" size={48} color="#9CA3AF" style={{ marginBottom: 16 }} />
                  <Text style={styles.uploadTitle}>Bulk Upload via CSV</Text>
                  <Text style={styles.uploadDesc}>Headers: Section, Question, Option1, Option2, Option3, Option4, CorrectOption</Text>
                  <TouchableOpacity style={styles.uploadBtn} onPress={handleFileUpload}>
                    <Text style={styles.uploadBtnText}>Choose File</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* LIST OF ADDED QUESTIONS */}
              <View style={styles.qListContainer}>
                <Text style={styles.listHeader}>Total Added: {questionsList.length}</Text>
                {questionsList.map((q, idx) => (
                  <View key={q.id} style={styles.qItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.qSectionBadge}>{q.Section}</Text>
                      <Text style={styles.qText}>Q{idx + 1}. {q.Question}</Text>
                    </View>
                    <View style={styles.actionIcons}>
                      <TouchableOpacity onPress={() => handleEdit(q)} style={styles.iconBtn}>
                        <Feather name="edit-2" size={18} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(q.id)} style={styles.iconBtn}>
                        <Feather name="trash-2" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.btnPrimary, { marginTop: 32, backgroundColor: questionsList.length > 0 ? '#16A34A' : '#9CA3AF' }]} 
                onPress={handleCreateTest}
                disabled={loading || questionsList.length === 0}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Finish & Create Test</Text>}
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 30, paddingTop: 40, paddingBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#1F2937' },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 750, padding: 32, ...Platform.select({ web: { boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }, default: { elevation: 4 } }) },
  
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: '#16A34A' },
  stepNum: { color: '#FFFFFF', fontWeight: 'bold' },
  stepLine: { width: 100, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 24, textAlign: 'center' },
  formSection: { width: '100%' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14 },
  
  btnPrimary: { flexDirection: 'row', backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  
  // Tabs
  toggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: '#FFFFFF', ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}) },
  toggleText: { fontWeight: '600', color: '#6B7280' },
  
  // Manual Box
  manualBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 20, backgroundColor: '#FFFFFF' },
  sectionSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  optionsGrid: { flexDirection: 'row', width: '100%' },
  addSaveBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#16A34A', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  addSaveText: { color: '#16A34A', fontWeight: 'bold' },
  
  // CSV Box
  uploadBox: { borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, padding: 40, alignItems: 'center', backgroundColor: '#F9FAFB' },
  uploadTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  uploadDesc: { textAlign: 'center', color: '#6B7280', marginTop: 8, marginBottom: 24, fontSize: 12 },
  uploadBtn: { backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  uploadBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  
  // List
  qListContainer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20 },
  listHeader: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  qItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  qSectionBadge: { fontSize: 11, color: '#16A34A', backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginBottom: 6, fontWeight: 'bold' },
  qText: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  actionIcons: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  iconBtn: { padding: 6, marginLeft: 8, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' }
});