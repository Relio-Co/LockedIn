import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Image } from 'expo-image';

function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('https://via.placeholder.com/100');
  const [name, setName] = useState('John Doe');
  const [posts, setPosts] = useState([]);
  const [streaks, setStreaks] = useState({});

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUsername(userData.username);
        setName(userData.name);
        setProfilePicture(userData.profilePicture || 'https://via.placeholder.com/100');
        setPosts(userData.posts || []);
        setStreaks(userData.streaks || { group1: 5, group2: 3, group3: 7 });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user data');
    }
  };

  const handleUpdateProfile = async () => {
    if (!username.trim()) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, { username });
      Alert.alert('Profile updated successfully!');
    } catch (error) {
      Alert.alert('Failed to update profile: ' + error.message);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("You've refused to allow this app to access your photos!");
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
      pickerResult.uri,
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{name}</Text>
          <TouchableOpacity style={styles.changePictureButton} onPress={pickImage}>
            <Text style={styles.changePictureButtonText}>Change Picture</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Posts: {posts.length}</Text>
        <Text style={styles.stat}>Total Streaks: {Object.values(streaks).reduce((a, b) => a + b, 0)}</Text>
      </View>
      <View style={styles.streaks}>
        <Text style={styles.streaksTitle}>Streaks</Text>
        {Object.entries(streaks).map(([group, streak]) => (
          <View key={group} style={styles.streak}>
            <Icon name="fire" size={20} color="#ff4500" />
            <Text style={styles.streakText}>{group}: {streak} days</Text>
          </View>
        ))}
      </View>
      <View style={styles.posts}>
        <Text style={styles.postsTitle}>Posts</Text>
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
        <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProfile}>
          <Text style={styles.updateButtonText}>Update Profile</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  changePictureButton: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 5,
  },
  changePictureButtonText: {
    color: 'white',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stat: {
    fontSize: 16,
    color: 'white',
  },
  streaks: {
    marginBottom: 20,
  },
  streaksTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  streakText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 10,
  },
  posts: {
    marginBottom: 20,
  },
  postsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  post: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    marginBottom: 10,
  },
  postText: {
    color: 'white',
  },
  usernameSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#191919',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: '#1E90FF',
    padding: 10,
    borderRadius: 5,
  },
  updateButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: '#1E90FF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
