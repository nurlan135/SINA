// src/screens/AuthScreen.js
import React, { useState, useEffect } from 'react';
import {
  Alert, StyleSheet, View, Text, TextInput, ActivityIndicator, TouchableOpacity, ScrollView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabaseClient'; // Düzgün yolu göstərin

const ROLES = [
  { label: 'Müəlliməm', value: 'teacher' },
  { label: 'Valideynəm', value: 'parent' },
];

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [schools, setSchools] = useState([]);
  const [selectedSchoolIdForTeacher, setSelectedSchoolIdForTeacher] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(false);

  useEffect(() => {
    async function fetchAllSchools() {
      if (isSignUp && selectedRole === 'teacher') {
        setLoadingSchools(true);
        setSelectedSchoolIdForTeacher('');
        try {
          const { data, error } = await supabase.from('schools').select('id, name');
          if (error) throw error;
          if (data) setSchools(data);
        } catch (error) {
          Alert.alert('Məktəb Siyahısı Xətası', error.message);
          setSchools([]);
        } finally {
          setLoadingSchools(false);
        }
      } else {
        setSchools([]); // Başqa hallarda məktəb siyahısını boşalt
      }
    }
    
    if (isSignUp) { // Yalnız qeydiyyat modundadırsa və rol seçilibsə məktəbləri çək
        fetchAllSchools();
    } else { // Login modundadırsa, məktəb siyahısını və seçimi sıfırla
        setSchools([]);
        setSelectedSchoolIdForTeacher('');
    }
  }, [isSignUp, selectedRole]);


  async function handleAuthAction() {
    if (isSignUp) await signUpWithEmail();
    else await signInWithEmail();
  }

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });
    if (error) Alert.alert('Daxil Olma Xətası', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!fullName.trim()) {
        Alert.alert('Qeydiyyat Xətası', 'Zəhmət olmasa, Ad Soyadınızı daxil edin.');
        return;
    }
    if (!selectedRole) {
        Alert.alert('Qeydiyyat Xətası', 'Zəhmət olmasa, rolunuzu seçin.');
        return;
    }
    const metadata = { full_name: fullName.trim(), role: selectedRole };
    if (selectedRole === 'teacher') {
      if (!selectedSchoolIdForTeacher) {
        Alert.alert('Qeydiyyat Xətası', 'Zəhmət olmasa, məktəbinizi seçin.');
        return;
      }
      metadata.school_id = selectedSchoolIdForTeacher;
    }

    setLoading(true);
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: { data: metadata }
    });

    if (signUpError) {
      Alert.alert('Qeydiyyat Xətası', signUpError.message);
    } else if (!authData.session && !signUpError) { // Email təsdiqi aktivdirsə
        Alert.alert('Qeydiyyat Uğurlu', 'Zəhmət olmasa, emailinizi təsdiqləyin.');
        setIsSignUp(false); // Login ekranına qaytar
        // Form sahələrini təmizlə
        setFullName(''); 
        setSelectedRole(null); 
        setSelectedSchoolIdForTeacher('');
        // setEmail(''); // İstifadəçi emaili yenidən daxil etməsin deyə bunları təmizləməyə bilərik
        // setPassword('');
    }
    // Əgər email təsdiqi sönülüdürsə, App.js auth state dəyişikliyinə görə avtomatik yönləndirəcək
    setLoading(false);
  }

  const handleGuestMode = () => {
    console.log("Navigating to StartExam as Guest");
    navigation.navigate('StartExam', { isGuest: true }); 
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.formContainer}>
        <Text style={styles.header}>SINA Tətbiqi</Text>
        <Text style={styles.subHeader}>{isSignUp ? 'Qeydiyyat' : 'Daxil Ol'}</Text>

        {isSignUp && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <Text style={styles.label}>Rolunuzu seçin:</Text>
            <View style={styles.rolesContainer}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[ styles.roleButton, selectedRole === role.value && styles.roleButtonSelected, ]}
                  onPress={() => setSelectedRole(role.value)}
                >
                  <Text style={[ styles.roleButtonText, selectedRole === role.value && styles.roleButtonTextSelected, ]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedRole === 'teacher' && (
              <>
                <Text style={styles.label}>Məktəbinizi seçin:</Text>
                {loadingSchools ? <ActivityIndicator color="#4A90E2"/> : (
                  schools.length > 0 ? (
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={selectedSchoolIdForTeacher}
                        onValueChange={(itemValue) => setSelectedSchoolIdForTeacher(itemValue)}
                        style={styles.picker}
                        prompt="Məktəb seçin"
                      >
                        <Picker.Item label="-- Məktəb seçin --" value="" />
                        {schools.map((school) => ( <Picker.Item key={school.id} label={school.name} value={school.id} /> ))}
                      </Picker>
                    </View>
                  ) : <Text style={styles.infoText}>Yüklənəcək məktəb yoxdur və ya tapılmadı.</Text>
                )}
              </>
            )}
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="email@nümunə.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Parol (ən azı 6 simvol)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {loading ? ( <ActivityIndicator size="large" color="#4A90E2" style={{ marginVertical: 20 }} /> ) : (
          <TouchableOpacity style={styles.mainButton} onPress={handleAuthAction}>
            <Text style={styles.mainButtonText}>{isSignUp ? "Qeydiyyatdan Keç" : "Daxil Ol"}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => { 
            setIsSignUp(!isSignUp); 
            setFullName(''); 
            setSelectedRole(null); 
            setSelectedSchoolIdForTeacher('');
            // setEmail(''); // Emaili saxlayaq
            // setPassword(''); // Parolu təmizləyək
        }} style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {isSignUp ? "Hesabınız var? Daxil Olun" : "Hesabınız yoxdur? Qeydiyyatdan Keçin"}
          </Text>
        </TouchableOpacity>
        
        {!isSignUp && ( // "Özünü SINA" düyməsi yalnız Daxil Ol ekranında
            <TouchableOpacity onPress={handleGuestMode} style={styles.guestButton}>
                <Text style={styles.guestButtonText}>Özünü SINA (Qeydiyyatsız)</Text>
            </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', backgroundColor: '#F0F4F8', },
  formContainer: { paddingHorizontal: 24, paddingVertical: 30, alignItems: 'center', width: '100%'}, // width: '100%' əlavə etdim
  header: { fontSize: 30, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10, },
  subHeader: { fontSize: 18, color: '#7F8C8D', marginBottom: 25, textAlign: 'center', },
  input: { width: '100%', height: 50, backgroundColor: '#FFFFFF', borderColor: '#BDC3C7', borderWidth: 1, marginBottom: 15, paddingHorizontal: 15, borderRadius: 8, fontSize: 16, color: '#34495E', },
  label: { fontSize: 16, color: '#34495E', marginBottom: 8, alignSelf: 'flex-start', width: '100%'}, // width: '100%'
  rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20, },
  roleButton: { flex: 1, paddingVertical: 12, borderWidth: 1.5, borderColor: '#3498DB', borderRadius: 8, marginHorizontal: 4, alignItems: 'center', },
  roleButtonSelected: { backgroundColor: '#3498DB', },
  roleButtonText: { color: '#3498DB', fontSize: 14, fontWeight: '600', textAlign: 'center'}, // textAlign əlavə etdim
  roleButtonTextSelected: { color: '#FFFFFF', },
  pickerWrapper: { width: '100%', borderColor: '#BDC3C7', borderWidth: 1, borderRadius: 8, marginBottom: 15, backgroundColor: '#FFFFFF', },
  picker: { width: '100%', height: Platform.OS === 'ios' ? 180 : 50, color: '#34495E', }, // iOS üçün hündürlüyü bir az azaltdım
  infoText: { marginVertical: 10, color: 'grey', textAlign: 'center', },
  mainButton: { width: '100%', backgroundColor: '#2980B9', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
  toggleButton: { marginTop: 20, paddingVertical: 5 }, // padding əlavə etdim ki, klikləmək asan olsun
  toggleText: { color: '#2980B9', fontSize: 15, fontWeight: '600', },
  guestButton: { marginTop: 15, backgroundColor: '#7F8C8D', paddingVertical: 15, borderRadius: 8, alignItems: 'center', width: '100%', },
  guestButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
});