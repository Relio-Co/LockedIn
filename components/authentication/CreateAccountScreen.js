import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db, storage } from '../../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const CreateAccountScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(1));

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPermissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted || !cameraPermissionResult.granted) {
      Alert.alert("Permission required", "You need to allow access to your photos and camera to upload an image.");
      return;
    }

    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Camera Roll",
          onPress: async () => {
            let pickerResult = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (pickerResult.cancelled) {
              console.log("Picker was cancelled.");
              return;
            }

            const manipResult = await manipulateAsync(
              pickerResult.assets[0].uri,
              [{ resize: { width: 200, height: 200 } }],
              { compress: 0.1, format: SaveFormat.JPEG }
            );
            console.log("n", manipResult.uri);
            if (manipResult.uri) {
              const uploadUrl = await uploadImage(manipResult.uri);
              setProfilePicture(uploadUrl);
            } else {
              alert("Failed to process image.");
            }
          }
        },
        {
          text: "Take Photo",
          onPress: async () => {
            let pickerResult = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (pickerResult.cancelled) {
              console.log("Picker was cancelled.");
              return;
            }

            const manipResult = await manipulateAsync(
              pickerResult.assets[0].uri,
              [{ resize: { width: 200, height: 200 } }],
              { compress: 0.1, format: SaveFormat.JPEG }
            );
            console.log("n", manipResult.uri);
            if (manipResult.uri) {
              const uploadUrl = await uploadImage(manipResult.uri);
              setProfilePicture(uploadUrl);
            } else {
              alert("Failed to process image.");
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ],
      { cancelable: true }
    );
  };

  const uploadImage = async (uri) => {
    if (!uri) {
      console.error("Invalid URI:", uri);
      return;
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `profilePics/${auth.currentUser.uid}`);

      await uploadBytes(fileRef, blob);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error("Failed to upload image:", error);
      return null;
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert("Error", "Please enter an email, password, and username.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userProfile = {
        uid: user.uid,
        email: user.email,
        username: username,
        profilePicture: profilePicture,
        streakScore: 0,
      };

      await setDoc(doc(db, "users", user.uid), userProfile);
      await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));
      navigation.replace('PickInterests');
      Alert.alert("Success", "Registration successful!");
    } catch (error) {
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.profilePictureButton} onPress={pickImage}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
          ) : (
            <Ionicons name="camera-outline" size={24} color="#02fff1" style={styles.icon} />
          )}
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={24} color="#ccc" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={24} color="#ccc" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={24} color="#ccc" />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#ccc"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.forgotPassword}>Forgot password?</Text>
        <Animated.View style={[styles.button, { opacity: fadeAnim }]}>
          <TouchableOpacity
            onPress={() => {
              handleSignUp();
              fadeIn();
            }}
            activeOpacity={0.7}
            onPressIn={fadeOut}
            onPressOut={fadeIn}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.switchButton}>
          <Text style={styles.switchText}>Already have an account? <Text style={{ color: '#0077b6' }}>Log In</Text></Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 50,
    marginVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    height: 60,
  },
  input: {
    flex: 1,
    color: 'white',
    paddingVertical: 15,
    fontSize: 18,
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00b4d8',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 10,
  },
  switchText: {
    color: 'white',
    fontSize: 14,
  },
  profilePictureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  forgotPassword: {
    color: '#ccc',
    marginTop: 10,
    marginBottom: 20,
  },
});

export default CreateAccountScreen;