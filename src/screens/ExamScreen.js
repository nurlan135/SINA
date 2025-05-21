// src/screens/ExamScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, Button } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

export default function ExamScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Parametrləri alarkən defolt dəyərlər təyin edək ki, əgər ötürülməyibsə xəta verməsin
  const { 
    subjectIds = [], // Boş massivlə başlasın
    numberOfQuestions = 0, 
    examDurationMinutes = 0, 
    isGuest: isGuestMode = false 
  } = route.params || {};

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(examDurationMinutes * 60);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examFinished, setExamFinished] = useState(false);

  const fetchQuestions = useCallback(async () => {
    if (!subjectIds || subjectIds.length === 0 || numberOfQuestions <= 0 || examDurationMinutes <= 0) {
        console.error("ExamScreen: Invalid or missing exam parameters.", route.params);
        Alert.alert("Xəta", "İmtahan parametrləri düzgün deyil. Zəhmət olmasa əvvəlki səhifəyə qayıdıb yenidən cəhd edin.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        setLoadingQuestions(false);
        return;
    }

    setLoadingQuestions(true);
    setIsSubmitting(false); setQuestions([]); setSelectedAnswers({});
    setCurrentQuestionIndex(0); setExamFinished(false);
    setTimeLeft(examDurationMinutes * 60);

    console.log("ExamScreen: Fetching - Subjects:", subjectIds, "Count:", numberOfQuestions, "Duration:", examDurationMinutes, "IsGuest:", isGuestMode);

    try {
      let allPossibleQuestions = [];
      for (const subjectId of subjectIds) {
        const { data: subjectQuestions, error: subjectError } = await supabase
          .from('questions')
          .select('id, question_text, options, subject_id, correct_answer_id')
          .eq('subject_id', subjectId);
        
        if (subjectError) throw subjectError;
        if (subjectQuestions) allPossibleQuestions = [...allPossibleQuestions, ...subjectQuestions];
      }

      if (allPossibleQuestions.length === 0) {
        Alert.alert("Sual Tapılmadı", "Seçilmiş fənn(lər) üçün heç bir sual tapılmadı.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        setLoadingQuestions(false); return;
      }

      const shuffled = allPossibleQuestions.sort(() => 0.5 - Math.random());
      let finalQuestions = shuffled.slice(0, numberOfQuestions);

      if (finalQuestions.length === 0 ) {
        Alert.alert("Sual Yoxdur", `Seçilmiş kriteriyalara uyğun sual tapılmadı.`, [{ text: "OK", onPress: () => navigation.goBack() }]);
        setLoadingQuestions(false); return;
      }
      if (finalQuestions.length < numberOfQuestions) {
        Alert.alert("Kifayət Qədər Sual Yoxdur", `Yalnız ${finalQuestions.length} sual tapıldı. İmtahan bu suallarla davam edəcək.`, [{ text: "OK" }]);
      }
      setQuestions(finalQuestions);
    } catch (err) {
      console.error("ExamScreen: Error fetching/processing questions:", err);
      Alert.alert("Sual Yükləmə Xətası", err.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [subjectIds, numberOfQuestions, examDurationMinutes, navigation, isGuestMode]);

  useFocusEffect(
    useCallback(() => {
      fetchQuestions();
      return () => { console.log("ExamScreen is unfocused or unmounted."); };
    }, [fetchQuestions])
  );

  useEffect(() => {
    if (loadingQuestions || examFinished || questions.length === 0 || timeLeft <= 0) {
      if (timeLeft <= 0 && !examFinished && questions.length > 0 && !loadingQuestions && !isSubmitting) {
        finishExam("time_up");
      }
      return; 
    }
    const timerId = setInterval(() => { setTimeLeft((prevTime) => Math.max(0, prevTime - 1)); }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, examFinished, questions, loadingQuestions, isSubmitting]);

  const handleAnswerSelect = (questionId, optionId) => {
    if (examFinished || isSubmitting) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleNextQuestion = () => {
    if (examFinished || isSubmitting) return;
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishExam("completed");
    }
  };

  const finishExam = async (reason = "manual") => {
    if (examFinished || isSubmitting) return;
    
    setExamFinished(true); setIsSubmitting(true);
    const finalTimeLeft = timeLeft; setTimeLeft(0); 
    console.log("Finishing exam. Reason:", reason, "Selected Answers:", selectedAnswers, "Is Guest:", isGuestMode);

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || null;

    let correctCount = 0;
    questions.forEach(q => {
      if (q.correct_answer_id && selectedAnswers[q.id] === q.correct_answer_id) {
        correctCount++;
      }
    });
    const totalAnswered = Object.keys(selectedAnswers).length;
    const totalQuestionsInExam = questions.length; // Faktiki imtahandakı sual sayı
    const incorrectCount = totalAnswered - correctCount;
    const unansweredCount = totalQuestionsInExam - totalAnswered;
    const scorePercentage = totalQuestionsInExam > 0 ? (correctCount / totalQuestionsInExam) * 100 : 0;
    const actualDurationTaken = (examDurationMinutes * 60) - finalTimeLeft;

    let alertTitle = "İmtahan Bitdi!";
    let alertMessage = `Düzgün cavab sayı: ${correctCount} / ${totalQuestionsInExam}\nNəticəniz: ${scorePercentage.toFixed(2)}%`;
    if (reason === "time_up") { alertTitle = "Vaxt Bitdi!"; alertMessage = "İmtahan müddəti başa çatdı!\n" + alertMessage; }

    if (isGuestMode) {
      console.log("Guest user finished exam. Results not saved to DB.");
      Alert.alert(alertTitle, alertMessage + "\n\nNəticələrinizi yadda saxlamaq və təhlil etmək üçün qeydiyyatdan keçin.", [
        { text: "OK", onPress: () => navigation.replace('Auth') } 
      ]);
      setIsSubmitting(false); return;
    }

    try {
      const examInsertData = {
        user_id: currentUserId, subject_ids: subjectIds,
        num_questions_requested: numberOfQuestions, // İstifadəçinin tələb etdiyi original say
        num_questions_answered: totalAnswered, 
        duration_requested_minutes: examDurationMinutes,
        duration_taken_seconds: actualDurationTaken, 
        status: reason === "time_up" ? "time_up" : "completed",
        finished_at: new Date().toISOString(),
      };

      const { data: examEntry, error: examError } = await supabase.from('exams').insert(examInsertData).select('id').single();
      if (examError) { console.error("Error inserting exam:", JSON.stringify(examError, null, 2)); throw examError; }
      if (!examEntry || !examEntry.id) throw new Error("İmtahan qeydi ID-si alınmadı.");
      const newExamId = examEntry.id;

      if (totalAnswered > 0) {
        const answersToInsert = questions.filter(q => selectedAnswers[q.id] !== undefined)
          .map(q => ({ exam_id: newExamId, question_id: q.id, selected_option_id: selectedAnswers[q.id], is_correct: selectedAnswers[q.id] === q.correct_answer_id, }));
        const { error: answersError } = await supabase.from('exam_answers').insert(answersToInsert);
        if (answersError) { console.error("Error inserting exam_answers:", JSON.stringify(answersError, null, 2)); throw answersError; }
      }

      const resultInsertData = {
        exam_id: newExamId, user_id: currentUserId, correct_answers_count: correctCount, 
        incorrect_answers_count: incorrectCount, unanswered_count: unansweredCount, 
        percentage: parseFloat(scorePercentage.toFixed(2)),
      };
      const { error: resultError } = await supabase.from('exam_results').insert(resultInsertData);
      if (resultError) { console.error("Error inserting exam_results:", JSON.stringify(resultError, null, 2)); throw resultError; }
      
      Alert.alert(alertTitle, alertMessage, [
        { text: "Nəticələrə Bax", onPress: () => navigation.replace('ExamResult', { examId: newExamId }) }
      ]);
    } catch (error) {
      console.error("Error finishing exam and saving results:", error);
      Alert.alert("Nəticə Saxlama Xətası", `Xəta: ${error.message}`);
      navigation.replace(isGuestMode ? 'Auth' : 'Home'); // Xəta baş verərsə, qonaq Auth-a, user Home-a
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingQuestions) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  if (!loadingQuestions && questions.length === 0 && !examFinished) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Sual tapılmadı. Zəhmət olmasa, əvvəlki səhifəyə qayıdıb seçimlərinizi dəyişin.</Text>
        <Button title="Geri Qayıt" onPress={() => navigation.goBack()} />
      </View>
    );
  }
  
  if (isSubmitting) {
      return (
          <View style={styles.centered}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={[styles.infoText, {marginTop: 10}]}>Nəticələr yadda saxlanılır...</Text>
          </View>
      )
  }

  if (examFinished && !isSubmitting) {
      return (
          <View style={styles.centered}>
              <Text style={styles.infoText}>İmtahanınız başa çatdı.</Text>
              <Button title="Ana Səhifəyə" onPress={() => navigation.replace(isGuestMode ? 'Auth' : 'Home')} />
          </View>
      )
  }

  const currentQuestion = questions[currentQuestionIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.questionCounter}>Sual: {currentQuestionIndex + 1} / {questions.length}</Text>
          <Text style={styles.timer}>Qalan Vaxt: {minutes}:{seconds < 10 ? '0' : ''}{seconds}</Text>
        </View>

        {currentQuestion ? (
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
            {Array.isArray(currentQuestion.options) && currentQuestion.options.map((option) => (
              <TouchableOpacity
                key={option.option_id}
                style={[
                  styles.optionButton,
                  selectedAnswers[currentQuestion.id] === option.option_id && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerSelect(currentQuestion.id, option.option_id)}
                disabled={isSubmitting || examFinished}
              >
                <Text style={[
                    styles.optionText,
                    selectedAnswers[currentQuestion.id] === option.option_id && styles.optionTextSelected,
                ]}>
                  {option.option_id}. {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
            !loadingQuestions && <Text style={styles.infoText}>Sual yüklənir...</Text>
        )}

        <TouchableOpacity 
            style={[styles.actionButton, (isSubmitting || examFinished || !currentQuestion) && styles.buttonDisabled]} 
            onPress={handleNextQuestion}
            disabled={isSubmitting || examFinished || !currentQuestion}
        >
          <Text style={styles.actionButtonText}>
            {currentQuestionIndex < questions.length - 1 ? "Növbəti Sual" : "İmtahanı Bitir"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Stillər (əvvəlki ExamScreen mesajındakı stilləri istifadə edin)
const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#F0F4F8', },
  scrollContentContainer: { flexGrow: 1, justifyContent: 'space-between', },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F0F4F8', },
  container: { padding: 20, flex: 1, },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5, },
  questionCounter: { fontSize: 16, fontWeight: 'bold', color: '#34495E', },
  timer: { fontSize: 16, fontWeight: 'bold', color: '#E74C3C', },
  questionBox: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 20, marginBottom: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, },
  questionText: { fontSize: 18, fontWeight: '500', color: '#2C3E50', marginBottom: 20, lineHeight: 26, },
  optionButton: { backgroundColor: '#F8F9FA', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#DEE2E6', },
  optionButtonSelected: { backgroundColor: '#D1E7FD', borderColor: '#0D6EFD', borderWidth: 1.5, },
  optionText: { fontSize: 16, color: '#212529', },
  optionTextSelected: { color: '#0A58CA', fontWeight: 'bold', },
  actionButton: { backgroundColor: '#0D6EFD', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 'auto', marginBottom: 10, },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
  infoText: { fontSize: 18, textAlign: 'center', color: '#555', marginTop: 30, },
  buttonDisabled: { backgroundColor: '#BDC3C7', },
});