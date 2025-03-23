import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Clock } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';

const formOptions = {
  fitnessGoal: ['Maintenance', 'Muscle gain', 'Weight loss'],
  allergies: ['Seafoods', 'None', 'Nuts', 'Milk'],
  veganism: ['Non-veg', 'Veg'],
  healthCondition: ['Diabetes', 'Heart disease', 'None', 'Blood pressure'],
  preferences: ['Mix', 'Sri lankan', 'Western'],
  activityLevel: ['Very active', 'Lightly active'],
  bodyType: ['Fat', 'Lean'],
  workoutRoutine: ['Weight training', 'CrossFit', 'Yoga 2x/week', 'Cardio'],
};

type FormField = keyof typeof formOptions;

export default function MealPlanningForm() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const router = useRouter();

  const [formData, setFormData] = useState<Record<FormField, string>>({
    fitnessGoal: '',
    allergies: '',
    veganism: '',
    healthCondition: '',
    preferences: '',
    activityLevel: '',
    bodyType: '',
    workoutRoutine: '',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<FormField | null>(null);

  if (!fontsLoaded) {
    return null;
  }

  const handleSelectOption = (field: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setModalVisible(false);
  };

  const openSelector = (field: FormField) => {
    setActiveField(field);
    setModalVisible(true);
  };

  const handleSubmit = () => {
    const isFormValid = Object.values(formData).every(value => value !== '');
    
    if (isFormValid) {
      router.push('/meal-plan/results');
    }
  };

  const isFormComplete = Object.values(formData).every(value => value !== '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
          style={styles.headerImage}
        />
        
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Clock size={16} color="#666" />
            <Text style={styles.time}>03:35</Text>
          </View>
          <Text style={styles.userName}>Nisal Palihena</Text>
        </View>

        <View style={styles.form}>
          {(Object.keys(formOptions) as FormField[]).map((field) => (
            <View key={field} style={styles.fieldContainer}>
              <Text style={styles.label}>
                {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
              </Text>
              <Pressable
                style={[
                  styles.selector,
                  formData[field] && styles.selectorFilled
                ]}
                onPress={() => openSelector(field)}
              >
                <Text style={[
                  styles.selectorText,
                  formData[field] && styles.selectorTextFilled
                ]}>
                  {formData[field] || 'Select option'}
                </Text>
                <ChevronDown size={20} color="#666" />
              </Pressable>
            </View>
          ))}

          <Pressable
            style={[
              styles.submitButton,
              !isFormComplete && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormComplete}
          >
            <Text style={[
              styles.submitButtonText,
              !isFormComplete && styles.submitButtonTextDisabled
            ]}>
              Generate Meal Plan
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {activeField
                ? activeField.charAt(0).toUpperCase() +
                  activeField.slice(1).replace(/([A-Z])/g, ' $1')
                : ''}
            </Text>
            {activeField &&
              formOptions[activeField].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.option,
                    formData[activeField] === option && styles.optionSelected
                  ]}
                  onPress={() => handleSelectOption(activeField, option)}
                >
                  <Text style={[
                    styles.optionText,
                    formData[activeField] === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  header: {
    padding: 20,
    backgroundColor: '#e8f5e9',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#2e7d32',
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectorFilled: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
  },
  selectorText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  selectorTextFilled: {
    color: '#2e7d32',
    fontFamily: 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 20,
    color: '#333',
  },
  option: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  optionSelected: {
    backgroundColor: '#e8f5e9',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  optionTextSelected: {
    color: '#2e7d32',
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});