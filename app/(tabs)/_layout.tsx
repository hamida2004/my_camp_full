import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, Alert } from "react-native";
import { useLanguage } from "../../context/languageContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {

  const { t, changeLanguage } = useLanguage();

  const inserts = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3498db",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: { backgroundColor: "#fff", height: 60 + inserts.bottom, paddingBottom: inserts.bottom },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="(Home)"
        options={{
          title: t.home || "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(Manage)"
        options={{
          title: t.items || "Items",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(Budget)"
        options={{
          title: t.budget || "Budget",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-balance-wallet" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}