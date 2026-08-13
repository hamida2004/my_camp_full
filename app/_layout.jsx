import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from "react";
import { initDB } from "../database/db";
import { ActivityIndicator, Text, View } from 'react-native';
import {LanguageProvider} from '../context/languageContext'
import { SafeAreaProvider } from 'react-native-safe-area-context';
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();



  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    try {
      initDB();
      setDbReady(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

 if (!dbReady) return (
  <View
  style={{
    flex:1,
    alignItems:"center",
    justifyContent:'center'
  }}
  >
    <ActivityIndicator size='large' color='#3498db' ></ActivityIndicator>
  </View>
 );

  return (
    <SafeAreaProvider>
          <LanguageProvider>

            <Stack
      screenOptions={{
        headerShown: false
      }}
      />
      <StatusBar style="auto" />
      </LanguageProvider>
      </SafeAreaProvider>
  );
}
