import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';  // Ensure AsyncStorage is imported

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both an email and a password.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Logged in with:', user.email);

      // Fetch user profile from Firestore
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userProfile = docSnap.data();
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));  // Save to AsyncStorage
        navigation.navigate('Feed');  // Navigate to Feed after successful login
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
        username: '', // Default username
        profilePicture: '',
        streakScore: 0
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));  // Save to AsyncStorage

      navigation.navigate('Feed');
      Alert.alert("Success", "Registration successful!");
    } catch (error) {
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {isNewUser ? (
        <Button title="Sign Up" onPress={handleSignUp} />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
      <Button title={isNewUser ? "Have an account? Log in" : "New user? Sign up"} onPress={() => setIsNewUser(!isNewUser)} />
      <Button title={"populate admin details"} onPress={() => {setEmail("a@gmail.com"); setPassword("password");}}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '90%',
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
  },
});

export default AuthScreen;
