// src/screens/AddStudentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button, // Sadəlik üçün hələlik Button
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity, // Picker alternativi üçün
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { Picker } from '@react-native-picker/picker'; // Picker istifadə edəcəyik

export default function AddStudentScreen({ navigation }) {
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(''); // Boş string ilə başlasın
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(''); // Boş string ilə başlasın
  const [foreignLanguage, setForeignLanguage] = useState('');
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
      } catch (error) {
        Alert.alert('Məktəb Siyahısı Xətası', error.message);
      } finally {
        setLoadingSchools(false);
      }
    }
    fetchSchools();
  }, []);

  // Seçilmiş məktəbə görə sinifləri çək
  useEffect(() => {
    async function fetchClasses() {
      if (selectedSchoolId) {
        setLoadingClasses(true);
        setSelectedClassId(''); // Məktəb dəyişdikdə sinif seçimini sıfırla
        try {
          const { data, error } = await supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', selectedSchoolId);
          if (error) throw error;
          if (data) setClasses(data);
        } catch (error) {
          Alert.alert('Sinif Siyahısı Xətası', error.message);
          setClasses([]);
        } finally {
          setLoadingClasses(false);
        }
      } else {
        setClasses([]); // Məktəb seçilməyibsə sinif siyahısını boşalt
      }
    }
    fetchClasses();
  }, [selectedSchoolId]);

  const handleAddStudent = async () => {
    if (!studentFirstName.trim() || !selectedSchoolId || !selectedClassId) {
      Alert.alert('Xəta', 'Zəhmət olmasa, şagirdin adını, məktəbini və sinfini seçin.');
      return;
    }
    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        Alert.alert('Sessiya Xətası', 'Valideyn sessiyası tapılmadı. Zəhmət olmasa yenidən daxil olun.');
        setLoading(false);
        // navigation.navigate('Auth'); // Login ekranına yönləndirə bilərik
        return;
      }
      const parentId = session.user.id;

      const studentData = {
        first_name: studentFirstName.trim(),
        last_name: studentLastName.trim() || null, // Soyad boşdursa NULL
        parent_profile_id: parentId,
        school_id: selectedSchoolId,
        class_id: selectedClassId,
        foreign_language_learned: foreignLanguage.trim() || null,
      };

      const { error: insertError } = await supabase.from('students').insert(studentData);

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Uğurlu', `${studentFirstName} adlı şagird uğurla əlavə edildi.`);
      // Formu təmizlə
      setStudentFirstName('');
      setStudentLastName('');
      setSelectedSchoolId('');
      setSelectedClassId('');
      setForeignLanguage('');
      navigation.goBack(); // Əvvəlki ekrana (valideyn paneli) qayıt
    } catch (error) {
      console.error("Error adding student:", error);
      Alert.alert('Şagird Əlavə Etmə Xətası', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Yeni Şagird Əlavə Et</Text>

        <Text style={styles.label}>Şagirdin Adı:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ad"
          value={studentFirstName}
          onChangeText={setStudentFirstName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Şagirdin Soyadı (Könüllü):</Text>
        <TextInput
          style={styles.input}
          placeholder="Soyad"
          value={studentLastName}
          onChangeText={setStudentLastName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Məktəb:</Text>
        {loadingSchools ? <ActivityIndicator /> : (
          schools.length > 0 ? (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedSchoolId}
                onValueChange={(itemValue) => setSelectedSchoolId(itemValue)}
                style={styles.picker}
                prompt="Məktəb seçin"
              >
                <Picker.Item label="-- Məktəb seçin --" value="" />
                {schools.map((school) => (
                  <Picker.Item key={school.id} label={school.name} value={school.id} />
                ))}
              </Picker>
            </View>
          ) : <Text style={styles.infoText}>Yüklənəcək məktəb yoxdur.</Text>
        )}


        {selectedSchoolId && (
          <>
            <Text style={styles.label}>Sinif:</Text>
            {loadingClasses ? <ActivityIndicator /> : (
              classes.length > 0 ? (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedClassId}
                    onValueChange={(itemValue) => setSelectedClassId(itemValue)}
                    style={styles.picker}
                    prompt="Sinif seçin"
                    enabled={classes.length > 0}
                  >
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

        <Text style={styles.label}>Öyrəndiyi Xarici Dil (Könüllü):</Text>
        <TextInput
          style={styles.input}
          placeholder="Məsələn, İngilis dili"
          value={foreignLanguage}
          onChangeText={setForeignLanguage}
        />

        <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleAddStudent} 
            disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Əlavə Edilir..." : "Şagirdi Əlavə Et"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Stillər AuthScreen-dəki picker stillərinə oxşar olacaq
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
    marginBottom: 20,
    textAlign: 'center',
    color: '#2C3E50',
  },
  label: {
    fontSize: 16,
    marginBottom: 8, // Boşluğu artırdım
    color: '#34495E',
    fontWeight: '500', // Biraz qalın
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderColor: '#BDC3C7',
    borderWidth: 1,
    marginBottom: 20, // Boşluğu artırdım
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  pickerWrapper: {
    width: '100%',
    borderColor: '#BDC3C7',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20, // Boşluğu artırdım
    backgroundColor: '#FFFFFF',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : 50,
    color: '#34495E',
  },
  button: {
    backgroundColor: '#2980B9',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10, // Input-dan sonra boşluq
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6', // Sönük rəng
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
  }
});