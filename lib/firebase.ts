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

  if (!isProd) {
    // Development - use EXPO_PUBLIC vars
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
    // Production - use EAS secrets
    return {
      apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
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
    "Firebase API key is missing. Check your environment variables."
  );
  throw new Error("Firebase configuration is incomplete");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with the correct persistence
let auth;

if (isWeb) {
  auth = getAuth(app);
} else {
  // For React Native, use ReactNativePersistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Remove the setPersistence call since we're handling it in the initialization
export { auth };

// Initialize other services
export const db = getFirestore(app);
export const storage = getStorage(app);
