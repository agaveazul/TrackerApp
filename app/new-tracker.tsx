import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import EmojiPicker from "rn-emoji-keyboard";

export default function NewTracker() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        setEmoji(""); // Clear emoji when image is selected
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `tracker-images/${user?.uid}/${Date.now()}.jpg`;
      const imageRef = ref(storage, fileName);
      await uploadBytes(imageRef, blob);
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  };

  const handleCreate = async () => {
    if (!user) {
      setError("You must be logged in to create a tracker");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!emoji && !imageUri) {
      setError("Please select an emoji or image");
      return;
    }

    try {
      setLoading(true);
      setError("");

      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      // Create new tracker document
      const docRef = await addDoc(
        collection(db, "users", user.uid, "trackers"),
        {
          name: name.trim(),
          description: description.trim(),
          emoji: emoji,
          imageUrl: imageUrl,
          createdAt: new Date(),
          dailyCounts: {},
          sharedWith: [],
          ownerId: user.uid,
        }
      );

      if (docRef.id) {
        router.back();
      } else {
        setError("Failed to create tracker. Please try again.");
      }
    } catch (error) {
      console.error("Error creating tracker:", error);
      setError("Failed to create tracker. Please try again.");
      Alert.alert("Error", "Failed to create tracker. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="bg-white">
        <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
          <TouchableOpacity className="p-2 -ml-2" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold flex-1 ml-2">New Tracker</Text>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1">
        <View className="p-6 space-y-6">
          {error ? (
            <Text className="text-red-500 text-center mb-4">{error}</Text>
          ) : null}

          <View>
            <Text className="text-lg font-semibold mb-2">Name</Text>
            <TextInput
              className="w-full h-12 px-4 border border-gray-300 rounded-lg"
              placeholder="e.g., Daily Steps"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError("");
              }}
              autoFocus
              returnKeyType="next"
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
              returnKeyType="next"
            />
          </View>

          <View>
            <Text className="text-lg font-semibold mb-2">Icon</Text>
            <View className="flex-row space-x-4">
              <TouchableOpacity
                onPress={() => setIsEmojiPickerOpen(true)}
                className="flex-1 h-12 border border-gray-300 rounded-lg items-center justify-center"
              >
                <Text className="text-lg">
                  {emoji ? emoji : "Select Emoji 😊"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImage}
                className="flex-1 h-12 border border-gray-300 rounded-lg items-center justify-center"
              >
                <Text className="text-gray-600">
                  {imageUri ? "Change Image" : "Upload Image"}
                </Text>
              </TouchableOpacity>
            </View>

            {imageUri ? (
              <View className="mt-4 items-center">
                <Image
                  source={{ uri: imageUri }}
                  className="w-20 h-20 rounded-lg"
                />
                <TouchableOpacity
                  className="mt-2"
                  onPress={() => setImageUri("")}
                >
                  <Text className="text-red-500">Remove Image</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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

      <EmojiPicker
        onEmojiSelected={(emoji: { emoji: string }) => {
          setEmoji(emoji.emoji);
          setImageUri(""); // Clear image when emoji is selected
          setIsEmojiPickerOpen(false);
        }}
        open={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
      />
    </View>
  );
}
