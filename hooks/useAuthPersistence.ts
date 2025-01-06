import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

const AUTH_STATE_KEY = "@auth_state";

interface PersistedUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export function useAuthPersistence() {
  useEffect(() => {
    // Load persisted auth state
    const loadPersistedAuthState = async () => {
      try {
        const persistedUser = await AsyncStorage.getItem(AUTH_STATE_KEY);
        if (persistedUser) {
          const userData = JSON.parse(persistedUser) as PersistedUserData;
          // The actual auth state will be handled by Firebase's own persistence
          console.log("Loaded persisted auth state:", userData.email);
        }
      } catch (error) {
        console.warn("Error loading persisted auth state:", error);
      }
    };

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        if (user) {
          // Persist minimal user data
          const userData: PersistedUserData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          };
          await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(userData));
        } else {
          // Clear persisted data on sign out
          await AsyncStorage.removeItem(AUTH_STATE_KEY);
        }
      } catch (error) {
        console.warn("Error persisting auth state:", error);
      }
    });

    // Load initial state
    loadPersistedAuthState();

    // Cleanup subscription
    return () => unsubscribe();
  }, []);
}
