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

// Get config based on environment
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

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
