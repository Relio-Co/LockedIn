import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Image,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth, db, storage } from "../../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { pick } from "lodash";

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
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
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("You've refused to allow this app to access your photos!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
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
    if (manipResult.uri) {
      const uploadUrl = await uploadImage(manipResult.uri);
      setProfilePicture(uploadUrl);
    } else {
      alert("Failed to process image.");
    }
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both an email and a password.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Logged in with:", user.email);

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userProfile = docSnap.data();
        await AsyncStorage.setItem("userProfile", JSON.stringify(userProfile));
        navigation.navigate("Feed");
      } else {
        console.log("No user profile found!");
      }
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert("Error", "Please enter an email, password, and username.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
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
      navigation.navigate("Feed");
      Alert.alert("Success", "Registration successful!");
    } catch (error) {
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>LockedIn</Text>

      {isNewUser && (
        <TouchableOpacity
          style={styles.profilePictureButton}
          onPress={pickImage}
        >
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <Ionicons
              name="camera-outline"
              size={24}
              color="#02fff1"
              style={styles.icon}
            />
          )}
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#ccc"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#ccc"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      {isNewUser ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#ccc"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
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
        </>
      ) : (
        <TouchableOpacity
          onPress={() => {
            handleLogin();
            fadeIn();
          }}
          activeOpacity={0.7}
          onPressIn={fadeOut}
          onPressOut={fadeIn}
        >
          <Animated.View style={[styles.button, { opacity: fadeAnim }]}>
            <Text style={styles.buttonText}>Login</Text>
          </Animated.View>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={() => setIsNewUser(!isNewUser)}
        style={styles.switchButton}
      >
        <Text style={styles.switchText}>
          {isNewUser ? "Have an account? Log in" : "New user? Sign up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  input: {
    width: "90%",
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 5,
    color: "white",
    backgroundColor: "#191919",
    fontSize: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    marginBottom: 30,
  },
  button: {
    width: "90%",
    padding: 12,
    backgroundColor: "#424242",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    margin: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  switchButton: {
    marginTop: 10,
  },
  switchText: {
    color: "white",
    fontSize: 14,
  },
  profilePictureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#232323",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});

export default AuthScreen;
