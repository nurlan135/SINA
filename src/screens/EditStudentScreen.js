// src/screens/EditStudentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, TouchableOpacity
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { Picker } from '@react-native-picker/picker';

export default function EditStudentScreen({ route, navigation }) {
  const { studentData: initialStudentData } = route.params;

  const [firstName, setFirstName] = useState(initialStudentData?.first_name || '');
  const [lastName, setLastName] = useState(initialStudentData?.last_name || '');
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(initialStudentData?.schools?.id || initialStudentData?.school_id || '');
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(initialStudentData?.classes?.id || initialStudentData?.class_id || '');
  const [foreignLanguage, setForeignLanguage] = useState(initialStudentData?.foreign_language_learned || '');
  
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Məktəbləri çək
  useEffect(() => {
    async function fetchSchools() {
      setLoadingSchools(true);
      try {
        const { data, error } = await supabase.from('schools').select('id, name');
        if (error) throw error;
        if (data) setSchools(data);
      } catch (error) { Alert.alert('Məktəb Siyahısı Xətası', error.message); }
      finally { setLoadingSchools(false); }
    }
    fetchSchools();
  }, []);

  // Seçilmiş məktəbə görə sinifləri çək
  useEffect(() => {
    async function fetchClasses() {
      if (selectedSchoolId) {
        setLoadingClasses(true);
        // Əgər ilkin class_id bu məktəbə aiddirsə, onu qoru, yoxsa sıfırla
        if (initialStudentData?.schools?.id !== selectedSchoolId && initialStudentData?.school_id !== selectedSchoolId) {
             setSelectedClassId('');
        }
        try {
          const { data, error } = await supabase.from('classes').select('id, name').eq('school_id', selectedSchoolId);
          if (error) throw error;
          if (data) setClasses(data);
        } catch (error) { Alert.alert('Sinif Siyahısı Xətası', error.message); setClasses([]); }
        finally { setLoadingClasses(false); }
      } else { 
        setClasses([]);
        setSelectedClassId(''); // Məktəb seçilməyibsə sinfi də sıfırla
      }
    }
    fetchClasses();
  }, [selectedSchoolId, initialStudentData]); // initialStudentData-nı da əlavə edirik ki, ilk yükləmədə düzgün işləsin

  const handleUpdateStudent = async () => {
    if (!firstName.trim() || !selectedSchoolId || !selectedClassId) {
      Alert.alert('Xəta', 'Zəhmət olmasa, şagirdin adını, məktəbini və sinfini seçin.');
      return;
    }
    setLoading(true);
    try {
      const updates = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        school_id: selectedSchoolId,
        class_id: selectedClassId,
        foreign_language_learned: foreignLanguage.trim() || null,
        updated_at: new Date().toISOString(), // PostgreSQL üçün düzgün format
      };

      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', initialStudentData.id);

      if (error) throw error;

      Alert.alert('Uğurlu', `${firstName} adlı şagirdin məlumatları yeniləndi.`);
      // StudentDetailScreen-ə qayıdanda məlumatların yenilənməsi üçün parametr ötürə bilərik
      // Və ya StudentDetailScreen-də focus event-i ilə yeniləyəcəyik
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Yeniləmə Xətası', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>Şagird Məlumatlarını Redaktə Et</Text>

        <Text style={styles.label}>Ad <Text style={styles.requiredStar}>*</Text>:</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words"/>
        
        <Text style={styles.label}>Soyad:</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} autoCapitalize="words"/>

        <Text style={styles.label}>Məktəb <Text style={styles.requiredStar}>*</Text>:</Text>
        {loadingSchools ? <ActivityIndicator style={styles.activityIndicator}/> : (
          schools.length > 0 ? (
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={selectedSchoolId} onValueChange={(itemValue) => setSelectedSchoolId(itemValue)} style={styles.picker} prompt="Məktəb seçin">
                <Picker.Item label="-- Məktəb seçin --" value="" />
                {schools.map((school) => (
                  <Picker.Item key={school.id} label={school.name} value={school.id} />
                ))}
              </Picker>
            </View>
          ) : <Text style={styles.infoText}>Məktəb tapılmadı və ya yüklənir...</Text>
        )}

        {selectedSchoolId && (
          <>
            <Text style={styles.label}>Sinif <Text style={styles.requiredStar}>*</Text>:</Text>
            {loadingClasses ? <ActivityIndicator style={styles.activityIndicator}/> : (
              classes.length > 0 ? (
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={selectedClassId} onValueChange={(itemValue) => setSelectedClassId(itemValue)} style={styles.picker} enabled={classes.length > 0} prompt="Sinif seçin">
                    <Picker.Item label="-- Sinif seçin --" value="" />
                    {classes.map((cls) => (
                      <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
                    ))}
                  </Picker>
                </View>
              ) : <Text style={styles.infoText}>Bu məktəb üçün sinif tapılmadı və ya yüklənir.</Text>
            )}
          </>
        )}

        <Text style={styles.label}>Öyrəndiyi Xarici Dil:</Text>
        <TextInput style={styles.input} value={foreignLanguage} onChangeText={setForeignLanguage} placeholder="Məsələn, İngilis dili"/>

        <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleUpdateStudent} 
            disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Yenilənir..." : "Dəyişiklikləri Yadda Saxla"}
          </Text>
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
  container: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25, // Boşluğu artırdım
    textAlign: 'center',
    color: '#2C3E50',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#34495E',
    fontWeight: '500',
  },
  requiredStar: { // Məcburi sahələr üçün ulduz
    color: 'red',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderColor: '#BDC3C7',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  pickerWrapper: {
    width: '100%',
    borderColor: '#BDC3C7',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 180 : 50, // iOS-da picker hündürlüyü
    color: '#34495E',
  },
  button: {
    backgroundColor: '#27AE60', // Yaşıl rəng
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonDisabled: {
    backgroundColor: '#B2DFDB', // Sönük yaşıl
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
      marginVertical: 10,
      color: 'grey',
      textAlign: 'center',
  },
  activityIndicator: { // ActivityIndicator üçün ayrıca stil
    marginVertical: 15,
  }
});