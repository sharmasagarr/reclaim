import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs([
  '[Reanimated] Dependencies should only be used on the web and are always ignored on native.',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import BootSplash from 'react-native-bootsplash';
import { AppProvider, useAppStore } from './src/store/appStore';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { isDark } = useAppStore();

  useEffect(() => {
    BootSplash.hide({ fade: true }).catch(() => {
      // Ignored if bootsplash is not active
    });
  }, []);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProvider>
          <BottomSheetModalProvider>
            <AppContent />
          </BottomSheetModalProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
