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
    console.log(pickerResult);

    if (pickerResult.cancelled) {
      console.log(pickerResult.assets[0].uri);
      return;
    }

    

    // Image manipulation is optional and depends on use case
    const manipResult = await manipulateAsync(
      pickerResult.assets[0].uri,
      [{ resize: { width: 200, height: 200 } }],
      { compress: 0.1, format: SaveFormat.JPEG }
    );

    console.log(manipResult);

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
        <Button title="Change Picture" onPress={pickImage} />
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Posts: {posts.length}</Text>
        <Text style={styles.stat}>Streak: {streaks.current}</Text>
      </View>
      <View style={styles.posts}>
        {posts.map((post, index) => (
          <View key={index} style={styles.post}>
            <Text>{post.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.usernameSection}>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          placeholder="Update username"
          value={username}
          onChangeText={setUsername}
        />
        <Button title="Update Profile" onPress={handleUpdateProfile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  stat: {
    fontSize: 16,
  },
  posts: {
    padding: 10,
  },
  post: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  usernameSection: {
    padding: 10,
  },
  label: {
    fontSize: 16,
  },
  input: {
    width: '90%',
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
  },
});

export default ProfileScreen;