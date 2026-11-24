import React from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';
import { ProductsProvider } from '../src/context/ProductsContext';
import { StoreConfigProvider } from '../src/context/StoreConfigContext';
import { NotificationsProvider } from '../src/context/NotificationsContext';
import { CartProvider } from '../src/context/CartContext';
import { RecommendationsProvider } from '../src/context/RecommendationsContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { WebStyles } from '../src/components/WebStyles';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { FatalErrorScreen } from '../src/components/FatalErrorScreen';
import { getStartupIssues } from '../src/lib/startupErrors';
import { C } from '../src/lib/theme';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <FatalErrorScreen
      error={error}
      retry={() => {
        void retry();
      }}
    />
  );
}

export const unstable_settings = {
  screenErrorBoundary: ErrorBoundary,
};

function AppStack() {
  const { scheme, revision } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <WebStyles />
      <Stack
        key={revision}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="checkout" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="order/[id]" />
      </Stack>
    </>
  );
}

export default function Root() {
  const startupIssues = getStartupIssues();
  if (startupIssues.length > 0) return <FatalErrorScreen issues={startupIssues} />;

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProductsProvider>
              <StoreConfigProvider>
                <NotificationsProvider>
                  <CartProvider>
                    <RecommendationsProvider>
                      <AppStack />
                    </RecommendationsProvider>
                  </CartProvider>
                </NotificationsProvider>
              </StoreConfigProvider>
            </ProductsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
