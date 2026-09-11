import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { supabase } from '../services/supabase';

export default function EditTestScreen({ route, navigation }) {
  const { testId } = route.params;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Test Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  
  // Questions Master State
  const [questionsList, setQuestionsList] = useState([]);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState([]); 
  
  // UI States
  const [inputMode, setInputMode] = useState('manual');
  const [editLocalId, setEditLocalId] = useState(null);

  // Manual Form States
  const [mSection, setMSection] = useState('');
  const [mQuestion, setMQuestion] = useState('');
  const [mOpt1, setMOpt1] = useState('');
  const [mOpt2, setMOpt2] = useState('');
  const [mOpt3, setMOpt3] = useState('');
  const [mOpt4, setMOpt4] = useState('');
  const [mCorrect, setMCorrect] = useState('');

  // ==========================================
  // FETCH EXISTING TEST DATA
  // ==========================================
  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        const { data: testData, error: testErr } = await supabase.from('tests').select('*').eq('id', testId).single();
        if (testErr) throw testErr;
        
        setTitle(testData.title);
        setDescription(testData.description || '');
        setDuration(testData.duration_minutes.toString());

        const { data: qData, error: qErr } = await supabase.from('questions').select('*').eq('test_id', testId);
        if (qErr) throw qErr;

        const formattedQs = qData.map(q => ({
          id: q.id,
          Section: q.section_name,
          Question: q.question_text,
          Option1: q.options[0],
          Option2: q.options[1],
          Option3: q.options[2],
          Option4: q.options[3],
          CorrectOption: q.correct_option,
          isNew: false 
        }));
        
        setQuestionsList(formattedQs);
      } catch (error) {
        alert("Error loading test details: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetails();
  }, [testId]);

  // ==========================================
  // CSV LOGIC
  // ==========================================
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
      if (!result.canceled && result.assets.length > 0) {
        if (Platform.OS === 'web') {
          Papa.parse(result.assets[0].file, {
            header: true, skipEmptyLines: true,
            complete: function(results) {
              const newQuestions = results.data.map((item, index) => ({
                id: Date.now() + index,
                Section: item.Section, Question: item.Question,
                Option1: item.Option1, Option2: item.Option2, Option3: item.Option3, Option4: item.Option4,
                CorrectOption: item.CorrectOption,
                isNew: true 
              }));
              setQuestionsList([...questionsList, ...newQuestions]);
              alert(`${newQuestions.length} questions added from CSV!`);
            }
          });
        }
      }
    } catch (error) {
      alert("Error reading file: " + error.message);
    }
  };

  // ==========================================
  // MANUAL ADD / EDIT LOGIC
  // ==========================================
  const handleSaveManualQuestion = () => {
    if (!mQuestion || !mOpt1 || !mOpt2 || !mOpt3 || !mOpt4 || !mCorrect) {
      alert("Please fill all question fields and options.");
      return;
    }

    const existingQ = questionsList.find(q => q.id === editLocalId);
    const newQ = {
      id: editLocalId ? editLocalId : Date.now(),
      Section: mSection || 'General',
      Question: mQuestion,
      Option1: mOpt1, Option2: mOpt2, Option3: mOpt3, Option4: mOpt4,
      CorrectOption: mCorrect,
      isNew: existingQ ? existingQ.isNew : true
    };

    if (editLocalId) {
      setQuestionsList(questionsList.map(q => q.id === editLocalId ? newQ : q));
      setEditLocalId(null);
    } else {
      setQuestionsList([...questionsList, newQ]);
    }
    setMQuestion(''); setMOpt1(''); setMOpt2(''); setMOpt3(''); setMOpt4(''); setMCorrect('');
  };

  const handleEdit = (q) => {
    setInputMode('manual');
    setEditLocalId(q.id);
    setMSection(q.Section); setMQuestion(q.Question);
    setMOpt1(q.Option1); setMOpt2(q.Option2); setMOpt3(q.Option3); setMOpt4(q.Option4);
    setMCorrect(q.CorrectOption);
  };

  const handleDelete = (id) => {
    const qToDelete = questionsList.find(q => q.id === id);
    if (qToDelete && !qToDelete.isNew) {
      setDeletedQuestionIds([...deletedQuestionIds, id]);
    }
    setQuestionsList(questionsList.filter(q => q.id !== id));
  };

  // ==========================================
  // FINAL SUBMIT (UPDATE DATABASE)
  // ==========================================
  const handleUpdateTest = async () => {
    if (questionsList.length === 0) {
      alert("Test must have at least one question.");
      return;
    }

    setSaving(true);
    try {
      const { error: testError } = await supabase
        .from('tests')
        .update({ title, description, duration_minutes: parseInt(duration) })
        .eq('id', testId);
      if (testError) throw testError;

      const upsertPayload = questionsList.map((q) => {
        const payload = {
          test_id: testId,
          section_name: q.Section,
          question_text: q.Question,
          options: [q.Option1, q.Option2, q.Option3, q.Option4],
          correct_option: q.CorrectOption
        };
        if (!q.isNew) {
          payload.id = q.id;
        }
        return payload;
      });

      const { error: upsertError } = await supabase.from('questions').upsert(upsertPayload);
      if (upsertError) throw upsertError;

      if (deletedQuestionIds.length > 0) {
        const { error: delError } = await supabase.from('questions').delete().in('id', deletedQuestionIds);
        if (delError) throw delError;
      }

      alert("Success! Test updated perfectly.");
      navigation.goBack();

    } catch (error) {
      alert("Error updating test: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{marginTop: 10}}>Loading test details...</Text>
      </View>
    );
  }

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
          <Text style={styles.pageTitle}>{step === 1 ? 'Edit Basic Details' : 'Edit Questions'}</Text>

          {step === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Test Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} />

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline />

              <Text style={styles.inputLabel}>Duration (in minutes) *</Text>
              <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" />

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 24 }]} onPress={() => setStep(2)}>
                <Text style={styles.btnText}>Next: Edit Questions</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" style={{marginLeft: 8}} />
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formSection}>
              
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, inputMode === 'manual' && styles.toggleActive]} onPress={() => setInputMode('manual')}>
                  <Text style={[styles.toggleText, inputMode === 'manual' && {color:'#16A34A'}]}>Manual Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, inputMode === 'csv' && styles.toggleActive]} onPress={() => setInputMode('csv')}>
                  <Text style={[styles.toggleText, inputMode === 'csv' && {color:'#16A34A'}]}>Upload CSV</Text>
                </TouchableOpacity>
              </View>

              {inputMode === 'manual' && (
                <View style={styles.manualBox}>
                  <Text style={styles.sectionSubtitle}>{editLocalId ? 'Editing Question' : 'Add New Question'}</Text>
                  
                  <Text style={styles.inputLabel}>Section Name</Text>
                  <TextInput style={styles.input} value={mSection} onChangeText={setMSection} />
                  
                  <Text style={styles.inputLabel}>Question Text</Text>
                  <TextInput style={[styles.input, { height: 60 }]} value={mQuestion} onChangeText={setMQuestion} multiline />
                  
                  <View style={styles.optionsGrid}>
                    <View style={{flex: 1, marginRight: 10}}><Text style={styles.inputLabel}>Option 1</Text><TextInput style={styles.input} value={mOpt1} onChangeText={setMOpt1} /></View>
                    <View style={{flex: 1}}><Text style={styles.inputLabel}>Option 2</Text><TextInput style={styles.input} value={mOpt2} onChangeText={setMOpt2} /></View>
                  </View>
                  <View style={styles.optionsGrid}>
                    <View style={{flex: 1, marginRight: 10}}><Text style={styles.inputLabel}>Option 3</Text><TextInput style={styles.input} value={mOpt3} onChangeText={setMOpt3} /></View>
                    <View style={{flex: 1}}><Text style={styles.inputLabel}>Option 4</Text><TextInput style={styles.input} value={mOpt4} onChangeText={setMOpt4} /></View>
                  </View>

                  <Text style={styles.inputLabel}>Exact Correct Option</Text>
                  <TextInput style={styles.input} value={mCorrect} onChangeText={setMCorrect} />

                  <TouchableOpacity style={styles.addSaveBtn} onPress={handleSaveManualQuestion}>
                    <Text style={styles.addSaveText}>{editLocalId ? 'Update Question' : '+ Add Question'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {inputMode === 'csv' && (
                <View style={styles.uploadBox}>
                  <Feather name="file-text" size={48} color="#9CA3AF" style={{ marginBottom: 16 }} />
                  <Text style={styles.uploadTitle}>Add More Questions via CSV</Text>
                  <TouchableOpacity style={styles.uploadBtn} onPress={handleFileUpload}>
                    <Text style={styles.uploadBtnText}>Choose File</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.qListContainer}>
                <Text style={styles.listHeader}>Total Questions: {questionsList.length}</Text>
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
                onPress={handleUpdateTest}
                disabled={saving || questionsList.length === 0}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Update & Save Test</Text>}
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
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 24, textAlign: 'center' },
  formSection: { width: '100%' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14 },
  btnPrimary: { flexDirection: 'row', backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: '#FFFFFF', ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}) },
  toggleText: { fontWeight: '600', color: '#6B7280' },
  manualBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 20, backgroundColor: '#FFFFFF' },
  sectionSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  optionsGrid: { flexDirection: 'row', width: '100%' },
  addSaveBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#16A34A', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  addSaveText: { color: '#16A34A', fontWeight: 'bold' },
  uploadBox: { borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, padding: 40, alignItems: 'center', backgroundColor: '#F9FAFB' },
  uploadTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  uploadBtn: { backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  uploadBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  qListContainer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20 },
  listHeader: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  qItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  qSectionBadge: { fontSize: 11, color: '#16A34A', backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginBottom: 6, fontWeight: 'bold' },
  qText: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  actionIcons: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  iconBtn: { padding: 6, marginLeft: 8, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' }
});