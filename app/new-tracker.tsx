import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";

export default function NewTracker() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Create new tracker document
      await addDoc(collection(db, "users", user.uid, "trackers"), {
        name,
        description,
        imageUrl: imageUrl || null,
        createdAt: new Date(),
        dailyCounts: {},
        sharedWith: [],
        ownerId: user.uid,
      });

      router.back();
    } catch (error) {
      console.error("Error creating tracker:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6 space-y-6">
        <View>
          <Text className="text-lg font-semibold mb-2">Name</Text>
          <TextInput
            className="w-full h-12 px-4 border border-gray-300 rounded-lg"
            placeholder="e.g., Daily Steps"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View>
          <Text className="text-lg font-semibold mb-2">Description</Text>
          <TextInput
            className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg"
            placeholder="What are you tracking?"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View>
          <Text className="text-lg font-semibold mb-2">
            Image URL (Optional)
          </Text>
          <TextInput
            className="w-full h-12 px-4 border border-gray-300 rounded-lg"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <TouchableOpacity
          className="w-full h-12 bg-blue-500 rounded-lg items-center justify-center mt-6"
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">Create Tracker</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
