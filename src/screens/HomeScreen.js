// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '../lib/supabaseClient'; // supabaseClient.js faylının düzgün yolunu göstərin

// Sadələşdirilmiş StudentDashboard, TeacherDashboard, ViewerDashboard
const StudentDashboard = ({ profile, navigation }) => ( // navigation prop-u əlavə edildi
  <View style={styles.roleDashboard}>
    <Text style={styles.roleTitle}>Şagird Paneli</Text>
    <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => navigation.navigate('StartExam')} // StartExamScreen-ə yönləndir
    >
        <Text style={styles.actionButtonText}>Yeni İmtahan Başla</Text>
    </TouchableOpacity>
    {/* Digər şagird seçimləri buraya əlavə oluna bilər */}
  </View>
);

const TeacherDashboard = ({ profile, navigation }) => (
  <View style={styles.roleDashboard}>
    <Text style={styles.roleTitle}>Müəllim Paneli</Text>
    {/* Müəllim üçün seçimlər */}
  </View>
);

const ViewerDashboard = ({ profile }) => (
  <View style={styles.roleDashboard}>
    <Text style={styles.roleTitle}>İzləyici Panel</Text>
    <Text>Tətbiqə xoş gəlmisiniz!</Text>
  </View>
);

const ParentDashboard = ({ profile, navigation }) => {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    let isActive = true;
    async function fetchMyStudents() {
      if (!profile || !profile.id) { setLoadingStudents(false); return; }
      setLoadingStudents(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`id, first_name, last_name, schools(name), classes(name)`)
          .eq('parent_profile_id', profile.id);
        if (error && isActive) throw error;
        if (data && isActive) {
          const formattedStudents = data.map(s => ({
            id: s.id,
            fullName: `${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`,
            schoolName: s.schools?.name || 'Qeyd edilməyib',
            className: s.classes?.name || 'Qeyd edilməyib',
          }));
          setStudents(formattedStudents);
        }
      } catch (error) {
        if (isActive) { console.error("Error fetching parent's students:", error); Alert.alert('Şagird Siyahısı Xətası', error.message); }
      } finally {
        if (isActive) { setLoadingStudents(false); }
      }
    }
    fetchMyStudents();
    return () => { isActive = false; };
  }, [profile]);

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.studentItem}
      onPress={() => navigation.navigate('StudentDetail', { studentId: item.id, studentName: item.fullName })}
    >
      <Text style={styles.studentName}>{item.fullName}</Text>
      <Text style={styles.studentDetail}>Məktəb: {item.schoolName}</Text>
      <Text style={styles.studentDetail}>Sinif: {item.className}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.roleDashboard}>
      <Text style={styles.roleTitle}>Valideyn Paneli</Text>
      <TouchableOpacity
        style={[styles.actionButton, {backgroundColor: '#2ECC71', marginBottom: 20}]}
        onPress={() => navigation.navigate('AddStudent')}
      >
        <Text style={styles.actionButtonText}>Yeni Övlad Əlavə Et</Text>
      </TouchableOpacity>
      <Text style={styles.subTitle}>Övladlarım:</Text>
      {loadingStudents ? ( <ActivityIndicator color="#3498DB" /> ) : 
        students.length > 0 ? (
          <FlatList data={students} renderItem={renderStudentItem} keyExtractor={(item) => item.id.toString()} style={{width: '100%'}}/>
        ) : ( <Text style={styles.infoText}>Hələ heç bir övlad əlavə etməmisiniz.</Text> )
      }
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    async function fetchUserProfile() {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user && isActive) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single();
          if (profileError && isActive) {
            if (profileError.code === 'PGRST116') {
                Alert.alert('Profil Tapılmadı', 'Profil məlumatlarınız tapılmadı.');
                setUserProfile({ full_name: 'Naməlum İstifadəçi', role: 'unknown' });
            } else { throw profileError; }
          } else if (isActive) { setUserProfile(profileData); }
        } else if (isActive) { Alert.alert('Sessiya Xətası', 'İstifadəçi sessiyası tapılmadı.'); }
      } catch (error) {
        if (isActive) { Alert.alert('Məlumat Çəkmə Xətası', error.message); setUserProfile({ full_name: 'Xəta', role: 'error' });}
      } finally { if (isActive) { setLoading(false); } }
    }
    fetchUserProfile();
    return () => { isActive = false; };
  }, []);

  async function handleSignOut() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) { Alert.alert('Çıxış Xətası', error.message); setLoading(false); }
  }

  const renderRoleSpecificDashboard = () => {
    if (!userProfile || !userProfile.role) { return <Text>Rol məlumatı yüklənir...</Text>; }
    switch (userProfile.role) {
      case 'student': return <StudentDashboard profile={userProfile} navigation={navigation} />;
      case 'teacher': return <TeacherDashboard profile={userProfile} navigation={navigation} />;
      case 'parent': return <ParentDashboard profile={userProfile} navigation={navigation} />;
      case 'viewer': return <ViewerDashboard profile={userProfile} />;
      default: return <Text>Naməlum rol: {userProfile.role}.</Text>;
    }
  };

  if (loading) {
    return ( <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#4A90E2" /></View> );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Salam, {userProfile?.full_name || 'İstifadəçi'}!</Text>
      {renderRoleSpecificDashboard()}
      <View style={styles.buttonSpacer} />
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Çıxış Et</Text>
      </TouchableOpacity>
    </View>
  );
}

// Stillər əvvəlki mesajdakı kimidir
const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8', },
  container: { flex: 1, alignItems: 'center', paddingTop: 30, paddingHorizontal: 20, backgroundColor: '#F0F4F8', }, // paddingTop-u azaltdım
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20, },
  roleDashboard: { width: '100%', padding: 15, backgroundColor: '#FFFFFF', borderRadius: 10, alignItems: 'center', marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, }, // padding və shadow-u azaltdım
  roleTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', marginBottom: 15, },
  actionButton: { backgroundColor: '#3498DB', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginTop: 10, width: '90%', alignItems: 'center', }, // width-i biraz artırdım
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', },
  buttonSpacer: { flex: 1, },
  signOutButton: { backgroundColor: '#E74C3C', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, marginBottom: 20, },
  signOutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
  subTitle: { fontSize: 17, fontWeight: '500', color: '#34495E', marginTop: 10, marginBottom: 10, alignSelf: 'flex-start', },
  studentItem: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 8, marginBottom: 10, width: '100%', borderWidth: 1, borderColor: '#E9ECEF'},
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', },
  studentDetail: { fontSize: 14, color: '#5A6268', marginTop: 3, },
  infoText: { fontSize: 15, color: '#7F8C8D', textAlign: 'center', paddingVertical: 20, }
});