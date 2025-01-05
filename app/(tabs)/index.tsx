import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { Link, useRouter } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/auth";
import { Tracker } from "../../lib/firebase";
import { Ionicons } from "@expo/vector-icons";

export default function TrackerList() {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // Query trackers owned by user or shared with user
    const q = query(
      collection(db, "users", user.uid, "trackers"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trackerList: Tracker[] = [];
      snapshot.forEach((doc) => {
        trackerList.push({ id: doc.id, ...doc.data() } as Tracker);
      });
      setTrackers(trackerList);
    });

    return () => unsubscribe();
  }, [user]);

  const renderTracker = ({ item }: { item: Tracker }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 bg-white rounded-lg shadow-sm mb-3"
      onPress={() => router.push(`/tracker/${item.id}`)}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          className="w-12 h-12 rounded-full mr-4"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-gray-200 mr-4 items-center justify-center">
          <Ionicons name="analytics" size={24} color="#666" />
        </View>
      )}

      <View className="flex-1">
        <Text className="text-lg font-semibold">{item.name}</Text>
        <Text className="text-gray-600" numberOfLines={1}>
          {item.description}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-2xl font-bold">
          {item.dailyCounts[new Date().toISOString().split("T")[0]] || 0}
        </Text>
        <Text className="text-gray-500">Today</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        className="p-4"
        data={trackers}
        renderItem={renderTracker}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500 text-lg mb-4">No trackers yet</Text>
            <TouchableOpacity
              className="bg-blue-500 px-6 py-3 rounded-lg"
              onPress={() => router.push("/new-tracker")}
            >
              <Text className="text-white font-semibold">
                Create Your First Tracker
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-8 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push("/new-tracker")}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}
