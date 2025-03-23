import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Clock, UserCircle2, Send } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';

// Define the API endpoint URL - update this with your computer's IP address
const API_URL = 'http://172.28.18.69:5000/api/meal'; // Replace with your actual IP address

// Define types for the form data and API response
interface MealPlan {
  ID: string;
  Breakfast: string;
  Lunch: string;
  Snack: string;
  Dinner: string;
}

// Define form fields and options
const formOptions = {
  fitnessGoal: ['Maintenance', 'Muscle gain', 'Weight loss'],
  allergies: ['Seafoods', 'None', 'Nuts', 'Milk'],
  veganism: ['Non-veg', 'Veg'],
  healthCondition: ['Diabetes', 'Heart disease', 'None', 'Blood pressure'],
  preferences: ['Mix', 'Sri Lankan', 'Western'],
  activityLevel: ['Very active', 'Lightly active'],
  bodyType: ['Fat', 'Lean'],
  workoutRoutine: ['Weight training', 'CrossFit', 'Yoga 2x/week','Cardio  '],
};

type FormField = keyof typeof formOptions;

export default function MealPlanningForm() {
  console.log('Rendering MealPlanningForm component');
  
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const router = useRouter();

  // Initialize form state
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

  // UI state
  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<FormField | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Wait for fonts to load
  if (!fontsLoaded) {
    console.log('Fonts not loaded yet');
    return null;
  }

  // Handle option selection in the modal
  const handleSelectOption = (field: FormField, value: string) => {
    console.log(`Selected ${value} for ${field}`);
    setFormData((prev) => ({ ...prev, [field]: value }));
    setModalVisible(false);
  };

  // Open the option selector modal
  const openSelector = (field: FormField) => {
    console.log(`Opening selector for ${field}`);
    setActiveField(field);
    setModalVisible(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Check if all fields are filled
    const isFormValid = Object.values(formData).every(value => value !== '');
    
    if (isFormValid) {
      try {
        console.log('Form is valid, preparing to submit...');
        setIsLoading(true);
        
        // Format the request data according to the expected format by the API
        const requestData = {
          ID: "U0002", // Using a static ID for now - in a real app, this would be the user's ID
          "Fitness Goal": formData.fitnessGoal,
          "Allergies": formData.allergies,
          "Veganism": formData.veganism,
          "Health Condition": formData.healthCondition,
          "Preferences": formData.preferences,
          "Activity Level": formData.activityLevel,
          "Body Type": formData.bodyType,
          "Workout Routine": formData.workoutRoutine,
        };
        
        console.log('Sending request to API:', JSON.stringify(requestData));
        
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(requestData),
          });
          
          // Log the raw response for debugging
          const responseText = await response.text();
          console.log('Raw API response:', responseText);
          
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            throw new Error('Invalid response format from server');
          }
          
          if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          console.log('Parsed response data:', responseData);
          
          // Check if responseData is an array directly
          let mealPlanData = responseData;
          if (!Array.isArray(responseData)) {
            // If it's not an array but has a mealPlan property that is an array
            if (responseData.mealPlan && Array.isArray(responseData.mealPlan)) {
              mealPlanData = responseData.mealPlan;
            } else {
              // If it's neither an array nor has a mealPlan array property
              console.warn('Response format does not match expected structure');
              // Try to adapt - wrap in array if it's a single object
              mealPlanData = [responseData];
            }
          }
          
          // Navigate to results page with both request and response data
          console.log('Navigating to results page with data');
          router.push({
            pathname: '/meal-plan/results',
            params: {
              sampleJson: JSON.stringify(requestData),
              mealPlanData: JSON.stringify(mealPlanData)
            }
          });
        } catch (fetchError) {
          console.error('Fetch operation failed:', fetchError);
          Alert.alert(
            'Network Error',
            'Failed to connect to the server. Please check your network connection and ensure the backend server is running.',
            [{ text: 'OK' }]
          );
          throw fetchError;
        }
      } catch (error) {
        console.error('API call failed:', error);
        Alert.alert(
          'Error',
          'Failed to generate meal plan. Please try again later.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('Form is incomplete, cannot submit');
      Alert.alert(
        'Incomplete Form',
        'Please fill in all fields to generate your meal plan.',
        [{ text: 'OK' }]
      );
    }
  };

  const isFormComplete = Object.values(formData).every(value => value !== '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        {/* Header Image */}
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }}
          style={styles.headerImage}
        />
        
        {/* User Info Header */}
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Clock size={16} color="#666" />
            <Text style={styles.time}>03:35</Text>
          </View>
          <View style={styles.userInfoContainer}>
            <UserCircle2 size={24} color="#2e7d32" style={styles.userIcon} />
            <Text style={styles.userName}>Nisal Palihena</Text>
          </View>
          <Text style={styles.headerSubtitle}>Customize your meal plan</Text>
        </View>

        {/* Form Fields */}
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
                <ChevronDown size={20} color={formData[field] ? "#2e7d32" : "#666"} />
              </Pressable>
            </View>
          ))}

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              !isFormComplete && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormComplete || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Send size={18} color="#fff" style={styles.submitIcon} />
                <Text style={[
                  styles.submitButtonText,
                  !isFormComplete && styles.submitButtonTextDisabled
                ]}>
                  Generate Meal Plan
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Selection Modal */}
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
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userIcon: {
    marginRight: 8,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#2e7d32',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
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
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitIcon: {
    marginRight: 8,
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
