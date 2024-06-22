import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { collection, query, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import ImageFeed from './ImageFeed';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');
const pageSize = 20;

const FeedScreen = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    loadPosts();
    fetchProfilePicture();
  }, []);

  const fetchInitialPosts = async () => {
    setLoading(true);
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('created_at', 'desc'),
        limit(pageSize)
      );
      const postsSnap = await getDocs(postsQuery);

      const postsData = await Promise.all(
        postsSnap.docs.map(async (docSnapshot) => {
          const postData = docSnapshot.data();
          const userId = postData.created_by;
          const groupId = postData.group_id;

          const userDoc = await getDoc(doc(db, 'users', userId));
          const groupDoc = await getDoc(doc(db, 'groups', groupId));

          return {
            id: docSnapshot.id,
            ...postData,
            username: userDoc.exists() ? userDoc.data().username : 'Unknown',
            group: groupDoc.exists() ? groupDoc.data().name : 'Unknown Group',
            comments: postData.comments || 0,
          };
        })
      );

      setPosts(postsData);
      await AsyncStorage.setItem('posts', JSON.stringify(postsData));
    } catch (error) {
      console.error('Error fetching initial posts:', error);
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const cachedPosts = await AsyncStorage.getItem('posts');
      if (cachedPosts) {
        setPosts(JSON.parse(cachedPosts));
      } else {
        await fetchInitialPosts();
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
    setLoading(false);
  };

  const fetchProfilePicture = async () => {
    try {
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const userProfileData = JSON.parse(userProfile);
        setProfilePicture(userProfileData.profile_picture);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialPosts();
    setRefreshing(false);
  };

  const handleCamera = async () => {
    const hasPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (hasPermission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
      return;
    }
    navigation.navigate('Post');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <ImageFeed posts={posts} loading={loading} navigation={navigation} />
      </ScrollView>

      <View style={styles.topPillsContainer}>
        <TouchableOpacity style={styles.pillWrapper} onPress={() => navigation.navigate('Search')}>
          <BlurView intensity={50} style={styles.pill}>
            <Ionicons name="search" size={24} color="white" />
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pill}>
            <Text style={styles.pillText}>Explore</Text>
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pillWrapper} onPress={() => navigation.replace('ForYouFeedScreen')}>
          <BlurView intensity={50} style={styles.pill}>
            <Text style={styles.pillText}>For You</Text>
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pillWrapper} onPress={() => navigation.navigate('FriendsScreen')}>
          <BlurView intensity={50} style={styles.pill}>
            <MaterialIcons name="person-add" size={24} color="white" />
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pillWrapper} onPress={() => navigation.navigate('Settings')}>
          <BlurView intensity={50} style={styles.pill}>
            <Ionicons name="settings" size={24} color="white" />
          </BlurView>
        </TouchableOpacity>
      </View>

      <View style={styles.navbarWrapper}>
        <BlurView intensity={70} style={styles.navbar}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Groups')}>
            <MaterialIcons name="dashboard" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('NotificationsScreen')}>
            <View>
              <Ionicons name="notifications" size={24} color="white" />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCenterItem} onPress={handleCamera}>
            <View style={styles.plusButton}>
              <Text style={styles.plusText}>+</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('GroupChatList')}>
            <View>
              <MaterialCommunityIcons name="chat" size={24} color="white" />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={24} color="white" />
            )}
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
  },
  topPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  pillWrapper: {
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 10,
  },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pillText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
  },
  navbarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 35,
    overflow: 'hidden',
  },
  navbar: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navCenterItem: {
    alignItems: 'center',
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  plusText: {
    fontSize: 30,
    color: 'black',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
  },
});

export default FeedScreen;
