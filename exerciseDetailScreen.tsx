import { useRoute } from '@react-navigation/native';
import { Video } from 'expo-av';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

export default function ExerciseDetailScreen() {
  const route = useRoute();
  const { exercise } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('front');  //camera type
  const cameraRef = useRef<any>(null);

  const [webVideoStream, setWebVideoStream] = useState<MediaStream | null>(null);
  const webVideoRef = useRef<HTMLVideoElement>(null);

  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [processedVideoUri, setProcessedVideoUri] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const endpoint = 'http://172.28.6.20:5000/processVideo';

  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      console.log('Camera permission status:', status);
      await requestAudioPermission();
    })();
  }, []);

  const onCameraReady = () => {
    setCameraReady(true);
    console.log("Camera is ready");
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(stream => setWebVideoStream(stream))
        .catch(err => console.error("Error getting web video stream:", err));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && webVideoStream && webVideoRef.current) {
      webVideoRef.current.srcObject = webVideoStream;
    }
  }, [webVideoStream]);

  const autoDownloadOnWeb = (url: string, filename = "processedVideo.mp4") => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const storeVideoFileMobile = async (dataUri: string): Promise<string> => {
    const match = dataUri.match(/^data:video\/\w+;base64,(.*)/);
    if (!match) {
      throw new Error("Invalid data URI for video");
    }
    const rawBase64 = match[1];
    const fileName = FileSystem.cacheDirectory + `processed_${Date.now()}.mp4`;
    await FileSystem.writeAsStringAsync(fileName, rawBase64, { encoding: FileSystem.EncodingType.Base64 });
    return fileName;
  };

  const storeVideoFileWeb = async (dataUri: string): Promise<string> => {
    const res = await fetch(dataUri);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    autoDownloadOnWeb(objectURL, "processedVideo.mp4");
    return objectURL;
  };

  const handleProcessedVideo = async (dataUri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      return await storeVideoFileWeb(dataUri);
    } else {
      return await storeVideoFileMobile(dataUri);
    }
  };

  const recordVideoWeb = async (): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      if (!webVideoStream) return reject("No web video stream available for recording");
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const mediaRecorder = new MediaRecorder(webVideoStream, options);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onerror = reject;
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
        webVideoStream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 10000);
    });
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      if (!recording) {
        setRecording(true);
        try {
          const base64Video = await recordVideoWeb();
          await sendVideoToBackend(base64Video);
        } catch (error) {
          console.error("Error during web recording:", error);
        }
        setRecording(false);
      }
    } else {
      if (cameraRef.current && !recording && cameraReady) {
        console.log("Starting recording on mobile...");
        setRecording(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const videoData = await cameraRef.current.recordAsync({
            maxDuration: 10,
            base64: false,
            mute: true,
          });
          console.log("Recording finished. Video URI:", videoData.uri);
          setRecording(false);
          if (!videoData || !videoData.uri) {
            console.error("No video data captured");
            return;
          }
          const base64Video = await FileSystem.readAsStringAsync(videoData.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await sendVideoToBackend("data:video/mp4;base64," + base64Video);
        } catch (error) {
          console.error("Error during mobile recording:", error);
          setRecording(false);
        }
      } else {
        console.log("Camera not ready or already recording");
      }
    }
  };

  const stopRecording = () => {
    if (Platform.OS !== 'web' && cameraRef.current && recording) {
      console.log("Stopping recording on mobile...");
      cameraRef.current.stopRecording();
    }
  };

  const sendVideoToBackend = async (base64Video: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video: base64Video,
          exercise: exercise.id,
        }),
      });
      const data = await response.json();
      console.log("Backend response:", data);
      setCorrectCount(data.correct_reps); //fe be correct_reps
      setIncorrectCount(data.incorrect_reps);
      if (data.annotated_video) {
        const finalUri = await handleProcessedVideo(data.annotated_video);
        setProcessedVideoUri(finalUri);
      }
    } catch (error) {
      console.error("Error sending video:", error);
    }
    setIsProcessing(false);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.subtitle}>{exercise.description}</Text>
      <View style={styles.countContainer}>
        <Text style={styles.countText}>Correct: {correctCount}</Text>
        <Text style={styles.countText}>Incorrect: {incorrectCount}</Text>
      </View>
      <View style={styles.cameraContainer}>
        {processedVideoUri ? (
          <Video
            source={{ uri: processedVideoUri }}
            style={[styles.camera, Platform.OS !== 'web' && { transform: [{ rotate: '270deg' }] }]}
            shouldPlay
            useNativeControls
            resizeMode="contain"
          />
        ) : (
          Platform.OS === 'web' ? (
            webVideoStream ? (
              <video ref={webVideoRef} autoPlay playsInline style={styles.camera} />
            ) : (
              <Text>Loading web camera...</Text>
            )
          ) : (
            <CameraView
              mode="video"
              style={styles.camera}
              facing={facing}
              ref={cameraRef}
              onCameraReady={onCameraReady}
            />
          )
        )}
      </View>
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        {processedVideoUri ? (
          <Button
            title="Record Again"
            onPress={() => {
              setProcessedVideoUri(null);
              setCorrectCount(0);
              setIncorrectCount(0);
              startRecording();
            }}
          />
        ) : (
          Platform.OS === 'web' ? (
            !recording ? (
              <Button title="Record 10s Video (Web)" onPress={startRecording} />
            ) : (
              <Text>Recording in progress...</Text>
            )
          ) : (
            !recording ? (
              <Button title="Record 10s Video (Mobile)" onPress={startRecording} />
            ) : (
              <Button title="Stop Recording" onPress={stopRecording} />
            )
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#B4B8B3' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 16 },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  countText: { fontSize: 18 },
  cameraContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%'
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 10,
    color: 'black',
    fontSize: 18,
  },
  buttonContainer: {
    marginVertical: 16,
    width :'20%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
});
