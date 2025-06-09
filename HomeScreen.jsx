import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();

  const handleExercisePress = () => {
    // Navigate to the category screen
    navigation.navigate('CategoryScreen'); // This assumes you have a CategoryScreen registered in the navigation stack
  };

  return (
    <View style={styles.container}>
      <View style={styles.header} />

      <Text style={styles.title}>Wellness Tracker</Text>

      <TouchableOpacity style={styles.button} onPress={handleExercisePress}>
        <Text style={styles.buttonText}>Exercises</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔥 Enhance Your Fitness 🔥</Text>
        <Text style={styles.infoText}>
          💪 Track your exercises, improve your form, and prevent injuries with real-time feedback.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background
    alignItems: 'center',
    paddingTop: 20,
  },
  header: {
    width: '100%',
    height: 150,
    backgroundColor: '#1F4B4B', // Dark Teal color
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#C8A2C8', // Light Red Button
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginVertical: 10,
    width: '20%', // Button size
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E1A47',
  },
  infoCard: {
    backgroundColor: '#1E293B', // Dark Blue-Gray background
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FACC15', // Bright Yellow
    textAlign: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#E2E8F0', // Light Grayish Blue
    textAlign: 'center',
    lineHeight: 22,
  },
});
