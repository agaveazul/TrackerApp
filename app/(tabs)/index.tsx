import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
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
};

function calculateAverage(dailyCounts: Record<string, number>): string {
  const values = Object.values(dailyCounts);
  if (values.length === 0) return "0";
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / values.length;
  return avg.toFixed(1);
}

export default function TabOneScreen() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
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

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "trackers"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const trackersData: Tracker[] = [];
      querySnapshot.forEach((doc) => {
        trackersData.push({ id: doc.id, ...doc.data() } as Tracker);
      });
      console.log("Fetched trackers:", trackersData);
      setTrackers(trackersData);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="bg-white">
        <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
          <Text className="text-2xl font-bold">My Trackers</Text>
          <View className="flex-row items-center">
            <Link href="/new-tracker" asChild>
              <TouchableOpacity className="p-2 rounded-full bg-gray-100 mr-2">
                <Ionicons name="add" size={24} color="#666" />
              </TouchableOpacity>
            </Link>
            <TouchableOpacity
              className="p-2 rounded-full bg-gray-100"
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1">
        <View className="p-4">
          {trackers.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500 text-lg mb-4">
                No trackers yet
              </Text>
              <Link href="/new-tracker" asChild>
                <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg">
                  <Text className="text-white font-semibold">
                    Create Your First Tracker
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            trackers.map((tracker) => (
              <Link key={tracker.id} href={`/tracker/${tracker.id}`} asChild>
                <TouchableOpacity className="flex-row items-center p-4 mb-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <View className="w-12 h-12 mr-4 items-center justify-center rounded-lg bg-gray-50">
                    {tracker.emoji ? (
                      <Text className="text-2xl">{tracker.emoji}</Text>
                    ) : tracker.imageUrl ? (
                      <Image
                        source={{ uri: tracker.imageUrl }}
                        className="w-full h-full rounded-lg"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="analytics" size={24} color="#666" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold">
                      {tracker.name}
                    </Text>
                    {tracker.description ? (
                      <Text className="text-gray-500 mt-1" numberOfLines={1}>
                        {tracker.description}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <Text className="text-2xl font-bold">
                      {tracker.dailyCounts[
                        new Date().toISOString().split("T")[0]
                      ] || 0}
                    </Text>
                    <Text className="text-gray-500">
                      avg: {calculateAverage(tracker.dailyCounts)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#999"
                    className="ml-2"
                  />
                </TouchableOpacity>
              </Link>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
