import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  Auth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthPersistence } from "../hooks/useAuthPersistence";

type AuthContextType = {
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Use the auth persistence hook
  useAuthPersistence();

  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      console.log("Auth state changed:", currentUser?.email || "No user");
      setUser(currentUser);
    });

    return () => {
      console.log("Cleaning up auth state listener");
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
