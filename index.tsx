import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Get the screen width for responsive design
const { width } = Dimensions.get('window');

type ExerciseItem = {
  id: string;
  name: string;
  description: string;
};

// A simple mapping from category name to a list of exercises
const exerciseMap: Record<string, ExerciseItem[]> = {
  Shoulder: [
    { id: 'elbowFlexion', name: 'Elbow Flexion', description: 'A great exercise to help build and tone your biceps. Focus on bending your arm to strengthen the muscles in your upper arm, improving both strength and flexibility...' },
    { id: 'elbowExtension', name: 'Elbow Extension', description: 'Target your triceps with this simple yet effective movement. Elbow extensions work to strengthen the back of your upper arms, contributing to overall arm strength and definition...' },
  ],
  Knee: [
    { id: 'squats', name: 'Squats', description: 'A fantastic full-body exercise that primarily works your legs and glutes. Squats help build strength, endurance, and balance, making them perfect for overall fitness and leg development....' },
    { id: 'legExtension', name: 'Leg Extension', description: 'Isolate and strengthen your quadriceps with this exercise. Leg extensions are great for toning the front of your thighs, improving knee stability, and enhancing leg muscle definition...' },
  ],
};

export default function ExerciseListScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { category }: any = route.params; // e.g. { id: '2', name: 'Shoulder' }

  // Based on the selected category, get the appropriate exercises
  const exercises = exerciseMap[category.name] || [];

  const handleExercisePress = (exercise: ExerciseItem) => {
    navigation.navigate('ExerciseDetailScreen' as never, { exercise } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.categoryBox}>
        <Text style={styles.header}>Category: {category.name}</Text>
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseItemButton item={item} onPress={handleExercisePress} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No exercises found for this category.
          </Text>
        }
      />
    </View>
  );
}

const ExerciseItemButton = ({ item, onPress }: { item: ExerciseItem, onPress: (exercise: ExerciseItem) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handlePressIn = () => setIsHovered(true);  // Change style when pressed
  const handlePressOut = () => setIsHovered(false); // Reset style after release

  return (
    <TouchableOpacity
      style={[styles.item, isHovered && styles.itemHovered]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(item)}
    >
      <Text style={styles.itemText}>{item.name}</Text>
      <Text style={styles.descText}>{item.description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#B4B8B3', // Light Blue background color
  },
  categoryBox: {
    alignSelf: 'center', // Centers the category box
    marginBottom: 30, // Add some space below the category box
    backgroundColor: '#5B8E7D', // Green background for the category box
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4, // For Android shadow effect
    width: '65%', // Adjust width for a sleek look
  },
  header: {
    fontSize: 28, // Increased font size for better readability
    fontWeight: '700', // Bold weight for the header
    color: '#FFFFFF', // White text for better contrast
    textAlign: 'center', // Ensure the text is centered inside the box
    fontFamily: 'Roboto', // Use a modern font family
  },
  item: {
    backgroundColor: '#FFFFFF', // White background for each exercise item
    padding: 18,
    marginVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2, // Subtle shadow effect for item
    width: width * 0.8, // 80% of the screen width for dynamic resizing
    alignSelf: 'center',
    height: 100, // Center the buttons horizontally
  },
  itemHovered: {
    backgroundColor: '#d1e7e3', // Light green background on hover-like interaction
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6, // Increased shadow for pressed state
  },
  itemText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50', // Dark gray text for exercise names
    fontFamily: 'Roboto',
  },
  descText: {
    fontSize: 16,
    color: '#7F8C8D', // Light gray text for descriptions
    fontFamily: 'Roboto',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#7F8C8D', // Light gray for empty list text
    fontFamily: 'Roboto',
  },
});
