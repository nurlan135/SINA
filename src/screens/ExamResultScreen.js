// src/screens/ExamResultScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Button } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

export default function ExamResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { examId } = route.params || {}; // examId olmasa belə çökənməsin deyə boş obyekt

  const [resultDetails, setResultDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExamData = useCallback(async () => {
    if (!examId) {
      setError("İmtahan ID-si ötürülməyib və ya tapılmadı.");
      setLoading(false);
      console.warn("ExamResultScreen: examId is missing from route params.");
      // Alert.alert("Xəta", "İmtahan ID-si tapılmadı.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      return;
    }

    console.log("ExamResultScreen: Fetching data for examId:", examId);
    setLoading(true);
    setError(null); // Hər dəfə məlumat çəkəndə əvvəlki xətanı təmizlə
    setResultDetails(null); // Əvvəlki nəticələri təmizlə

    try {
      const { data: result, error: resultError } = await supabase
        .from('exam_results')
        .select(`
          correct_answers_count,
          incorrect_answers_count,
          unanswered_count,
          percentage,
          exams!inner ( 
            user_id, 
            subject_ids, 
            num_questions_requested, 
            duration_taken_seconds, 
            started_at, 
            finished_at 
          )
        `)
        .eq('exam_id', examId)
        .single(); // Yalnız bir nəticə gözləyirik

      console.log("ExamResultScreen: Supabase result fetch - raw data:", JSON.stringify(result, null, 2));
      console.log("ExamResultScreen: Supabase result fetch - raw error:", JSON.stringify(resultError, null, 2));

      if (resultError) {
        if (resultError.code === 'PGRST116') { // "The result contains 0 rows"
          setError('Bu imtahan üçün nəticə qeydi tapılmadı.');
        } else {
          setError(`Nəticə çəkilərkən xəta: ${resultError.message}`);
        }
        setLoading(false);
        return;
      }
      
      if (result && result.exams) {
        let subjectNamesStr = 'Fənn(lər) müəyyən edilmədi';
        if (result.exams.subject_ids && Array.isArray(result.exams.subject_ids) && result.exams.subject_ids.length > 0) {
          console.log("ExamResultScreen: Fetching names for subject IDs:", result.exams.subject_ids);
          const { data: subjectsData, error: subjectsError } = await supabase
            .from('subjects')
            .select('name')
            .in('id', result.exams.subject_ids);

          if (subjectsError) {
            console.warn("ExamResultScreen: Fənn adlarını çəkmə xətası:", subjectsError.message);
          } else if (subjectsData && subjectsData.length > 0) {
            subjectNamesStr = subjectsData.map(s => s.name).join(', ');
          }
        }
        
        setResultDetails({
          ...result,
          exams: {
            ...result.exams,
            subjectNamesDisplay: subjectNamesStr,
          }
        });
      } else {
        setError("Nəticə məlumatları düzgün formatda deyil və ya imtahan məlumatı tapılmadı.");
      }
    } catch (e) {
      console.error("ExamResultScreen: Critical error in fetchExamData:", e);
      setError(e.message || "Nəticələr yüklənərkən naməlum xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  }, [examId, navigation]); // navigation asılılığı Alert.alert-də goBack üçün lazım ola bilər

  useFocusEffect(
    useCallback(() => {
      console.log("ExamResultScreen focused, calling fetchExamData.");
      fetchExamData(); 
      return () => {
        console.log("ExamResultScreen unfocused or unmounted.");
      };
    }, [fetchExamData]) 
  );
  
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Xəta baş verdi:</Text>
        <Text style={styles.errorDetailText}>{error}</Text>
        <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#f39c12', marginTop:20}]} onPress={() => fetchExamData()}>
            <Text style={styles.actionButtonText}>Yenidən Cəhd Et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#3498db'}]} onPress={() => navigation.replace('Home')}>
            <Text style={styles.actionButtonText}>Ana Səhifəyə</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!resultDetails || !resultDetails.exams) {
    return (
        <View style={styles.centered}>
            <Text style={styles.infoText}>Nəticə məlumatları tapılmadı və ya hələ yüklənməyib.</Text>
            <Button title="Ana Səhifəyə Qayıt" onPress={() => navigation.replace('Home')} />
        </View>
    );
  }

  const examInfo = resultDetails.exams;

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>İmtahan Nəticəniz</Text>

        <View style={styles.resultCard}>
          <Text style={styles.resultHeader}>Ümumi Məlumat</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Fənn(lər):</Text>
            <Text style={styles.resultValue}>{examInfo.subjectNamesDisplay || 'Bilinmir'}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Cəmi Sual (İmtahanda):</Text>
            <Text style={styles.resultValue}>{examInfo.num_questions_requested || 'Bilinmir'}</Text>
          </View>
           {examInfo.duration_taken_seconds !== undefined && (
            <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Sərf Olunan Vaxt:</Text>
                <Text style={styles.resultValue}>
                    {Math.floor(examInfo.duration_taken_seconds / 60)} dəq {examInfo.duration_taken_seconds % 60} san
                </Text>
            </View>
          )}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultHeader}>Nəticələriniz</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Düzgün Cavablar:</Text>
            <Text style={[styles.resultValue, styles.correct]}>{resultDetails.correct_answers_count}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Səhv Cavablar:</Text>
            <Text style={[styles.resultValue, styles.incorrect]}>{resultDetails.incorrect_answers_count}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Cavablanmamış:</Text>
            <Text style={styles.resultValue}>{resultDetails.unanswered_count}</Text>
          </View>
          <View style={[styles.resultRow, { borderBottomWidth: 0, marginTop: 10 }]}>
            <Text style={[styles.resultLabel, styles.percentageLabel]}>Ümumi Faiz:</Text>
            <Text style={[styles.resultValue, styles.percentage]}>{resultDetails.percentage?.toFixed(2)}%</Text>
          </View>
        </View>
        
        <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.replace('Home')}
        >
          <Text style={styles.actionButtonText}>Ana Səhifəyə Qayıt</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { 
    flex: 1, 
    backgroundColor: '#F0F4F8', 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#F0F4F8', 
  },
  container: { 
    padding: 20, 
  },
  title: { 
    fontSize: 26,
    fontWeight: 'bold', 
    color: '#2C3E50', 
    marginBottom: 25, 
    textAlign: 'center', 
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2, }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5,
    elevation: 4,
  },
  resultHeader: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#34495E', 
    marginBottom: 18,
    textAlign: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EAEAEA', 
    paddingBottom: 12,
  },
  resultRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5', 
  },
  resultLabel: { 
    fontSize: 16, 
    color: '#55595C',
  },
  resultValue: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#212529',
  },
  correct: { 
    color: '#198754',
    fontWeight: 'bold', 
  },
  incorrect: { 
    color: '#DC3545',
    fontWeight: 'bold', 
  },
  percentageLabel: {
    fontWeight: 'bold',
    color: '#0D6EFD',
  },
  percentage: { 
    color: '#0D6EFD', 
    fontWeight: 'bold', 
    fontSize: 19,
  },
  actionButton: { 
    backgroundColor: '#0D6EFD',
    paddingVertical: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10, // Daha az boşluq
    width: '100%', // Tam en
  },
  actionButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
  },
  infoText: { 
    fontSize: 16, 
    color: 'grey', 
    textAlign: 'center', 
    marginTop: 20, 
  },
  errorText: {
    fontSize: 18, // Biraz böyük
    color: 'red',
    textAlign: 'center',
    marginBottom: 10, // Boşluq
  },
  errorDetailText: { // Xəta detalları üçün
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  }
});