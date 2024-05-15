/* [AI Doc Review] This React Native file implements a login and registration screen for an app, using Firebase authentication and storage. It allows users to log in with their email and password, or create a new account if they don't have one yet. The screen also includes buttons to populate admin details (presumably for testing purposes) and to switch between login and registration modes. */
/* [AI Bug Review] The bug or fault is that the `setEmail` and `setPassword` functions are not defined. They should be replaced with the corresponding setter functions `setEmail` and `setPassword` that were defined earlier in the code, i.e., `setEmail` and `setPassword`.*/
 import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(1)); // Initial opacity for buttons

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 500,
      useNativeDriver: true
    }).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both an email and a password.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Logged in with:', user.email);

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userProfile = docSnap.data();
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        navigation.navigate('Feed');
      } else {
        console.log("No user profile found!");
      }
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both an email and a password.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userProfile = {
        uid: user.uid,
        email: user.email,
        username: '',
        profilePicture: '',
        streakScore: 0
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      navigation.navigate('Feed');
      Alert.alert("Success", "Registration successful!");
    } catch (error) {
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>LockedIn</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ccc" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {isNewUser ? (
        <Animated.View style={[styles.button, {opacity: fadeAnim}]}>
          <TouchableOpacity onPress={() => {handleSignUp(); fadeIn();}} activeOpacity={0.7} onPressIn={fadeOut} onPressOut={fadeIn}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.button, {opacity: fadeAnim}]}>
          <TouchableOpacity onPress={() => {handleLogin(); fadeIn();}} activeOpacity={0.7} onPressIn={fadeOut} onPressOut={fadeIn}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <TouchableOpacity onPress={() => setIsNewUser(!isNewUser)} style={styles.switchButton}>
        <Text style={styles.switchText}>{isNewUser ? "Have an account? Log in" : "New user? Sign up"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {setEmail("a@gmail.com"); setPassword("password");}} style={styles.populateButton}>
        <Text style={styles.populateText}>Populate Admin Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  input: {
    width: '90%',
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 5,
    color: 'white',
    backgroundColor: '#191919',
    fontSize: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  button: {
    width: '90%',
    padding: 12,
    backgroundColor: '#424242',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
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
  populateButton: {
    marginTop: 10,
  },
  populateText: {
    color: 'white',
    fontSize: 14,
  }
});

export default AuthScreen;
