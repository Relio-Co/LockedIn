import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, SafeAreaView } from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('https://via.placeholder.com/100');
  const [name, setName] = useState('John Doe');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [posts, setPosts] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [groupStreaks, setGroupStreaks] = useState({});
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setStreaks({
          streakScore: userData.streakScore,
          highestGlobalStreak: userData.highestGlobalStreak,
        });
        setGroups(userData.groups || []);
        await fetchGroupNames(userData.groupStreaks || {});
        
        // Fetch user's posts
        const postsQuery = query(collection(db, 'posts'), where('createdBy', '==', auth.currentUser.uid));
        const postsSnap = await getDocs(postsQuery);
        const postsData = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postsData);
      }
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user data');
      setLoading(false);
    }
  };

  const fetchGroupNames = async (groupStreaks) => {
    try {
      const groupNames = {};
      const groupIds = Object.keys(groupStreaks);
      for (const groupId of groupIds) {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          groupNames[groupId] = {
            name: groupSnap.data().name,
            ...groupStreaks[groupId],
          };
        }
      }
      setGroupStreaks(groupNames);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch group names');
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
      <View key={day} style={[styles.activityDay, { backgroundColor: getActivityColor(activityMap[day] ? activityMap[day].length : 0) }]}>
        {activityMap[day] && <Image source={{ uri: activityMap[day][0] }} style={styles.activityImage} />}
      </View>
    ));
  };

  const getActivityColor = (count) => {
    if (count === 0) return '#3a3a3a';
    if (count === 1) return '#6a6a6a';
    if (count === 2) return '#9a9a9a';
    if (count === 3) return '#c3c3c3';
    return '#fff';
  };

  const renderGroups = () => {
    const sortedGroups = Object.entries(groupStreaks).sort((a, b) => b[1].streakScore - a[1].streakScore);
    return sortedGroups.map(([groupId, groupData]) => (
      <TouchableOpacity key={groupId} style={styles.groupItem} onPress={() => navigation.navigate('GroupDetails', { groupId })}>
        <Icon name="users" size={20} color="orange" />
        <Text style={styles.groupName}>{groupData.name}: {groupData.streakScore} days (Highest: {groupData.highestStreak} days)</Text>
      </TouchableOpacity>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b4d8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
            <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
            <Icon name="camera" size={24} color="white" style={styles.cameraIcon} />
          </TouchableOpacity>
          <View style={styles.userInfo}>
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
            <Text style={styles.fullName}>{name}</Text>
          </View>
          <TouchableOpacity style={styles.settingsIcon} onPress={() => navigation.navigate('Settings')}>
            <Icon name="cog" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{streaks.streakScore}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{streaks.highestGlobalStreak}</Text>
            <Text style={styles.statLabel}>Highest Streak</Text>
          </View>
        </View>
        <View style={styles.groupsContainer}>
          <Text style={styles.groupsTitle}>Groups</Text>
          {renderGroups()}
        </View>
        <View style={styles.posts}>
          <Text style={styles.postsTitle}>Posts Activity (Last 30 Days)</Text>
          <View style={styles.activityGrid}>
            {getActivityGrid()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 5,
  },
  userInfo: {
    flex: 1,
    marginLeft: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  fullName: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  input: {
    backgroundColor: '#333',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    width: '100%',
  },
  settingsIcon: {
    padding: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  groupsContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  groupsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  groupName: {
    fontSize: 14,
    color: 'white',
    marginLeft: 10,
  },
  posts: {
    marginBottom: 20,
  },
  postsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  activityDay: {
    width: (width - 60) / 7,
    height: (width - 60) / 7,
    margin: 5,
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileScreen;
