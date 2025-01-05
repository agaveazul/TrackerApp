import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create the user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Error signing up:", error);
      Alert.alert(
        "Error",
        error.code === "auth/email-already-in-use"
          ? "This email is already registered. Please sign in instead."
          : "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 p-6 justify-center">
        <Text className="text-3xl font-bold mb-16 text-center">
          Create Account
        </Text>

        <View className="space-y-8">
          <View>
            <Text className="text-gray-600 mb-4">Name</Text>
            <TextInput
              className="w-full h-12 px-4 border border-gray-300 rounded-lg mb-8"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View>
            <Text className="text-gray-600 mb-4">Email</Text>
            <TextInput
              className="w-full h-12 px-4 border border-gray-300 rounded-lg mb-8"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View>
            <Text className="text-gray-600 mb-4">Password</Text>
            <TextInput
              className="w-full h-12 px-4 border border-gray-300 rounded-lg"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
          </View>

          <TouchableOpacity
            className="w-full h-12 bg-[#00bf63] rounded-lg items-center justify-center mt-6"
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-12">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-[#00bf63] font-semibold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
