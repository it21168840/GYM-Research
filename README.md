# IT4010-Research-Project-Comprehensive-Design-And-Analysis-Project

## AI-Powered Personalized Gym Activity System for Holistic Health and Fitness Management

### Introduction











### Overall System Diagram Of Project

  ![image](https://github.com/user-attachments/assets/2e9ccf62-d263-4ee0-b736-a00305c7edf2)


### 1) Personalized Workout Plan Suggesting System







### 2) Personalized Real-Time Exercise Pose Detection and Correction

This Component focuses on the development of a Personalized Real-Time Exercise Pose Detection and Correction System. The system utilizes Machine Learning (ML) techniques, specifically a Random Forest Classifier, to classify and analyze various exercise poses based on real-time body landmarks. By providing personalized feedback, this solution aims to improve exercise performance, minimize the risk of injuries caused by improper form, and support fitness enthusiasts in achieving their goals.

Key Features -:

The Personalized Real-Time Exercise Pose Detection and Correction system ensures accurate real-time pose detection for exercises like push-ups and squats using body landmarks. It provides instant corrective feedback, personalized recommendations based on user performance, and alerts to prevent injuries from improper movements. A user-friendly mobile app prototype designed in Figma enhances accessibility and usability for all fitness levels

How It Works -: 

1.	Input Data -: The system processes 3D body landmarks (e.g., coordinates of shoulders, elbows, knees) captured in real-time.
2.	Pose Classification -: A Random Forest Classifier is trained on a labeled dataset consisting of exercise poses.
   It predicts the current pose from a set of predefined classes:Jumping Jacks (Up/Down)/Push-Ups (Up/Down)/Pull-Ups (Up/Down)/Sit-Ups (Up/Down)/Squats (Up/Down)
3. Real-Time Feedback -: Based on the prediction and body alignment, the system provides feedback like "Correct your posture" or "Good job!"

Technologies Used -:
   •	Programming Language: Python, ReactNative
   •	Algorithm: Random Forest Classifier for pose classification
   •	Prototyping Tool: Figma (mobile app design)

Component Goals -:

•	Enable users to receive real-time guidance on exercise form.
•	Promote safe workout practices by reducing the risk of injuries.
•	Develop a scalable and adaptable system that can integrate with various fitness applications.

### Wireframes

![Screenshot 2024-12-08 202527](https://github.com/user-attachments/assets/798f06c4-6e8f-458d-bea5-35cd984a92b2)

### 3) Personalized Nutrition Recommendations and generate personalized meal plan 

Sri Lanka is witnessing a growing interest in healthy lifestyles and fitness across all income levels. However, existing nutritional and fitness solutions often fail to meet the needs of the average Sri Lankan family due to their high cost, complexity, or lack of cultural relevance. This project addresses these gaps by developing an affordable, culturally appropriate, and user-friendly system for personalized meal planning and fitness guidance.

Key Features:

Personalized Plans: Custom meal and fitness recommendations tailored to individual goals, preferences, and activity levels.
Sri lankan Relevance: Incorporates Sri Lankan cuisine, traditional dietary practices, and local ingredients.
Affordability: Designed to be accessible to users across various income levels.
Technology-Driven: Utilizes Machine Learning, Natural Language Processing, and Data Analytics for intelligent recommendations.

This platform aims to empower Sri Lankans to achieve their health and fitness goals sustainably, bridging the gap between affordability, simplicity, and cultural compatibility.

### Wireframes

![image](https://github.com/user-attachments/assets/d19c0256-6805-41b6-98ac-d1d3cfa99ec7)



### 4) Personalized Stress Management and Recovery Optimization
This component utilizes  Machine Learning (ML) techniques to provide a comprehensive, personalized approach to stress management and recovery optimization. By integrating questionnaire data with mood detection from facial expression analysis, the system delivers tailored recovery plans and stress management techniques.

Key Features:
•	Real-Time Stress Detection: The system analyzes responses from a detailed questionnaire alongside mood data captured through facial expression recognition to assess stress levels.
•	Personalized Recovery Plans: Based on the detected stress score, the system generates custom recovery plans, including active recovery exercises, relaxation techniques, mindfulness activities, and stress-relief strategies.
•	Dynamic Recovery Adjustments: The recovery plan adjusts in real-time according to ongoing feedback from users, factoring in changes in stress levels, emotional well-being, and progress with stress management techniques.

How It Works:
1.	Input Data: The system processes data from a user-completed questionnaire to gauge their current stress level. In addition, facial expression recognition technology analyzes  image data to detect mood.
2.	Stress Detection: Machine learning models are used to analyze both the questionnaire responses and mood data to calculate a stress score. These scores inform the system's understanding of the user's emotional state.
3.	Recovery Plan Generation: Based on the detected stress levels, the system generates a personalized recovery plan that may include techniques like mindfulness exercises, deep breathing, or low-impact physical activities designed to reduce stress.
4.	Dynamic Adjustments: As the user provides feedback or as stress levels change, the recovery plan adapts in real-time, ensuring that the approach stays effective and aligned with the user's needs.

Technologies:
•	Python: The primary programming language for data analysis, machine learning, and image processing.
•	TensorFlow: A deep learning framework for implementing and training convolutional neural networks (CNNs) for image recognition.
•	OpenCV (cv2): A computer vision library for image preprocessing and feature extraction.
•	XGBoost: A powerful machine learning algorithm for stress score prediction based on questionnaire responses.

Component Goals:
•	Real-Time Stress Monitoring: Continuously monitor and assess stress levels through both questionnaire data and mood analysis.
•	Personalized Recovery Plans: Offer tailored recovery strategies based on individual stress scores and preferences.
•	Adaptable and Responsive System: Adjust the recovery plan as needed, based on user feedback 














	
















