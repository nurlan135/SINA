// src/screens/StartExamScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { supabase } from '../lib/supabaseClient'; // supabaseClient.js faylının düzgün yolunu göstərin
import { useRoute } from '@react-navigation/native'; // useRoute əlavə edildi

export default function StartExamScreen({ navigation }) {
  const route = useRoute();
  const isGuestMode = route.params?.isGuest || false;

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]); // Çoxlu seçim üçün massiv
  const [numberOfQuestions, setNumberOfQuestions] = useState('');
  const [examDurationMinutes, setExamDurationMinutes] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Fənləri çək
  useEffect(() => {
    async function fetchSubjects() {
      setLoadingSubjects(true);
      setSelectedSubjectIds([]); // Ekran yüklənəndə əvvəlki seçimləri təmizlə
      setNumberOfQuestions(''); // Sahələri təmizlə
      setExamDurationMinutes(''); // Sahələri təmizlə
      try {
        const { data, error } = await supabase.from('subjects').select('id, name');
        if (error) throw error;
        if (data) {
          console.log("StartExamScreen: Subjects fetched:", data);
          setSubjects(data);
        } else {
          console.log("StartExamScreen: No subjects data returned.");
          setSubjects([]);
        }
      } catch (error) {
        console.error("StartExamScreen: Error fetching subjects:", error);
        Alert.alert('Fənn Siyahısı Xətası', error.message);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    }
    fetchSubjects();
  }, []); // Yalnız ilk render-də işə düşsün

  const toggleSubjectSelection = (subjectId) => {
    console.log("StartExamScreen: Toggling selection for subject ID:", subjectId);
    setSelectedSubjectIds((prevSelected) => {
      let newSelected;
      if (prevSelected.includes(subjectId)) {
        newSelected = prevSelected.filter((id) => id !== subjectId); // Əgər seçilibsə, seçimdən çıxar
      } else {
        newSelected = [...prevSelected, subjectId]; // Əgər seçilməyibsə, əlavə et
      }
      console.log("StartExamScreen: New selectedSubjectIds:", newSelected);
      return newSelected;
    });
  };

  const handleStartExam = () => {
    if (selectedSubjectIds.length === 0) {
      Alert.alert('Xəta', 'Zəhmət olmasa, ən azı bir fənn seçin.');
      return;
    }
    const numQuestions = parseInt(numberOfQuestions, 10);
    const duration = parseInt(examDurationMinutes, 10);

    if (isNaN(numQuestions) || numQuestions <= 0) {
      Alert.alert('Xəta', 'Zəhmət olmasa, düzgün sual sayı daxil edin (məsələn, 5, 10).');
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Xəta', 'Zəhmət olmasa, düzgün imtahan müddəti daxil edin (dəqiqə ilə).');
      return;
    }

    const selectedSubjectNames = subjects
      .filter(s => selectedSubjectIds.includes(s.id))
      .map(s => s.name)
      .join(', ');

    console.log('StartExamScreen: Navigating to ExamScreen with params:', {
        subjectIds: selectedSubjectIds,
        numberOfQuestions: numQuestions,
        examDurationMinutes: duration,
        isGuest: isGuestMode,
    });

    navigation.navigate('Exam', { 
      subjectIds: selectedSubjectIds,
      numberOfQuestions: numQuestions,
      examDurationMinutes: duration,
      isGuest: isGuestMode,
    });
  };

  if (loadingSubjects && subjects.length === 0) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  return (
    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>İmtahan Parametrləri</Text>
        {isGuestMode && <Text style={styles.guestNotice}>Qonaq rejimindəsiniz. Nəticələriniz yadda saxlanılmayacaq.</Text>}
        
        <Text style={styles.sectionTitle}>1. Fənn və ya Fənlər Seçin:</Text>
        {loadingSubjects && subjects.length > 0 && <ActivityIndicator color="#4A90E2" style={{marginBottom:10}}/>}
        {!loadingSubjects && subjects.length === 0 && <Text style={styles.infoText}>Fənn tapılmadı.</Text>}
        
        <View style={styles.subjectContainer}>
            {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                      styles.subjectButton,
                      selectedSubjectIds.includes(subject.id) && styles.subjectButtonSelected,
                  ]}
                  onPress={() => toggleSubjectSelection(subject.id)}
                >
                  <Text style={[
                      styles.subjectButtonText,
                      selectedSubjectIds.includes(subject.id) && styles.subjectButtonTextSelected,
                      ]}
                  >
                      {subject.name}
                  </Text>
                </TouchableOpacity>
            ))}
        </View>

        {selectedSubjectIds.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>2. Sual Sayı və Müddət:</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ümumi Sual Sayı:</Text>
              <TextInput
                style={styles.input}
                placeholder="Məsələn, 10"
                keyboardType="number-pad"
                value={numberOfQuestions}
                onChangeText={setNumberOfQuestions}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>İmtahan Müddəti (dəqiqə ilə):</Text>
              <TextInput
                style={styles.input}
                placeholder="Məsələn, 20"
                keyboardType="number-pad"
                value={examDurationMinutes}
                onChangeText={setExamDurationMinutes}
              />
            </View>
          </>
        )}

        {selectedSubjectIds.length > 0 && (
            <TouchableOpacity 
                style={[
                    styles.startButton, 
                    (!numberOfQuestions.trim() || !examDurationMinutes.trim()) && styles.startButtonDisabled 
                    // .trim() əlavə etdim ki, yalnız boşluq varsa da disabled olsun
                ]} 
                onPress={handleStartExam}
                disabled={!numberOfQuestions.trim() || !examDurationMinutes.trim()}
            >
            <Text style={styles.startButtonText}>İmtahana Başla</Text>
            </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#F0F4F8', },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8', },
  container: { paddingVertical: 20, paddingHorizontal: 24, },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#2C3E50', },
  guestNotice: { fontSize: 14, color: 'orange', textAlign: 'center', marginBottom: 15, fontStyle: 'italic', fontWeight:'500' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#34495E', marginBottom: 15, marginTop: 15, }, // marginTop əlavə etdim
  subjectContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 10, }, // marginBottom-u azaltdım
  subjectButton: { 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 10, // Biraz daha yığcam
    paddingHorizontal: 16, // Biraz daha yığcam
    borderRadius: 20, 
    marginBottom: 10, 
    marginRight: 10, 
    borderWidth: 1.5, 
    borderColor: '#DAE4F0', 
    shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  subjectButtonSelected: { 
    backgroundColor: '#4A90E2', 
    borderColor: '#3A7BC8', 
  },
  subjectButtonText: { 
    fontSize: 15, // Biraz kiçiltdim
    color: '#34495E', 
    fontWeight: '500', 
    textAlign: 'center'
  },
  subjectButtonTextSelected: { 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
  },
  inputGroup: { 
    marginBottom: 15, // Boşluğu azaltdım
  },
  label: { 
    fontSize: 16, 
    color: '#555', 
    marginBottom: 6, // Boşluğu azaltdım
  },
  input: { 
    backgroundColor: '#FFFFFF', 
    borderColor: '#BDC3C7', 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    height: 48, // Hündürlüyü bir az standartlaşdırdım
    fontSize: 16, 
    color: '#34495E', 
  },
  startButton: { 
    backgroundColor: '#27AE60', 
    paddingVertical: 15, // Biraz azaltdım
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 25, // Boşluğu artırdım
  },
  startButtonDisabled: { 
    backgroundColor: '#BDC3C7', 
  },
  startButtonText: { 
    color: '#FFFFFF', 
    fontSize: 17, // Biraz azaltdım
    fontWeight: 'bold', 
  },
  infoText: { 
    fontSize: 16, 
    color: 'grey', 
    textAlign: 'center', 
    marginTop: 20, 
  },
});