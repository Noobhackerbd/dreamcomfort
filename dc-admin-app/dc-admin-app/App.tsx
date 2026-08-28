import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { loadAuth, isLoggedIn } from "./src/api";
import { C } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: C.brand },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.sub,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={route.name === "Dashboard" ? "home" : "receipt"} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" options={{ title: "ড্যাশবোর্ড" }}>
        {(props) => <DashboardScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: "অর্ডার" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      await loadAuth();
      setAuthed(isLoggedIn());
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.brand }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {authed ? (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: C.brand }, headerTintColor: "#fff", headerTitleStyle: { fontWeight: "800" } }}>
            <Stack.Screen name="Main" options={{ headerShown: false }}>
              {() => <Tabs onLogout={() => setAuthed(false)} />}
            </Stack.Screen>
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "অর্ডার বিস্তারিত" }} />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <LoginScreen onDone={() => setAuthed(true)} />
      )}
    </>
  );
}
