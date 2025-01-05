import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/auth";
import { Tracker } from "../../lib/firebase";
import { Ionicons } from "@expo/vector-icons";

export default function TrackerDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

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

  const handleIncrement = async () => {
    if (!user || !tracker) return;

    const trackerRef = doc(db, "users", user.uid, "trackers", tracker.id);
    await updateDoc(trackerRef, {
      [`dailyCounts.${today}`]: increment(1),
    });
  };

  const handleDecrement = async () => {
    if (!user || !tracker) return;

    const trackerRef = doc(db, "users", user.uid, "trackers", tracker.id);
    await updateDoc(trackerRef, {
      [`dailyCounts.${today}`]: increment(-1),
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Track "${tracker?.name}" with me!`,
        // In a real app, you'd generate a deep link here
        url: "https://your-app.com/tracker/" + tracker?.id,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
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
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-bold">{tracker.name}</Text>
          <TouchableOpacity
            className="p-2 rounded-full bg-gray-100 active:bg-gray-200"
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <Text className="text-gray-600 mb-8">{tracker.description}</Text>

        <View className="flex-row items-center justify-between bg-gray-100 p-6 rounded-xl mb-8">
          <TouchableOpacity
            className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-sm active:bg-gray-50"
            onPress={handleDecrement}
          >
            <Ionicons name="remove" size={32} color="#666" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-4xl font-bold">
              {tracker.dailyCounts[today] || 0}
            </Text>
            <Text className="text-gray-500">Today</Text>
          </View>

          <TouchableOpacity
            className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center shadow-sm active:bg-blue-600"
            onPress={handleIncrement}
          >
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>

        <View className="bg-gray-100 p-4 rounded-xl">
          <Text className="text-lg font-semibold mb-4">History</Text>
          {historyData.length > 0 ? (
            <View className="space-y-3">
              {historyData.map(([date, count]) => {
                const d = new Date(date);
                const formattedDate = `${
                  d.getMonth() + 1
                }/${d.getDate()}/${d.getFullYear()}`;
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
      </View>
    </ScrollView>
  );
}
