import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  RefreshCw, 
  ArrowLeft, 
  Coffee,
  UtensilsCrossed,
  Cookie,
  Soup,
  MessageSquarePlus,
  Flame,
  EggFried 
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// API endpoint - update this with your computer's IP address
const API_URL = 'http://172.28.18.69:5000/api/meal'; // Replace with your actual IP address

// Get screen dimensions
const { width } = Dimensions.get('window');

// Types for the API data
interface ApiMealPlan {
  ID: string;
  Breakfast: string;
  Lunch: string;
  Snack: string;
  Dinner: string;
}

// Types for form data
interface FormData {
  ID: string;
  "Fitness Goal": string;
  "Allergies": string;
  "Veganism": string;
  "Health Condition": string;
  "Preferences": string;
  "Activity Level": string;
  "Body Type": string;
  "Workout Routine": string;
}

// Types for the display data
type MealType = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
};

type DayPlan = {
  id: string;
  breakfast: MealType;
  lunch: MealType;
  snack: MealType;
  dinner: MealType;
};

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [comment, setComment] = useState('');
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [mealPlans, setMealPlans] = useState<DayPlan[]>([]);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalDailyCalories, setTotalDailyCalories] = useState(0);
  const [totalDailyProtein, setTotalDailyProtein] = useState(0);
  const [totalDailyCarbs, setTotalDailyCarbs] = useState(0);
  
  // Parse form data (request data) from params
  useEffect(() => {
    try {
      if (params.sampleJson) {
        console.log('Parsing request data from params...');
        const parsedFormData = JSON.parse(params.sampleJson as string) as FormData;
        console.log('Form data successfully parsed:', parsedFormData);
        setFormData(parsedFormData);
      } else {
        console.warn('No form data found in params!');
      }
    } catch (error) {
      console.error('Error parsing form data:', error);
    }
  }, [params.sampleJson]);
  
  // Parse meal plan data (response data) from params
  useEffect(() => {
    try {
      if (params.mealPlanData) {
        console.log('Parsing meal plan data from API response...');
        const apiMealPlans = JSON.parse(params.mealPlanData as string) as ApiMealPlan[];
        console.log('Parsed meal plan data successfully:', apiMealPlans);
        
        // Transform API data to the format expected by the UI
        console.log('Transforming meal plan data for UI...');
        const transformedMealPlans = apiMealPlans.map(plan => {
          return {
            id: plan.ID || `day-${Math.random().toString(36).substring(2, 9)}`,
            breakfast: parseMealString(plan.Breakfast, 'Breakfast'),
            lunch: parseMealString(plan.Lunch, 'Lunch'),
            snack: parseMealString(plan.Snack, 'Snack'),
            dinner: parseMealString(plan.Dinner, 'Dinner')
          };
        });
        
        console.log('Meal plan data transformation complete');
        setMealPlans(transformedMealPlans);
      } else {
        console.warn('No meal plan data found in params!');
      }
    } catch (error) {
      console.error('Error parsing meal plan data:', error);
      Alert.alert('Error', 'Failed to load meal plan data. Please try again.');
    }
  }, [params.mealPlanData]);

  // Calculate daily nutrition totals when current day changes
  useEffect(() => {
    if (mealPlans.length > 0) {
      console.log(`Calculating nutrition totals for day ${currentDayIndex + 1}...`);
      const currentPlan = mealPlans[currentDayIndex];
      
      // Sum up all calories, protein, and carbs for the current day
      const calories = currentPlan.breakfast.calories + 
                      currentPlan.lunch.calories + 
                      currentPlan.snack.calories + 
                      currentPlan.dinner.calories;
      
      const protein = currentPlan.breakfast.protein + 
                     currentPlan.lunch.protein + 
                     currentPlan.snack.protein + 
                     currentPlan.dinner.protein;
      
      const carbs = currentPlan.breakfast.carbs + 
                   currentPlan.lunch.carbs + 
                   currentPlan.snack.carbs + 
                   currentPlan.dinner.carbs;
      
      console.log(`Daily totals - Calories: ${calories}, Protein: ${protein}g, Carbs: ${carbs}g`);
      setTotalDailyCalories(calories);
      setTotalDailyProtein(protein);
      setTotalDailyCarbs(carbs);
    }
  }, [currentDayIndex, mealPlans]);

  // Parse a meal string from the API to extract calories, protein, and carbs
  const parseMealString = (mealString: string, mealName: string): MealType => {
    try {
      console.log(`Parsing meal string for ${mealName}...`);
      
      // Extract calories, protein and carbs from the string using regex
      const caloriesMatch = mealString.match(/(\d+)\s*kcal/);
      const proteinMatch = mealString.match(/(\d+)g\s*protein/);
      const carbsMatch = mealString.match(/(\d+)g\s*carbohydrates/);
      
      // Remove nutrition info from the description
      let description = mealString.replace(/\s*-\s*\d+\s*kcal.*$/, '');
      description = description.replace(/\s*,\s*\d+\s*kcal.*$/, '');
      
      const meal = {
        name: mealName,
        description: description,
        calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
        protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
        carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0
      };
      
      console.log(`Parsed ${mealName}: ${meal.calories} kcal, ${meal.protein}g protein, ${meal.carbs}g carbs`);
      return meal;
    } catch (error) {
      console.error(`Error parsing meal string for ${mealName}:`, error);
      return {
        name: mealName,
        description: mealString,
        calories: 0,
        protein: 0,
        carbs: 0
      };
    }
  };

  // Regenerate the meal plan with user feedback (comment)
  const handleRegenerate = async () => {
    // Don't proceed if there's no comment
    if (comment.trim().length === 0) {
      console.log('Regeneration aborted: No comment provided');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Starting meal plan regeneration with comment:', comment);
      
      // Check if we have the original form data
      if (!formData) {
        console.error('Form data not available for regeneration!');
        Alert.alert('Error', 'Could not regenerate meal plan. Missing profile data.');
        setIsLoading(false);
        return;
      }
      
      // Create request data by combining original form data with comment
      const requestData = {
        ...formData,
        comments: comment // Changed from 'comment' to 'comments' to match backend expectation
      };
      
      console.log('Sending regeneration request to API:', JSON.stringify(requestData));
      
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
        let apiMealPlans = responseData;
        if (!Array.isArray(responseData)) {
          // If it's not an array but has a mealPlan property that is an array
          if (responseData.mealPlan && Array.isArray(responseData.mealPlan)) {
            apiMealPlans = responseData.mealPlan;
          } else {
            // If it's neither an array nor has a mealPlan array property
            console.warn('Response format does not match expected structure');
            // Try to adapt - wrap in array if it's a single object
            apiMealPlans = [responseData];
          }
        }
        
        // Transform and update the meal plans
        console.log('Processing new meal plan data...');
        const transformedMealPlans = apiMealPlans.map(plan => {
          return {
            id: plan.ID || `day-${Math.random().toString(36).substring(2, 9)}`,
            breakfast: parseMealString(plan.Breakfast, 'Breakfast'),
            lunch: parseMealString(plan.Lunch, 'Lunch'),
            snack: parseMealString(plan.Snack, 'Snack'),
            dinner: parseMealString(plan.Dinner, 'Dinner')
          };
        });
        
        // Update state with new meal plans
        console.log('Setting new meal plan data in state');
        setMealPlans(transformedMealPlans);
        setComment('');
        
        // Show success message
        Alert.alert('Success', 'Your meal plan has been updated based on your feedback.');
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
      console.error('Error regenerating meal plan:', error);
      Alert.alert(
        'Error',
        'Failed to regenerate meal plan. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation functions
  const navigateBack = () => {
    console.log('Navigating back to form');
    router.back();
  };

  const nextDay = () => {
    if (currentDayIndex < mealPlans.length - 1) {
      console.log(`Moving to next day: ${currentDayIndex + 2}`);
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  const prevDay = () => {
    if (currentDayIndex > 0) {
      console.log(`Moving to previous day: ${currentDayIndex}`);
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  // Get the meal icon based on meal type
  const getMealIcon = (mealName: string) => {
    switch(mealName.toLowerCase()) {
      case 'breakfast':
        return <Coffee size={24} color="#e67e22" />;
      case 'lunch':
        return <UtensilsCrossed size={24} color="#27ae60" />;
      case 'snack':
        return <Cookie size={24} color="#8e44ad" />;
      case 'dinner':
        return <Soup size={24} color="#2980b9" />;
      default:
        return <EggFried size={24} color="#e74c3c" />;
    }
  };

  // Calculate progress bar width based on nutritional value
  const getNutritionBarWidth = (value: number, type: 'calories' | 'protein' | 'carbs') => {
    // These are rough estimates, adjust based on your target audience
    const maxValues = {
      calories: 600,  // max calories per meal
      protein: 30,    // max protein per meal (g)
      carbs: 60       // max carbs per meal (g)
    };
    
    const percentage = Math.min((value / maxValues[type]) * 100, 100);
    return `${percentage}%`;
  };

  // Function to render a nutrition progress bar
  const NutritionBar = ({ value, type, color }: { value: number, type: string, color: string }) => (
    <View style={styles.nutritionBarContainer}>
      <Text style={styles.nutritionLabel}>{type}: {value}{type === 'Calories' ? ' kcal' : 'g'}</Text>
      <View style={styles.progressBarBg}>
        <View 
          style={[
            styles.progressBarFill, 
            { 
              width: getNutritionBarWidth(
                value, 
                type.toLowerCase() as 'calories' | 'protein' | 'carbs'
              ),
              backgroundColor: color
            }
          ]} 
        />
      </View>
    </View>
  );

  // Component to render a single meal card
  const MealCard = ({ meal }: { meal: MealType }) => (
    <View style={styles.mealCard}>
      <LinearGradient
        colors={['#f7f9fc', '#e8f5e9']}
        style={styles.mealGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleContainer}>
            {getMealIcon(meal.name)}
            <Text style={styles.mealTitle}>{meal.name}</Text>
          </View>
          <View style={styles.caloriesBadge}>
            <Flame size={16} color="#e74c3c" />
            <Text style={styles.caloriesBadgeText}>{meal.calories}</Text>
          </View>
        </View>
        
        <Text style={styles.mealDescription}>{meal.description}</Text>
        
        <View style={styles.nutritionContainer}>
          <NutritionBar value={meal.calories} type="Calories" color="#e74c3c" />
          <NutritionBar value={meal.protein} type="Protein" color="#3498db" />
          <NutritionBar value={meal.carbs} type="Carbs" color="#f39c12" />
        </View>
      </LinearGradient>
    </View>
  );

  // Show loading indicator if we're still loading the meal plans
  if (mealPlans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Loading your personalized meal plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get the current day's plan data
  const currentPlan = mealPlans[currentDayIndex];
  
  // Day tabs component for horizontal scrolling through days
  const DayTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayTabsContainer}
    >
      {mealPlans.map((plan, index) => (
        <Pressable
          key={plan.id}
          style={[
            styles.dayTab,
            currentDayIndex === index && styles.activeDay
          ]}
          onPress={() => setCurrentDayIndex(index)}
        >
          <Text style={[
            styles.dayTabText,
            currentDayIndex === index && styles.activeDayText
          ]}>
            Day {index + 1}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  // Show user profile data if available
  const renderUserProfile = () => {
    if (formData) {
      return (
        <View style={styles.profileContainer}>
          <Text style={styles.profileText}>
            Plan for: <Text style={styles.profileHighlight}>{formData["Fitness Goal"]}</Text> | 
            Diet: <Text style={styles.profileHighlight}>{formData["Veganism"]}</Text> | 
            Activity: <Text style={styles.profileHighlight}>{formData["Activity Level"]}</Text>
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={navigateBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </Pressable>
          <Text style={styles.headerTitle}>Your Meal Plan</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Display user profile data */}
        {renderUserProfile()}
        
        {/* Day selection tabs */}
        <DayTabs />
        
        {/* Daily nutrition summary */}
        <View style={styles.dailySummary}>
          <View style={styles.summaryItem}>
            <Flame size={18} color="#e74c3c" />
            <Text style={styles.summaryText}>{totalDailyCalories} kcal</Text>
          </View>
          <View style={styles.summaryItem}>
            <EggFried size={18} color="#3498db" />
            <Text style={styles.summaryText}>{totalDailyProtein}g protein</Text>
          </View>
          <View style={styles.summaryItem}>
            <Cookie size={18} color="#f39c12" />
            <Text style={styles.summaryText}>{totalDailyCarbs}g carbs</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Meal plan cards for the current day */}
        <View style={styles.mealPlanContainer}>
          <MealCard meal={currentPlan.breakfast} />
          <MealCard meal={currentPlan.lunch} />
          <MealCard meal={currentPlan.snack} />
          <MealCard meal={currentPlan.dinner} />
        </View>

        {/* Regeneration section */}
        <View style={styles.regenerateContainer}>
          <View style={styles.commentInputContainer}>
            <MessageSquarePlus size={20} color="#666" style={styles.commentIcon} />
            <TextInput
              style={styles.commentInput}
              placeholder="Add preferences or adjustments..."
              value={comment}
              onChangeText={setComment}
              multiline
              placeholderTextColor="#999"
            />
          </View>
          <Pressable 
            style={[
              styles.regenerateButton,
              comment.trim().length === 0 && styles.regenerateButtonDisabled
            ]}
            onPress={handleRegenerate}
            disabled={isLoading || comment.trim().length === 0}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <RefreshCw size={18} color="#fff" style={styles.regenerateIcon} />
                <Text style={styles.regenerateButtonText}>Regenerate Plan</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2e7d32',
  },
  profileContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e8f5e9',
  },
  profileText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#333',
    textAlign: 'center',
  },
  profileHighlight: {
    fontFamily: 'Inter-SemiBold',
    color: '#2e7d32',
  },
  backButton: {
    padding: 8,
  },
  dayTabsContainer: {
    paddingHorizontal: 8,
  },
  dayTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeDay: {
    backgroundColor: '#2e7d32',
  },
  dayTabText: {
    fontFamily: 'Inter-Regular',
    color: '#666',
    fontSize: 14,
  },
  activeDayText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },
  dailySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f7f7f7',
    marginTop: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    marginLeft: 5,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#333',
  },
  mealPlanContainer: {
    padding: 16,
  },
  mealCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealGradient: {
    padding: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 8,
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  caloriesBadgeText: {
    color: '#e74c3c',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginLeft: 4,
  },
  mealDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#444',
    marginBottom: 16,
    lineHeight: 24,
  },
  nutritionContainer: {
    marginTop: 8,
  },
  nutritionBarContainer: {
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  regenerateContainer: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    padding: 12,
  },
  commentIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  commentInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  regenerateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
  },
  regenerateButtonDisabled: {
    backgroundColor: '#aaa',
  },
  regenerateIcon: {
    marginRight: 8,
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  }

});