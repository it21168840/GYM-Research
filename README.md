# IT4010-Research-Project-Comprehensive-Design-And-Analysis-Project

## AI-Powered Personalized Gym Activity System for Holistic Health and Fitness Management

### Introduction











### Overall System Diagram Of Project

  ![Screenshot 2024-12-08 202527](https://github.com/user-attachments/assets/cf9c88b8-fcd7-43ea-947d-47db1115a8eb)

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

![Screenshot 2024-12-08 202527](https://github.com/user-attachments/assets/8a7f0f08-d049-40bc-82e9-87408ca2632e)

### 3) Personalized Nutritional Recommendations with Real-time Food Intake Monitoring












