import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isWeb } from "../utils/platform";
import Constants from "expo-constants";

// Get config based on environment
const getFirebaseConfig = () => {
  const isProd = process.env.APP_ENV === "production";
  console.log("[Firebase] Initializing with APP_ENV:", process.env.APP_ENV);

  if (!isProd) {
    console.log("[Firebase] Using development configuration");
    return {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  } else {
    console.log("[Firebase] Using production configuration");
    console.log(
      "[Firebase] API Key from Constants:",
      !!Constants.expoConfig?.extra?.firebaseApiKey
    );
    return {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  }
};

const firebaseConfig = getFirebaseConfig();

// Validate configuration
if (!firebaseConfig.apiKey) {
  console.error(
    "[Firebase] API key is missing. Config:",
    JSON.stringify({
      isProd: process.env.APP_ENV === "production",
      hasConstantsExtra: !!Constants.expoConfig?.extra,
      envVars: {
        APP_ENV: process.env.APP_ENV,
        hasAuthDomain: !!process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        hasProjectId: !!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      },
    })
  );
  throw new Error("Firebase configuration is incomplete: Missing API Key");
}

// Initialize Firebase
let app;
try {
  console.log("[Firebase] Attempting to initialize app");
  app = initializeApp(firebaseConfig);
  console.log("[Firebase] App initialized successfully");
} catch (error) {
  console.error("[Firebase] Failed to initialize app:", error);
  throw error;
}

// Initialize Auth with the correct persistence
let auth;

try {
  if (isWeb) {
    console.log("[Firebase] Initializing web auth");
    auth = getAuth(app);
  } else {
    console.log("[Firebase] Initializing native auth with persistence");
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  console.log("[Firebase] Auth initialized successfully");
} catch (error) {
  console.error("[Firebase] Failed to initialize auth:", error);
  throw error;
}

// Remove the setPersistence call since we're handling it in the initialization
export { auth };

// Initialize other services
export const db = getFirestore(app);
export const storage = getStorage(app);
