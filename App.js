import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/services/supabase';

// Screens Import
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import CreateTestScreen from './src/screens/CreateTestScreen';
import EditTestScreen from './src/screens/EditTestScreen'; // <-- Edit Screen Import kar di gayi hai

// Nayi Test Engine Screens Import
import TestInstructionsScreen from './src/screens/TestInstructionsScreen';
import TestScreen from './src/screens/TestScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Database se Role fetch karne ka function
    const checkUserRole = async (currentSession) => {
      if (currentSession?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          console.log("Error fetching role:", error.message);
        }
        
        if (mounted) setUserRole(data?.role || 'student');
      } else {
        if (mounted) setUserRole(null);
      }
      
      // Role fetch hone ke BAAD hi App ko ready mark karo
      if (mounted) setIsReady(true);
    };

    // 1. Initial Page Load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session);
      checkUserRole(session);
    });

    // 2. Listen for Login/Logout Clicks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setIsReady(false); // Naya login hone par pehle loader dikhao
        setSession(newSession);
        checkUserRole(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Jab tak role fetch na ho jaye, App load nahi hoga
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDF4' }}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {!session ? (
          // Agar user logged out hai
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : userRole === 'admin' ? (
          // Agar user ADMIN hai (Multiple screens ke liye <> ... </> lagana zaroori hai)
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="CreateTest" component={CreateTestScreen} />
            {/* Edit Test Yahan register ho gayi hai */}
            <Stack.Screen name="EditTest" component={EditTestScreen} />
          </>
        ) : (
          // Agar user STUDENT hai
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            {/* Ye dono nayi screens student ke liye add ho gayi hain */}
            <Stack.Screen name="TestInstructions" component={TestInstructionsScreen} />
            <Stack.Screen name="TestEngine" component={TestScreen} />
          </>
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}