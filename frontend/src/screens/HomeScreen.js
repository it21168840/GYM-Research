import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { apiService } from '../services/apiService';

export default function HomeScreen({ navigation }) {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      console.log('Attempting to connect to:', API_BASE_URL);
      const response = await apiService.get(ENDPOINTS.emotions);
      console.log('Backend response:', response);
      setConnectionStatus('Connected to backend successfully');
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus(`Failed to connect: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wellness Tracker</Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Emotion')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Emotion Tracking
        </Button>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Stress')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Stress Management
        </Button>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Live')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Live Detection
        </Button>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Track Your Well-being</Text>
        <Text style={styles.infoText}>
          Monitor your emotional state and stress levels to improve your mental
          health.
        </Text>
      </View>

      <Text style={styles.exploreText}>Explore</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1C1C1E', // Dark background
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 20,
    marginBottom: 40,
  },
  button: {
    borderRadius: 30,
    backgroundColor: '#C5B1FF', // Light purple color
    elevation: 0,
  },
  buttonContent: {
    height: 60,
  },
  buttonLabel: {
    fontSize: 18,
    color: '#1C1C1E', // Dark text
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent white
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    lineHeight: 24,
  },
  exploreText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.6,
  },
});
