import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { db, auth } from '../../firebaseConfig';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ForYouFeedScreen = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    loadPosts();
    fetchProfilePicture();
  }, []);

  const fetchProfilePicture = async () => {
    try {
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const userProfileData = JSON.parse(userProfile);
        setProfilePicture(userProfileData.profilePicture);
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
  };


  const loadPosts = async () => {
    try {
      const cachedGroups = await AsyncStorage.getItem('groups');
      if (cachedGroups) {
        setGroups(JSON.parse(cachedGroups));
        setLoading(false);
      } else {
        await fetchGroupsAndPosts();
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setLoading(false);
    }
  };

  const handleCamera = async () => {
    if ( true) {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.cancelled) {
        navigation.navigate('Post', { image: result.assets[0].uri });
      }
    }
  };

  const fetchGroupsAndPosts = async () => {
    try {
        console.log("firebasehit");
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      const userGroups = docSnap.exists() ? docSnap.data().groups || [] : [];

      const groupPosts = await Promise.all(
        userGroups.map(async (groupId) => {
          const groupRef = doc(db, 'groups', groupId);
          const groupSnap = await getDoc(groupRef);
          const groupData = groupSnap.exists() ? groupSnap.data() : null;
          const postIds = groupData?.posts || [];
          const postDocs = await Promise.all(
            postIds.map(async (postId) => {
              const postRef = doc(db, 'posts', postId);
              const postSnap = await getDoc(postRef);
              return {
                ...postSnap.data(),
                groupName: groupData?.name || 'Unknown',
                id: postSnap.id,
              };
            })
          );

          const memberIds = groupData?.members || [];
          const userProfiles = memberIds.length
            ? (
                await getDocs(
                  query(collection(db, 'users'), where('__name__', 'in', memberIds))
                )
              ).docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))
            : [];

          return {
            groupId,
            name: groupData?.name || 'Unknown',
            posts: postDocs,
            userProfiles,
          };
        })
      );

      setGroups(groupPosts);
      await AsyncStorage.setItem('groups', JSON.stringify(groupPosts));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching groups and posts:', error);
      setLoading(false);
    }
  };

  const handlePostPress = (postId) => {
    navigation.navigate('PostDetail', { postId });
  };

  const handleProfilePress = (userId) => {
    navigation.navigate('UserProfile', { userId });
  };

  const handleGroupPress = (groupId) => {
    navigation.navigate('GroupDetails', { groupId });
  };

  const renderGroupItem = ({ item }) => (
    <View style={styles.groupCard}>
      <Text style={styles.groupName} onPress={() => handleGroupPress(item.groupId)}>#{item.name}</Text>
      <View style={styles.postGrid}>
        {item.userProfiles?.map((profile) => {
          const post = item.posts?.find(
            (post) =>
              post.createdBy === profile.id
          );
          return (
            <View key={profile.id} style={styles.postTile}>
              {post ? (
                <TouchableOpacity onPress={() => handlePostPress(post.id)}>
                  <Image
                    style={styles.postImage}
                    source={{ uri: post.imageUrl }}
                    placeholder={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...'}} // Replace with actual placeholder if needed
                    contentFit="cover"
                    transition={1000}
                  />
                </TouchableOpacity>
              ) : profile.profilePicture ? (
                <TouchableOpacity onPress={() => handleProfilePress(profile.id)}>
                  <Image
                    style={styles.profileImage}
                    source={{ uri: profile.profilePicture }}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => handleProfilePress(profile.id)}>
                  <View style={[styles.profileImage, styles.noProfilePic]}>
                    <Text style={styles.noProfilePicText}>No Profile Picture</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#00b4d8" />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.groupId}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.flatListContainer}
        />
      )}
      <View style={styles.topPillsContainer}>
        <View style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pill}>
            <Ionicons name="search" size={24} color="white" />
          </BlurView>
        </View>
        <View style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pill}>
          <TouchableOpacity onPress={() => navigation.replace('Feed')}>
              <Text style={styles.pillText}>Explore</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
        <View style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pillH}>
            <TouchableOpacity onPress={() => navigation.replace('ForYouFeedScreen')}>
              <Text style={styles.pillText}>For You</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
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
          <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}>
            <Image 
              source={{ uri: profilePicture }} 
              style={styles.profileImage} 
            />
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
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 10,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardImage: {
    width:  4 - 20,
    height: 4 - 20,
    marginBottom: 10,
  },
  topPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20, // Adjust for iOS notch
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
  pillH: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  navText: {
    fontSize: 18,
    color: 'white',
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
  groupCard: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#1c1c1e',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ccc',
  },
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  postTile: {
    width: '25%',
    aspectRatio: 1,
    padding: 2,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#ccc',
  },
  noProfilePic: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProfilePicText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  flatListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default ForYouFeedScreen;
