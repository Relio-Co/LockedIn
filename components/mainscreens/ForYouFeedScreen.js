import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Platform, StyleSheet, Dimensions, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { collection, query, getDocs, doc, getDoc, orderBy, limit, where, arrayRemove, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const ForYouFeedScreen = () => {
  const navigation = useNavigation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    loadGroups();
    fetchProfilePicture();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const groupsRef = collection(userRef, 'groups');
      const groupsSnap = await getDocs(groupsRef);

      // 1. Fetch member data for all groups
      const allMemberIds = groupsSnap.docs.reduce((acc, doc) => {
        return [...acc, ...Object.keys(doc.data().members)]; 
      }, []);

      const membersQuery = query(collection(db, 'users'), where('uid', 'in', allMemberIds));
      const membersSnap = await getDocs(membersQuery);
      const membersMap = {};
      membersSnap.docs.forEach(doc => {
        membersMap[doc.id] = doc.data();
      });

      // 2. Fetch latest posts for all members
      const latestPostsQuery = query(
        collection(db, 'posts'), 
        where('created_by', 'in', allMemberIds), 
        orderBy('created_at', 'desc'),
        limit(20) // Limit to prevent fetching too many posts
      );
      const latestPostsSnap = await getDocs(latestPostsQuery);

      // 3. Process group data and associate member data and latest posts
      const groupsData = await Promise.all(groupsSnap.docs.map(async groupDoc => {
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        const members = Object.keys(groupData.members).map(memberId => {
          return { id: memberId, ...membersMap[memberId], latestPost: null };
        });

        latestPostsSnap.docs.forEach(postDoc => {
          const postUserId = postDoc.data().created_by;
          const memberIndex = members.findIndex(m => m.id === postUserId);
          if (memberIndex !== -1) {
            members[memberIndex].latestPost = postDoc.data();
          }
        });

        const completedCount = members.filter(member => member.latestPost).length;
        return { ...groupData, members, completedCount };
      }));

      setGroups(groupsData);
      await AsyncStorage.setItem('forYouGroups', JSON.stringify(groupsData)); // Cache with a distinct key
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Error', 'Failed to fetch groups data.');
    }
    setLoading(false);
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const cachedGroups = await AsyncStorage.getItem('forYouGroups');
      if (cachedGroups) {
        setGroups(JSON.parse(cachedGroups));
      } else {
        await fetchGroups();
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups data.');
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
    await fetchGroups();
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

  const handleNudge = async (memberId, groupId) => {
    try {
      // Assuming you have a way to send notifications in your app (e.g., using Firebase Cloud Messaging)
      // Replace this with your notification logic:
      console.log(`Sending nudge to user ${memberId} in group ${groupId}`); 
      Alert.alert('Nudge Sent', 'A notification has been sent to the user.');
    } catch (error) {
      console.error('Error sending nudge:', error);
      Alert.alert('Error', 'Failed to send nudge.');
    }
  };

  const handleSnitch = async (memberId, groupId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const groupRef = doc(db, 'groups', groupId);
      const snitchData = {
        reportedBy: auth.currentUser.uid,
        reportedUser: memberId,
        timestamp: new Date(),
        // Add any other relevant details about the snitch
      };

      // Update the group document with the snitch data
      await updateDoc(groupRef, {
        snitches: arrayUnion(snitchData),
      });

      Alert.alert('Snitch Reported', 'The group admin has been notified.');
    } catch (error) {
      console.error('Error reporting snitch:', error);
      Alert.alert('Error', 'Failed to report snitch.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {loading ? (
          <ActivityIndicator size="large" color="#00b4d8" style={{ marginTop: 20 }} />
        ) : (
          groups.map(group => (
            <View key={group.id} style={[styles.groupCard, group.completedCount === group.members.length && styles.groupCardHighlight]}>
              <Text style={styles.groupName}>
                #{group.name} ({group.completedCount}/{group.members.length}) - {group.score} points
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {group.members.slice(0, 8).map(member => (
                  <View key={member.id} style={styles.memberContainer}>
                    <Image source={{ uri: member.profilePicture }} style={styles.memberImage} />
                    <Text style={styles.memberName}>{member.username}</Text>
                    {member.latestPost ? (
                      <Image source={{ uri: member.latestPost.image_url }} style={styles.postImage} />
                    ) : (
                      <Text style={styles.noPostText}>No post today</Text>
                    )}
                    <View style={styles.buttonContainer}>
                      {!member.latestPost && (
                        <TouchableOpacity style={styles.iconButton} onPress={() => handleNudge(member.id, group.id)}>
                          <MaterialCommunityIcons name="bell-ring-outline" size={24} color="white" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.iconButton} onPress={() => handleSnitch(member.id, group.id)}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={24} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ))
        )}
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
  groupCard: {
    backgroundColor: '#333',
    borderRadius: 10,
    margin: 10,
    padding: 10,
  },
  groupCardHighlight: {
    borderColor: 'teal',
    borderWidth: 2,
    shadowColor: 'teal',
    shadowRadius: 10,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
  },
  groupName: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  memberContainer: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  memberImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  memberName: {
    color: 'white',
    fontSize: 14,
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginVertical: 5,
  },
  noPostText: {
    color: 'grey',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    marginHorizontal: 2,
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

export default ForYouFeedScreen;