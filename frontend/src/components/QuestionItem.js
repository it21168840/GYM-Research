import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const options = [
  { label: 'Did not apply to me at all', value: 1 },
  { label: 'Applied to me to some degree, or some of the time', value: 2 },
  {
    label: 'Applied to me to a considerable degree, or a good part of the time',
    value: 3,
  },
  { label: 'Applied to me very much, or most of the time', value: 4 },
];

const QuestionItem = ({ question, index, onAnswer }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    setStartTime(Date.now()); // Start timing when the question is displayed
  }, []);

  const handleAnswerChange = (answer) => {
    const endTime = Date.now();
    const timeTaken = endTime - startTime; // Time in milliseconds

    setSelectedAnswer(answer);

    // Send response details to parent (StressScreen)
    onAnswer({
      index,
      response: answer,
      timeTaken: timeTaken,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>

      <Picker
        selectedValue={selectedAnswer}
        onValueChange={handleAnswerChange}
        style={styles.picker}
      >
        <Picker.Item label="Select an option" value={null} />
        {options.map((option, i) => (
          <Picker.Item key={i} label={option.label} value={option.value} />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  question: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  picker: {
    backgroundColor: 'white',
  },
});

export default QuestionItem;
