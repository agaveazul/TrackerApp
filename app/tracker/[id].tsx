import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  onSnapshot,
  updateDoc,
  increment,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/auth";
import { Ionicons } from "@expo/vector-icons";

type Tracker = {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  imageUrl?: string;
  dailyCounts: Record<string, number>;
  sharedWith: string[];
  ownerId: string;
  originalTrackerId?: string;
  originalOwnerId?: string;
};

type UserEmail = {
  id: string;
  email: string;
  name: string;
};

export default function TrackerDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA");
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharingWith, setSharingWith] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const [sharedUserEmails, setSharedUserEmails] = useState<UserEmail[]>([]);
  const [originalOwnerEmail, setOriginalOwnerEmail] =
    useState<UserEmail | null>(null);

  useEffect(() => {
    if (!user || !id) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "trackers", id as string),
      (doc) => {
        if (doc.exists()) {
          setTracker({ id: doc.id, ...doc.data() } as Tracker);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, id]);

  useEffect(() => {
    if (tracker?.sharedWith) {
      setSharingWith(tracker.sharedWith);
    }
  }, [tracker?.sharedWith]);

  useEffect(() => {
    if (isShareModalVisible) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [isShareModalVisible]);

  useEffect(() => {
    if (!tracker) return;

    const fetchUserEmails = async () => {
      try {
        // Fetch original owner's email if this is a shared tracker
        if (tracker.originalOwnerId && tracker.originalOwnerId !== user?.uid) {
          const ownerDoc = await getDoc(
            doc(db, "users", tracker.originalOwnerId)
          );
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
            setOriginalOwnerEmail({
              id: tracker.originalOwnerId,
              email: ownerData.email,
              name: ownerData.name,
            });
          }
        }

        // Fetch emails of shared users
        if (tracker.sharedWith?.length > 0) {
          const userEmails: UserEmail[] = [];
          for (const userId of tracker.sharedWith) {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userEmails.push({
                id: userId,
                email: userData.email,
                name: userData.name,
              });
            }
          }
          setSharedUserEmails(userEmails);
        }
      } catch (error) {
        console.error("Error fetching user emails:", error);
      }
    };

    fetchUserEmails();
  }, [tracker?.sharedWith, tracker?.originalOwnerId, user?.uid]);

  const handleIncrement = async () => {
    if (!user || !tracker) return;
    console.log("today:", today);
    try {
      // If this is a shared tracker, update the original
      if (tracker.originalTrackerId && tracker.originalOwnerId) {
        const originalTrackerRef = doc(
          db,
          "users",
          tracker.originalOwnerId,
          "trackers",
          tracker.originalTrackerId
        );
        await updateDoc(originalTrackerRef, {
          [`dailyCounts.${today}`]: increment(1),
        });
      }

      // Update the current user's copy
      const trackerRef = doc(db, "users", user.uid, "trackers", tracker.id);
      await updateDoc(trackerRef, {
        [`dailyCounts.${today}`]: increment(1),
      });

      // If this is the original tracker, update all shared copies
      if (tracker.sharedWith?.length > 0) {
        // First find all shared copies
        const updatePromises = tracker.sharedWith.map(async (userId) => {
          // Query to find the shared tracker document
          const sharedTrackersRef = collection(db, "users", userId, "trackers");
          const q = query(
            sharedTrackersRef,
            where("originalTrackerId", "==", tracker.id)
          );
          const querySnapshot = await getDocs(q);

          // Update each found shared tracker
          const updatePromises = querySnapshot.docs.map((doc) =>
            updateDoc(doc.ref, {
              [`dailyCounts.${today}`]: increment(1),
            })
          );
          await Promise.all(updatePromises);
        });
        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error("Error incrementing tracker:", error);
      Alert.alert("Error", "Failed to update tracker. Please try again.");
    }
  };

  const handleDecrement = async () => {
    if (!user || !tracker) return;

    try {
      // If this is a shared tracker, update the original
      if (tracker.originalTrackerId && tracker.originalOwnerId) {
        const originalTrackerRef = doc(
          db,
          "users",
          tracker.originalOwnerId,
          "trackers",
          tracker.originalTrackerId
        );
        await updateDoc(originalTrackerRef, {
          [`dailyCounts.${today}`]: increment(-1),
        });
      }

      // Update the current user's copy
      const trackerRef = doc(db, "users", user.uid, "trackers", tracker.id);
      await updateDoc(trackerRef, {
        [`dailyCounts.${today}`]: increment(-1),
      });

      // If this is the original tracker, update all shared copies
      if (tracker.sharedWith?.length > 0) {
        // First find all shared copies
        const updatePromises = tracker.sharedWith.map(async (userId) => {
          // Query to find the shared tracker document
          const sharedTrackersRef = collection(db, "users", userId, "trackers");
          const q = query(
            sharedTrackersRef,
            where("originalTrackerId", "==", tracker.id)
          );
          const querySnapshot = await getDocs(q);

          // Update each found shared tracker
          const updatePromises = querySnapshot.docs.map((doc) =>
            updateDoc(doc.ref, {
              [`dailyCounts.${today}`]: increment(-1),
            })
          );
          await Promise.all(updatePromises);
        });
        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error("Error decrementing tracker:", error);
      Alert.alert("Error", "Failed to update tracker. Please try again.");
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim() || !user || !tracker) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setIsSharing(true);

      // Find user by email
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("email", "==", shareEmail.trim().toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Error", "User not found. Please check the email address.");
        return;
      }

      const targetUser = querySnapshot.docs[0];

      if (targetUser.id === user.uid) {
        Alert.alert("Error", "You can't share a tracker with yourself");
        return;
      }

      if (tracker.sharedWith?.includes(targetUser.id)) {
        Alert.alert("Error", "This tracker is already shared with this user");
        return;
      }

      // Create a copy of the tracker in the target user's collection first
      const sharedTrackerRef = doc(
        collection(db, "users", targetUser.id, "trackers")
      );
      const sharedTracker = {
        name: tracker.name,
        description: tracker.description,
        emoji: tracker.emoji,
        imageUrl: tracker.imageUrl,
        dailyCounts: tracker.dailyCounts,
        createdAt: new Date(),
        sharedWith: [],
        ownerId: targetUser.id,
        originalTrackerId: tracker.id,
        originalOwnerId: user.uid,
      };

      await setDoc(sharedTrackerRef, sharedTracker);

      // Then update the original tracker's sharedWith array
      const trackerRef = doc(db, "users", user.uid, "trackers", tracker.id);
      await updateDoc(trackerRef, {
        sharedWith: arrayUnion(targetUser.id),
      });

      Alert.alert("Success", "Tracker shared successfully");
      setShareEmail("");
      setIsShareModalVisible(false);
    } catch (error) {
      console.error("Error sharing tracker:", error);
      Alert.alert("Error", "Failed to share tracker. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!user || !tracker) return;

    try {
      // First update the original tracker's sharedWith array
      const trackerRef = doc(db, "users", user.uid, "trackers", tracker.id);
      await updateDoc(trackerRef, {
        sharedWith: arrayRemove(userId),
      });

      // Then find and delete the shared tracker
      const sharedTrackersRef = collection(db, "users", userId, "trackers");
      const q = query(
        sharedTrackersRef,
        where("originalTrackerId", "==", tracker.id)
      );
      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Update the local state to remove the user
      setSharedUserEmails((prev) => prev.filter((u) => u.id !== userId));

      Alert.alert("Success", "Sharing removed successfully");
    } catch (error) {
      console.error("Error removing share:", error);
      Alert.alert("Error", "Failed to remove sharing. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Tracker",
      "Are you sure you want to delete this tracker? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user || !tracker) return;
            try {
              setDeleting(true);

              // If this tracker has been shared, delete all shared copies first
              if (tracker.sharedWith?.length > 0) {
                const deleteSharedPromises = tracker.sharedWith.map(
                  async (userId) => {
                    // Find the shared tracker document
                    const sharedTrackersRef = collection(
                      db,
                      "users",
                      userId,
                      "trackers"
                    );
                    const q = query(
                      sharedTrackersRef,
                      where("originalTrackerId", "==", tracker.id)
                    );
                    const querySnapshot = await getDocs(q);

                    // Delete each shared tracker found
                    const deletePromises = querySnapshot.docs.map((doc) =>
                      deleteDoc(doc.ref)
                    );
                    await Promise.all(deletePromises);
                  }
                );
                await Promise.all(deleteSharedPromises);
              }

              // Delete the original tracker
              const trackerRef = doc(
                db,
                "users",
                user.uid,
                "trackers",
                tracker.id
              );
              await deleteDoc(trackerRef);

              setDeleting(false);
              // Ensure we're on the main thread when navigating
              setTimeout(() => {
                router.push("/(tabs)");
              }, 0);
            } catch (error) {
              console.error("Error deleting tracker:", error);
              Alert.alert(
                "Error",
                "Failed to delete tracker. Please try again."
              );
              setDeleting(false);
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

  if (!tracker) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-xl text-gray-600">Tracker not found</Text>
      </View>
    );
  }

  // Prepare historical data
  const historyData = Object.entries(tracker.dailyCounts)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
    .slice(0, 7); // Show last 7 days

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="bg-white">
        <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
          <TouchableOpacity className="p-2 -ml-2" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold">Tracker Details</Text>
          <TouchableOpacity
            className="p-2 -mr-2"
            onPress={() => {
              Alert.alert(
                "Delete Tracker",
                "Are you sure you want to delete this tracker?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: handleDelete,
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1">
        <View className="p-6">
          <View className="items-center mb-6">
            <View className="w-24 h-24 mb-4 items-center justify-center rounded-2xl bg-gray-50">
              {tracker?.emoji ? (
                <Text className="text-4xl">{tracker.emoji}</Text>
              ) : tracker?.imageUrl ? (
                <Image
                  source={{ uri: tracker.imageUrl }}
                  className="w-full h-full rounded-2xl"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="analytics" size={40} color="#666" />
              )}
            </View>
            <Text className="text-2xl font-bold mb-2">{tracker.name}</Text>
            {tracker.description ? (
              <Text className="text-gray-600 text-center">
                {tracker.description}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between bg-gray-100 p-6 rounded-xl mb-8">
            <TouchableOpacity
              className="bg-[#00bf63] w-12 h-12 rounded-full items-center justify-center"
              onPress={handleDecrement}
            >
              <Ionicons name="remove" size={24} color="white" />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-4xl font-bold">
                {tracker.dailyCounts[today] || 0}
              </Text>
              <Text className="text-gray-500">Today</Text>
            </View>

            <TouchableOpacity
              className="bg-[#00bf63] w-12 h-12 rounded-full items-center justify-center"
              onPress={handleIncrement}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="bg-gray-100 p-4 rounded-xl mb-6">
            <Text className="text-lg font-semibold mb-4">History</Text>
            {historyData.length > 0 ? (
              <View className="space-y-3">
                {historyData.map(([date, count]) => {
                  const [year, month, day] = date.split("-");
                  const formattedDate = `${month}/${day}/${year}`;
                  return (
                    <View
                      key={date}
                      className="flex-row justify-between items-center py-2 border-b border-gray-200"
                    >
                      <Text className="text-gray-600">{formattedDate}</Text>
                      <Text className="text-xl font-semibold">{count}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="text-gray-500 text-center py-8">
                No data available yet
              </Text>
            )}
          </View>

          {originalOwnerEmail && (
            <View className="mt-6 bg-gray-100 p-4 rounded-xl">
              <Text className="text-lg font-semibold mb-2">Original Owner</Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="person"
                  size={20}
                  color="#666"
                  className="mr-2"
                />
                <View>
                  <Text className="text-gray-900 font-medium">
                    {originalOwnerEmail.name}
                  </Text>
                  <Text className="text-gray-600">
                    {originalOwnerEmail.email}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            className="w-full h-12 bg-[#00bf63] rounded-xl items-center justify-center"
            onPress={() => setIsShareModalVisible(true)}
          >
            <Text className="text-white font-semibold text-lg">Share</Text>
          </TouchableOpacity>

          {sharedUserEmails.length > 0 && (
            <View className="mt-6 bg-gray-100 p-4 rounded-xl">
              <Text className="text-lg font-semibold mb-2">Shared With</Text>
              {sharedUserEmails.map((user, index) => (
                <View
                  key={user.id}
                  className={`flex-row items-center justify-between py-2 ${
                    sharedUserEmails.length > 1 &&
                    index !== sharedUserEmails.length - 1
                      ? "border-b border-gray-200"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Ionicons
                      name="person"
                      size={20}
                      color="#666"
                      className="mr-2"
                    />
                    <View>
                      <Text className="text-gray-900 font-medium">
                        {user.name}
                      </Text>
                      <Text className="text-gray-600">{user.email}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveShare(user.id)}
                    className="p-2"
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isShareModalVisible}
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsShareModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View className="bg-white p-6 rounded-t-3xl">
                  <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-semibold">Share Tracker</Text>
                    <TouchableOpacity
                      onPress={() => setIsShareModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <Text className="text-gray-600 mb-2">
                    Enter user's email address:
                  </Text>
                  <TextInput
                    ref={emailInputRef}
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg mb-6"
                    placeholder="user@example.com"
                    value={shareEmail}
                    onChangeText={setShareEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleShare}
                  />

                  <TouchableOpacity
                    className="w-full h-12 bg-[#00bf63] rounded-xl items-center justify-center"
                    onPress={handleShare}
                    disabled={isSharing}
                  >
                    {isSharing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-lg">
                        Share
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
