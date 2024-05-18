import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Image } from 'expo-image';

function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('https://via.placeholder.com/100');
  const [name, setName] = useState('John Doe');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
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
        setStreaks(userData.streaks || {});

        // Fetch user's posts
        const postsQuery = query(collection(db, 'posts'), where('createdBy', '==', auth.currentUser.uid));
        const postsSnap = await getDocs(postsQuery);
        const postsData = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postsData);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user data');
    }
  };

  const handleUpdateProfile = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, { username });
      Alert.alert('Profile updated successfully!');
      setIsEditingUsername(false);
    } catch (error) {
      Alert.alert('Failed to update profile: ' + error.message);
    }
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
          }
        },
        { text: "Cancel", style: "cancel" }
      ],
      { cancelable: true }
    );
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

  const getActivityGrid = () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    });
    
    const activityMap = posts.reduce((acc, post) => {
      const date = post.createdAt.toDate().toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(post.imageUrl);
      return acc;
    }, {});

    return days.reverse().map(day => (
      <ImageBackground 
        key={day} 
        source={{ uri: activityMap[day] ? activityMap[day][0] : null }}
        style={[styles.activityDay, { backgroundColor: getActivityColor(activityMap[day] ? activityMap[day].length : 0) }]}
      />
    ));
  };

  const getActivityColor = (count) => {
    if (count === 0) return '#ebedf0';
    if (count === 1) return '#c6e48b';
    if (count === 2) return '#7bc96f';
    if (count === 3) return '#239a3b';
    return '#196127';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
          <Icon name="edit" size={24} color="white" style={styles.editIcon} />
        </TouchableOpacity>
        {isEditingUsername ? (
          <TextInput
            style={styles.input}
            placeholder="Update username"
            placeholderTextColor="#ccc"
            value={username}
            onChangeText={setUsername}
            onBlur={handleUpdateProfile}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditingUsername(true)}>
            <Text style={styles.name}>{username} <Icon name="edit" size={16} color="white" /></Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.settingsIcon} onPress={() => navigation.navigate('Settings')}>
          <Icon name="cog" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Posts: {posts.length}</Text>
        <Text style={styles.stat}>Total Streaks: {Object.values(streaks).reduce((a, b) => a + b, 0)}</Text>
      </View>
      <View style={styles.streaks}>
        <Text style={styles.streaksTitle}>Streaks</Text>
        {Object.entries(streaks).map(([group, streak]) => (
          <View key={group} style={styles.streak}>
            <Icon name="bolt" size={20} color="orange" />
            <Text style={styles.streakText}>{group}: {streak} days</Text>
          </View>
        ))}
      </View>
      <View style={styles.posts}>
        <Text style={styles.postsTitle}>Posts Activity (Last 30 Days)</Text>
        <View style={styles.activityGrid}>
          {getActivityGrid()}
        </View>
      </View>
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
  editIcon: {
    position: 'absolute',
    top: 70,
    right: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  input: {
    backgroundColor: '#191919',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  settingsIcon: {
    marginLeft: 'auto',
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
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activityDay: {
    width: 20,
    height: 20,
    margin: 2,
  },
});

export default ProfileScreen;
