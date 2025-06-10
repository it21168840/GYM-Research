import { useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const TechnicalScreen = () => {
  const route = useRoute();
  const [userComment, setUserComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUpdated, setHasUpdated] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState(
    route.params?.recoveryPlan || ''
  );
  const stressScore = route.params?.stressScore || 0; // Default to 0 if not provided
  const stressCategory = route.params?.stressCategory || 'Unknown';

  const handleUpdatePlan = async () => {
    if (!userComment.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.update_plan}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: userComment,
          currentPlan: recoveryPlan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update plan');
      }

      const data = await response.json();
      setRecoveryPlan(data.updated_plan);
      setUserComment(''); // Clear comment
      setHasUpdated(true); // Mark as updated
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scoreContainer}>
        <Text style={styles.title}>Your Results</Text>
        <Text style={styles.scoreText}>Score: {stressScore}</Text>
        <Text style={styles.categoryText}>
          Stress Category: {stressCategory}
        </Text>
      </View>

      <View style={styles.planContainer}>
        <Text style={styles.subtitle}>Recovery Plan:</Text>
        <Text style={styles.planText}>{recoveryPlan}</Text>
      </View>

      {hasUpdated ? (
        <View style={styles.thankYouContainer}>
          <Text style={styles.subtitle}>Thank You!</Text>
          <Text style={styles.helperText}>
            Your plan has been updated based on your preferences. We hope this
            modified plan better suits your needs.
          </Text>
          <Text style={styles.helperText}>
            Follow this plan and take care of yourself!
          </Text>
        </View>
      ) : (
        <View style={styles.feedbackContainer}>
          <Text style={styles.subtitle}>Need to modify the plan?</Text>
          <Text style={styles.helperText}>
            Tell us any constraints or preferences you have:
          </Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            value={userComment}
            onChangeText={setUserComment}
            placeholder="e.g., I can't do aerobic exercises"
            placeholderTextColor="gray"
          />
          <Button
            mode="contained"
            onPress={handleUpdatePlan}
            loading={isLoading}
            disabled={isLoading || !userComment.trim()}
            style={styles.button}
          >
            Update Plan
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scoreContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'black',
  },
  scoreText: {
    fontSize: 20,
    color: '#2196F3',
  },
  planContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planText: {
    fontSize: 16,
    lineHeight: 24,
  },
  feedbackContainer: {
    marginTop: 20,
  },
  thankYouContainer: {
    marginTop: 20,
    backgroundColor: '#E8F5E9', // Light green background
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    color: 'black',
  },
  button: {
    marginTop: 10,
  },
  categoryText: {
    fontSize: 18,
    color: '#FF9800',
    marginTop: 5,
  },
});

export default TechnicalScreen;
