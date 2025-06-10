import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { API_BASE_URL } from '../config/api';

export default function EmotionScreen() {
  const [image, setImage] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(status === 'granted');
      console.log('Initial permission check:', status);
    })();
  }, []);

  const pickImage = async () => {
    console.log('Button pressed');

    // Always request permission right before picking for more reliability
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('Permission status:', status);

    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Sorry, we need camera roll permissions to make this work!'
      );
      return;
    }

    try {
      // Make sure to use the correct media types property based on Expo SDK version
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Reduced quality for smaller file size
      });
      console.log('Picker result:', result);

      if (!result.canceled) {
        console.log('Selected image URI:', result.assets[0].uri);
        setImage(result.assets[0].uri);
        setEmotion(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const uploadImage = async () => {
    if (!image) {
      Alert.alert('No Image', 'Please select an image first!');
      return;
    }

    setLoading(true);
    setEmotion(null);

    try {
      // Check if we're dealing with a base64 image (web) or a file URI (native)
      const isBase64Image = image.startsWith('data:');
      console.log('Image type:', isBase64Image ? 'base64' : 'file URI');

      // Create form data
      const formData = new FormData();

      if (isBase64Image) {
        // For web/base64 images, we need to convert to a Blob first
        // Extract base64 data from the data URI
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];

        // Convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteArrays = [];

        for (let i = 0; i < byteCharacters.length; i += 512) {
          const slice = byteCharacters.slice(i, i + 512);
          const byteNumbers = new Array(slice.length);

          for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j);
          }

          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: mimeType });

        // Generate a file name
        const fileName = `image_${Date.now()}.jpg`;

        // Append file to form data
        console.log('Creating File object from Blob');
        const file = new File([blob], fileName, { type: mimeType });
        formData.append('img', file);

        console.log('Appended file to FormData:', fileName);
      } else {
        // Handle platform-specific URI formatting for native
        const imageUri =
          Platform.OS === 'android' ? image : image.replace('file://', '');

        const imageName = image.split('/').pop() || 'emotion.jpg';
        const imageType = 'image/jpeg';

        console.log('Preparing image:', {
          uri: imageUri,
          name: imageName,
          type: imageType,
        });

        // Append the image to FormData with the correct field name 'img'
        formData.append('img', {
          uri: imageUri,
          type: imageType,
          name: imageName,
        });
      }

      // Log FormData safely (avoid trying to use _parts on web)
      console.log('FormData created successfully');

      // The server endpoint
      const endpoint = `${API_BASE_URL}/api/emotion`;
      console.log(`Sending to endpoint: ${endpoint}`);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Make the request
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Do not set Content-Type header, let the browser set it with boundary
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);

      if (response.ok) {
        const responseText = await response.text();
        console.log('Raw API Response:', responseText);

        // Try parsing only if the response looks like JSON
        if (
          responseText &&
          (responseText.startsWith('{') || responseText.startsWith('['))
        ) {
          const data = JSON.parse(responseText);
          console.log('API Parsed JSON:', data);
          console.log('Available properties:', Object.keys(data));
          console.log(
            'Full response structure:',
            JSON.stringify(data, null, 2)
          );

          // More flexible emotion detection - check various possible property names
          let detectedEmotion = null;

          // Check common property names that APIs might use
          if (data.emotion) {
            detectedEmotion = data.emotion;
          } else if (
            data.emotions &&
            Array.isArray(data.emotions) &&
            data.emotions.length > 0
          ) {
            // If it's an array, take the first/highest confidence emotion
            detectedEmotion =
              data.emotions[0].emotion ||
              data.emotions[0].label ||
              data.emotions[0];
          } else if (data.predicted_emotion) {
            detectedEmotion = data.predicted_emotion;
          } else if (data.result) {
            detectedEmotion = data.result;
          } else if (data.prediction) {
            detectedEmotion = data.prediction;
          } else if (data.label) {
            detectedEmotion = data.label;
          } else if (data.dominant_emotion) {
            detectedEmotion = data.dominant_emotion;
          } else if (typeof data === 'string') {
            // Sometimes the API might return just a string
            detectedEmotion = data;
          }

          if (detectedEmotion) {
            console.log('Detected emotion:', detectedEmotion);
            setEmotion(detectedEmotion);
          } else {
            console.error('No emotion found in response. Full response:', data);
            throw new Error(
              `No emotion detected in the response. Server returned: ${JSON.stringify(
                data
              )}`
            );
          }
        } else {
          console.error('Response is not valid JSON:', responseText);
          throw new Error(
            `Invalid response format. Expected JSON, got: ${responseText}`
          );
        }
      } else {
        // Get full error message
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(
          `Server responded with status: ${response.status}. ${errorText}`
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);

      // More detailed error handling
      if (error.name === 'AbortError') {
        Alert.alert(
          'Request Timeout',
          'The request took too long to complete. Please try again.'
        );
      } else if (
        error.message &&
        error.message.includes('Network request failed')
      ) {
        Alert.alert(
          'Network Error',
          'Failed to connect to the server. Please check your internet connection and API configuration.'
        );
      } else {
        Alert.alert('Error', `Failed to analyze emotion: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render a permission notice if permission is denied
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Permission Denied</Text>
        <Text style={styles.text}>
          This app needs access to your photo library to function properly.
        </Text>
        <Button
          mode="contained"
          onPress={async () => {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
          style={styles.button}
        >
          Request Permission
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emotion Detection</Text>

      {image && <Image source={{ uri: image }} style={styles.image} />}

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={pickImage}
          style={styles.button}
          disabled={loading}
        >
          Pick an Image
        </Button>

        {image && (
          <Button
            mode="contained"
            onPress={uploadImage}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Analyze Emotion
          </Button>
        )}
      </View>

      {emotion && (
        <Text style={styles.result}>Detected Emotion: {emotion}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  text: {
    marginBottom: 20,
    textAlign: 'center',
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 20,
    borderRadius: 10,
  },
  buttonContainer: {
    gap: 10,
    width: '100%',
    maxWidth: 300,
  },
  button: {
    marginVertical: 5,
    width: '100%',
    padding: 5,
  },
  result: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
});
