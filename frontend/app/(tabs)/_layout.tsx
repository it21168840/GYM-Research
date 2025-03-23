import { Tabs } from 'expo-router';
import { Utensils } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: 'Meal Plan',
          tabBarIcon: ({ size, color }) => (
            <Utensils size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}