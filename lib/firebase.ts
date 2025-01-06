import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isWeb } from "../utils/platform";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
if (!firebaseConfig.apiKey) {
  console.error(
    "Firebase API key is missing. Check your environment variables."
  );
  throw new Error("Firebase configuration is incomplete");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
let auth;

if (isWeb) {
  auth = getAuth(app);
} else {
  // For React Native, we need to use a custom persistence layer
  auth = initializeAuth(app);

  // Set up persistence listeners manually
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        await AsyncStorage.setItem(
          "firebase:auth:user",
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          })
        );
      } catch (error) {
        console.error("Error saving auth state:", error);
      }
    } else {
      try {
        await AsyncStorage.removeItem("firebase:auth:user");
      } catch (error) {
        console.error("Error removing auth state:", error);
      }
    }
  });

  // Try to restore auth state on initialization
  AsyncStorage.getItem("firebase:auth:user")
    .then((savedUser) => {
      if (savedUser) {
        console.log("Restored auth state from AsyncStorage");
      }
    })
    .catch((error) => {
      console.error("Error restoring auth state:", error);
    });
}

export { auth };

// Initialize other services
export const db = getFirestore(app);
export const storage = getStorage(app);
