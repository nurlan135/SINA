// App.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { supabase } from './src/lib/supabaseClient';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddStudentScreen from './src/screens/AddStudentScreen';
import StudentDetailScreen from './src/screens/StudentDetailScreen';
import EditStudentScreen from './src/screens/EditStudentScreen';
import StartExamScreen from './src/screens/StartExamScreen';
import ExamScreen from './src/screens/ExamScreen';
import ExamResultScreen from './src/screens/ExamResultScreen';

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    }).catch(error => {
      console.error("Error getting session:", error);
      setLoading(false);
    });

    const { data: authListenerData, error: authListenerError } = supabase.auth.onAuthStateChange(
      (_event, currentAuthSession) => {
        setSession(currentAuthSession);
      }
    );

    if (authListenerError) {
      console.error('Error setting up auth state listener:', authListenerError);
    }

    return () => {
      if (authListenerData && authListenerData.subscription && typeof authListenerData.subscription.unsubscribe === 'function') {
        authListenerData.subscription.unsubscribe();
      }
    };
  }, []);

  if (loading && session === null) { // Yalnız ilkin yükləmədə göstər
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#4A90E2' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!session || !session.user ? (
          // Autentifikasiya Olunmamış İstifadəçi və ya Qonaq üçün İlkin Ekran
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          // Autentifikasiya Olunmuş İstifadəçi Ekranları
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Əsas Səhifə' }} />
            <Stack.Screen name="AddStudent" component={AddStudentScreen} options={{ title: 'Yeni Şagird Əlavə Et' }} />
            <Stack.Screen name="StudentDetail" component={StudentDetailScreen} options={({ route }) => ({ title: route.params?.studentName ? `${route.params.studentName} Detalları` : 'Şagird Detalları' })} />
            <Stack.Screen name="EditStudent" component={EditStudentScreen} options={{ title: 'Şagird Məlumatlarını Dəyiş' }}/>
             {/* StartExam buradan da çağırıla bilər, əgər Home-dan keçid varsa */}
          </Stack.Group>
        )}
        {/* İmtahanla bağlı ekranlar hər zaman naviqatorda mövcud olsun ki, AuthScreen-dən də çağırıla bilsin */}
        <Stack.Screen name="StartExam" component={StartExamScreen} options={{ title: 'İmtahana Hazırlıq' }}/>
        <Stack.Screen name="Exam" component={ExamScreen} options={{ title: 'İmtahan', headerLeft: () => null, gestureEnabled: false }}/>
        <Stack.Screen name="ExamResult" component={ExamResultScreen} options={{ title: 'İmtahan Nəticəsi' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
});