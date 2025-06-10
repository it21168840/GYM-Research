import { useNavigation } from '@react-navigation/native'; // Import navigation
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dimensions,
  Image,
  ScrollView,
  Text,
  View,
} from 'react-native';
import QuestionItem from '../components/QuestionItem';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const StressScreen = () => {
  // Get screen dimensions
  const windowWidth = Dimensions.get('window').width;

  const questions = [
    'I found myself getting upset by quite trivial things.',
    'I tended to over-react to situations.',
    'I found it difficult to relax.',
    'I found myself getting upset rather easily.',
    'I felt that I was using a lot of nervous energy.',
    'I found myself getting impatient when I was delayed in any way (e.g., elevators, traffic lights, being kept waiting).',
    'I felt that I was rather touchy.',
    'I found that I was very irritable.',
    'I found it hard to calm down after something upset me.',
    'I found it difficult to tolerate interruptions to what I was doing.',
    'I was in a state of nervous tension.',
    'I was intolerant of anything that kept me from getting on with what I was doing.',
    'I found myself getting agitated.',
    'I found it hard to wind down.',
  ];

  // This maps the question index (0-13) to the corresponding backend key
  const questionToKeyMap = {
    0: 'Q1A',
    1: 'Q6A',
    2: 'Q8A',
    3: 'Q11A',
    4: 'Q12A',
    5: 'Q14A',
    6: 'Q18A',
    7: 'Q22A',
    8: 'Q29A',
    9: 'Q32A',
    10: 'Q33A',
    11: 'Q35A',
    12: 'Q39A',
    13: 'Q27A',
  };

  const [responses, setResponses] = useState({});
  const [currentStep, setCurrentStep] = useState('intro'); // intro -> test -> survey -> complete
  const navigation = useNavigation(); // Use navigation hook

  useEffect(() => {
    // Optional: Start time tracking if needed
  }, []);

  const startTest = () => {
    setCurrentStep('test');
  };

  const handleAnswer = (data) => {
    const backendKey = questionToKeyMap[data.index];

    if (!backendKey) {
      console.error(`No matching backend key for question index ${data.index}`);
      return;
    }

    setResponses((prev) => ({
      ...prev,
      [backendKey]: data.response,
    }));

    console.log(
      `Question index ${data.index} (${backendKey}) answered: ${data.response}`
    );
  };

  const finishTest = async () => {
    // Debug log to see what answers we have
    console.log('Current responses:', responses);
    console.log('Number of responses:', Object.keys(responses).length);

    // Check if we have at least some answers (for debugging)
    if (Object.keys(responses).length === 0) {
      Alert.alert('No Answers', 'You have not answered any questions yet.', [
        { text: 'OK' },
      ]);
      return;
    }

    // Create the payload with all required keys
    const payload = {};

    // Set default value of 0 for all questions
    Object.keys(questionToKeyMap).forEach((index) => {
      const key = questionToKeyMap[index];
      payload[key] = responses[key] !== undefined ? responses[key] : 0;
    });

    console.log('Submitting to backend:', payload); // Debug

    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.stress}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          comments: '',
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received result:', result); // Debug

      navigation.navigate('TechnicalScreen', {
        stressAnswers: Object.values(payload),
        stressScore: result['Total Stress Score'],
        recoveryPlan: result['Recovery Plan'],
        stressCategory: result['Stress Category'],
      });
    } catch (error) {
      console.error('Error fetching recovery plan:', error);
      Alert.alert(
        'Error',
        'There was a problem processing your test results. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {currentStep === 'intro' && (
        <View style={{ alignItems: 'center' }}>
          <Image
            source={require('../assets/pic.jpeg')}
            style={{
              width: windowWidth - 40, // Full width minus padding
              height: 300, // Adjust height as needed
              resizeMode: 'cover',
              borderRadius: 10,
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 20,
              textAlign: 'center',
              color: 'black',
              padding: 10,
            }}
          >
            Welcome to the Stress Test
          </Text>
          <Button title="Start Test" onPress={startTest} />
        </View>
      )}

      {currentStep === 'test' && (
        <>
          {questions.map((question, index) => (
            <QuestionItem
              key={index}
              index={index}
              question={question}
              onAnswer={handleAnswer}
            />
          ))}
          <View style={{ padding: 50, alignItems: 'center' }}>
            <Button title="Submit Test" onPress={finishTest} color="#2196F3" />
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default StressScreen;
