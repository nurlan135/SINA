// src/screens/StudentDetailScreen.js
import React, { useState, useEffect, useCallback } from 'react'; // useCallback əlavə edildi
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from 'react-native'; // TouchableOpacity əlavə edildi
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native'; // useFocusEffect əlavə edildi

export default function StudentDetailScreen({ route, navigation }) {
  const { studentId } = route.params;
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudentDetails = useCallback(async () => { // Funksiyanı useCallback ilə optimallaşdıraq
    if (!studentId) {
      setError('Şagird ID-si ötürülməyib.');
      setLoading(false);
      return;
    }
    console.log(`Fetching details for student ID: ${studentId}`); // Yoxlama üçün loq
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          foreign_language_learned,
          schools (id, name),
          classes (id, name)
        `)
        .eq('id', studentId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Bu ID ilə şagird tapılmadı.');
        } else {
          throw fetchError;
        }
      } else if (data) {
        setStudent(data);
        // Naviqasiya başlığını yenilə (əgər ad dəyişibsə)
        navigation.setOptions({ 
            title: data.first_name ? `${data.first_name} ${data.last_name || ''} Detalları` : 'Şagird Detalları' 
        });
      } else {
        setError('Şagird məlumatları boş qayıtdı.'); // data null amma xəta yoxdursa
      }
    } catch (e) {
      console.error("Error fetching student details:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [studentId, navigation]); // navigation-u da asılılıqlara əlavə etdik setOptions üçün

  // Ekran hər dəfə fokusa gəldikdə məlumatları yenidən çək
  // Bu, EditStudentScreen-dən qayıtdıqda yenilənməni təmin edir
  useFocusEffect(
    useCallback(() => {
      fetchStudentDetails();
      return () => {
        // İstəyə bağlı olaraq burada bir təmizləmə əməliyyatı ola bilər
        // setStudent(null); // Məsələn, ekrandan çıxdıqda məlumatları təmizləmək
      };
    }, [fetchStudentDetails]) // fetchStudentDetails dəyişdikdə bu effekti yenidən bağla
  );

  // Başlığı ilk yükləmədə də təyin etmək üçün əlavə bir useEffect
  // Student məlumatları çəkildikdən sonra navigation title yenilənəcək
  useEffect(() => {
    if (student) {
        navigation.setOptions({ 
            title: student.first_name ? `${student.first_name} ${student.last_name || ''} Detalları` : 'Şagird Detalları' 
        });
    } else if (route.params?.studentName) { // İlkin parametr varsa onu istifadə et
        navigation.setOptions({ 
            title: `${route.params.studentName} Detalları`
        });
    }
  }, [student, navigation, route.params?.studentName]);


  const handleDeleteStudent = async () => { /* ... (əvvəlki kimi) ... */ };

  if (loading && !student) { // Yalnız ilkin yükləmədə və student hələ yoxdursa
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }
  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>Xəta: {error}</Text></View>;
  }
  if (!student) {
    return <View style={styles.centered}><Text>Şagird məlumatları tapılmadı.</Text></View>;
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.name}>{student.first_name} {student.last_name || ''}</Text>
        
        <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Məktəb:</Text>
            <Text style={styles.infoValue}>{student.schools?.name || 'Qeyd edilməyib'}</Text>
        </View>

        <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Sinif:</Text>
            <Text style={styles.infoValue}>{student.classes?.name || 'Qeyd edilməyib'}</Text>
        </View>

        <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Xarici Dil:</Text>
            <Text style={styles.infoValue}>{student.foreign_language_learned || 'Qeyd edilməyib'}</Text>
        </View>

        <Text style={styles.sectionTitle}>İmtahan Nəticələri (Gələcəkdə)</Text>
        <Text style={styles.placeholderText}>Hələlik imtahan nəticəsi yoxdur.</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={() => {
                if (student) { // student məlumatlarının mövcud olduğundan əmin ol
                    navigation.navigate('EditStudent', { studentData: student })
                } else {
                    Alert.alert("Xəta", "Redaktə üçün şagird məlumatları tapılmadı.");
                }
            }}
          >
            <Text style={styles.actionButtonText}>Məlumatları Redaktə Et</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeleteStudent}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>{loading && !student ? "Silinir..." : "Şagirdi Sil"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Stillər əvvəlki mesajdakı kimidir
const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#F0F4F8', },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  container: { padding: 20, },
  name: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50', marginBottom: 20, textAlign: 'center', },
  infoBox: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 15, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, },
  infoLabel: { fontSize: 14, color: '#7F8C8D', marginBottom: 5, },
  infoValue: { fontSize: 17, color: '#34495E', fontWeight: '500', },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#34495E', marginTop: 25, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#BDC3C7', paddingBottom: 5, },
  placeholderText: { fontSize: 15, color: '#95A5A6', textAlign: 'center', paddingVertical: 15, },
  buttonContainer: { marginTop: 30, },
  actionButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10, },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
  editButton: { backgroundColor: '#3498DB', },
  deleteButton: { backgroundColor: '#E74C3C', },
  errorText: { color: 'red', fontSize: 16, }
});