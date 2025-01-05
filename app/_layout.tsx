import { Slot, Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, SafeAreaView, Platform, StatusBar } from "react-native";
import "../global.css";
import { AuthProvider, useAuth } from "../context/auth";

// Root layout must be exported as default
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check if the path is protected
      const inAuthGroup = segments[0] === "(auth)";
      const inTabsGroup = segments[0] === "(tabs)";

      if (!user && !inAuthGroup) {
        // Redirect to the sign-in page
        router.replace("/sign-in");
      } else if (user && inAuthGroup) {
        // Redirect to the home page
        router.replace("/");
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="bg-white">
        <StatusBar barStyle="dark-content" />
      </SafeAreaView>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "white",
          },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
