import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from "firebase/auth";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/auth";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.name || "");
          setEmail(userData.email || user.email || "");
          setPhotoURL(userData.photoURL || "");
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert("Error", "Failed to load profile information");
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setIsSaving(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();

        const storage = getStorage();
        const storageRef = ref(storage, `profile-photos/${user?.uid}`);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", user!.uid), {
          photoURL: downloadURL,
          updatedAt: new Date(),
        });

        setPhotoURL(downloadURL);
        Alert.alert("Success", "Profile photo updated successfully");
      } catch (error) {
        console.error("Error uploading photo:", error);
        Alert.alert("Error", "Failed to update profile photo");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name,
        updatedAt: new Date(),
      });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    try {
      setIsSaving(true);
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Success", "Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      Alert.alert(
        "Error",
        "Failed to update password. Please check your current password and try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/sign-in");
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSaving(true);

              // Delete profile photo from storage if it exists
              if (photoURL) {
                const storage = getStorage();
                const photoRef = ref(storage, `profile-photos/${user.uid}`);
                await deleteObject(photoRef).catch(() => {
                  // Ignore error if photo doesn't exist
                });
              }

              // Delete user's trackers and clean up shared trackers
              const trackersRef = collection(db, "users", user.uid, "trackers");
              const trackersSnapshot = await getDocs(trackersRef);

              // First, collect all trackers that were created by this user
              const ownedTrackers = trackersSnapshot.docs.filter(
                (doc) => !doc.data().originalTrackerId
              );

              // For each owned tracker, find and delete all shared copies
              for (const tracker of ownedTrackers) {
                const trackerData = tracker.data();
                if (
                  trackerData.sharedWith &&
                  trackerData.sharedWith.length > 0
                ) {
                  // Delete shared copies from other users' collections
                  for (const sharedUserId of trackerData.sharedWith) {
                    const sharedTrackersRef = collection(
                      db,
                      "users",
                      sharedUserId,
                      "trackers"
                    );
                    const sharedTrackersSnapshot = await getDocs(
                      sharedTrackersRef
                    );
                    const sharedTracker = sharedTrackersSnapshot.docs.find(
                      (doc) => doc.data().originalTrackerId === tracker.id
                    );
                    if (sharedTracker) {
                      await deleteDoc(sharedTracker.ref);
                    }
                  }
                }
              }

              // Now delete all user's own trackers
              const deletePromises = trackersSnapshot.docs.map((doc) =>
                deleteDoc(doc.ref)
              );
              await Promise.all(deletePromises);

              // Delete user document
              await deleteDoc(doc(db, "users", user.uid));

              // Delete Firebase Auth user
              await deleteUser(user);

              router.replace("/sign-in");
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. You may need to sign in again before deleting."
              );
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="bg-white">
        <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
          <TouchableOpacity className="p-2 -ml-2" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold flex-1 ml-2">Profile</Text>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      <View className="p-6">
        <TouchableOpacity
          className="mb-12"
          onPress={pickImage}
          disabled={isSaving}
        >
          <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-2 self-center">
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <Ionicons name="person" size={40} color="#666" />
            )}
            {isSaving && (
              <View className="absolute inset-0 bg-black/20 rounded-full items-center justify-center">
                <ActivityIndicator color="white" />
              </View>
            )}
          </View>
          <Text className="text-[#00bf63] text-center">Change Photo</Text>
        </TouchableOpacity>

        <View className="space-y-8">
          <View className="space-y-8">
            <View>
              <Text className="text-gray-600 mb-2">Name</Text>
              <View className="flex-row items-center mb-4">
                <View className="flex-1">
                  {isEditing ? (
                    <TextInput
                      className="h-8 px-0 text-lg"
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your name"
                    />
                  ) : (
                    <Text className="text-lg">{name || "Not set"}</Text>
                  )}
                </View>
                {isEditing ? (
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      className="bg-gray-100 px-4 py-2 rounded-lg"
                      onPress={() => setIsEditing(false)}
                    >
                      <Text className="font-medium">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-[#00bf63] px-4 py-2 rounded-lg"
                      onPress={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white font-medium">Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="bg-gray-100 px-4 py-2 rounded-lg"
                    onPress={() => setIsEditing(true)}
                  >
                    <Text className="text-[#00bf63] font-medium">Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View>
              <Text className="text-gray-600 mb-2">Email</Text>
              <Text className="text-lg mb-4">{email}</Text>
            </View>

            <View>
              <Text className="text-gray-600 mb-2">Password</Text>
              <View className="flex-row items-center mb-4">
                <View className="flex-1">
                  <Text className="text-lg">••••••••</Text>
                </View>
                <TouchableOpacity
                  className="bg-gray-100 px-4 py-2 rounded-lg"
                  onPress={() => setIsChangingPassword(true)}
                >
                  <Text className="text-[#00bf63] font-medium">Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {isChangingPassword ? (
            <View className="space-y-4">
              <View>
                <Text className="text-gray-600 mb-2">Current Password</Text>
                <TextInput
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry
                />
              </View>
              <View>
                <Text className="text-gray-600 mb-2">New Password</Text>
                <TextInput
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                />
              </View>
            </View>
          ) : null}

          <View className="space-y-4 pt-4">
            {isChangingPassword ? (
              <View className="flex-row space-x-4">
                <TouchableOpacity
                  className="flex-1 h-12 bg-gray-200 rounded-lg items-center justify-center"
                  onPress={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                  }}
                >
                  <Text className="font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 h-12 bg-[#00bf63] rounded-lg items-center justify-center"
                  onPress={handleChangePassword}
                  disabled={isSaving || !currentPassword || !newPassword}
                >
                  {isSaving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">
                      Update Password
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="space-y-3">
              <TouchableOpacity
                className="w-full h-12 bg-red-50 rounded-lg items-center justify-center"
                onPress={handleLogout}
              >
                <Text className="text-red-500 font-semibold">Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-full h-12 items-center justify-center"
                onPress={handleDeleteAccount}
              >
                <Text className="text-gray-500">Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
