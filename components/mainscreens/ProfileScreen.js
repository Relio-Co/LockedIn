import React, { useState, useEffect } from 'react';
import { View, Image, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';

function ProfileScreen({ route }) {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('https://via.placeholder.com/100');
  const [name, setName] = useState('John Doe');
  const [posts, setPosts] = useState([]);
  const [streaks, setStreaks] = useState({});

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
      setUsername(userData.username);
      setName(userData.name);
      setProfilePicture(userData.profilePicture || 'https://via.placeholder.com/100');
      setPosts(userData.posts || []);
      setStreaks(userData.streaks || {});
    } else {
      console.log('No such document!');
    }
  };

  const handleUpdateProfile = async () => {
    if (!username.trim()) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, { username });
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile: ' + error.message);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      return;
    }

    const manipResult = await manipulateAsync(
      pickerResult.assets[0].uri,
      [{ resize: { width: 200, height: 200 } }],
      { compress: 0.1, format: SaveFormat.JPEG }
    );

    const uploadUrl = await uploadImage(manipResult.uri);
    setProfilePicture(uploadUrl);
    updateProfilePicture(uploadUrl);
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, `profilePics/${auth.currentUser.uid}`);

    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
  };

  const updateProfilePicture = async (url) => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { profilePicture: url });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
        <Text style={styles.name}>{name}</Text>
        <Button title="Change Picture" onPress={pickImage} color="#fff" />
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Posts: {posts.length}</Text>
        <Text style={styles.stat}>Streak: {streaks.current}</Text>
      </View>
      <View style={styles.posts}>
        {posts.map((post, index) => (
          <View key={index} style={styles.post}>
            <Text style={styles.postText}>{post.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.usernameSection}>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          placeholder="Update username"
          placeholderTextColor="#ccc"
          value={username}
          onChangeText={setUsername}
        />
        <Button title="Update Profile" onPress={handleUpdateProfile} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000', // Dark background for black and white theme
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white', // White text for better contrast
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stat: {
    fontSize: 16,
    color: 'white', // White text for stats
  },
  posts: {
    flex: 1,
  },
  post: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#232323', // Slightly lighter border for contrast
  },
  postText: {
    color: 'white', // White text for post content
  },
  usernameSection: {
    padding: 10,
  },
  label: {
    fontSize: 16,
    color: 'white', // White label text
  },
  input: {
    width: '100%',
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fff', // White border for input
    borderRadius: 5,
    color: 'white', // White input text
    backgroundColor: '#191919', // Darker black for input background
  },
});

export default ProfileScreen;