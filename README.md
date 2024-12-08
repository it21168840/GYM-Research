# IT4010-Research-Project-Comprehensive-Design-And-Analysis-Project

## AI-Powered Personalized Gym Activity System for Holistic Health and Fitness Management

### Introduction











### Overall System Diagram Of Project

   ![image](https://github.com/user-attachments/assets/29c2b596-915f-406d-b2af-03764ea324d3)

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

![Screenshot 2024-12-01 173058](https://github.com/user-attachments/assets/a0a9d373-16c7-4925-9fde-adae6559558e) ![Screenshot 2024-12-01 173137](https://github.com/user-attachments/assets/b39be2f6-172f-43fa-8747-13da6c2986be) ![Screenshot 2024-12-01 173245](https://github.com/user-attachments/assets/899e0813-bfde-4440-b17d-b94b9e50d831)

### 3) Personalized Nutritional Recommendations with Real-time Food Intake Monitoring












