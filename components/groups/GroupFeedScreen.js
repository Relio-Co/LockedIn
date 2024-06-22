import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, getDocs, updateDoc, deleteField } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';

const { height, width } = Dimensions.get('window');

const GroupFeedScreen = ({ route }) => {
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchGroupAndPosts() {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          setGroup(groupData);

          const postsCollectionRef = collection(groupRef, 'posts');
          const postsSnap = await getDocs(postsCollectionRef);

          const postsData = await Promise.all(
            postsSnap.docs.map(async postDoc => {
              const postData = postDoc.data();
              const userRef = doc(db, 'users', postData.created_by);
              const userSnap = await getDoc(userRef);

              return userSnap.exists()
                ? { id: postDoc.id, ...postData, created_by_username: userSnap.data().username }
                : null;
            })
          );

          setPosts(postsData.filter(post => post !== null));
        } else {
          Alert.alert('Group Not Found', 'The group you are trying to view does not exist.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching group and posts:', error);
        Alert.alert('Error', 'Failed to load group data.');
      } finally {
        setLoading(false);
      }
    }

    fetchGroupAndPosts();
  }, [groupId]);

  const joinGroup = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const groupRef = doc(db, 'groups', groupId);

      await updateDoc(userRef, {
        [`groups.${groupId}`]: { role: 'member', joined_at: new Date() },
      });
      await updateDoc(groupRef, {
        [`members.${auth.currentUser.uid}`]: { role: 'member', joined_at: new Date() },
      });

      Alert.alert('Success', 'You have joined the group.');
      setGroup(prevGroup => ({
        ...prevGroup,
        members: { ...prevGroup.members, [auth.currentUser.uid]: { role: 'member', joined_at: new Date() } },
      }));
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join the group.');
    }
  };

  const leaveGroup = async () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Leave',
        onPress: async () => {
          try {
            const groupRef = doc(db, 'groups', groupId);
            const userRef = doc(db, 'users', auth.currentUser.uid);

            await updateDoc(groupRef, { [`members.${auth.currentUser.uid}`]: deleteField() });
            await updateDoc(userRef, { [`groups.${groupId}`]: deleteField() });

            Alert.alert('Success', 'You have left the group.');
            navigation.goBack();
          } catch (error) {
            console.error('Error leaving group:', error);
            Alert.alert('Error', 'Failed to leave the group.');
          }
        },
      },
    ]);
  };

  const isAdmin = group && group.members && group.members[auth.currentUser.uid]?.role === 'admin';
  const isMember = group && group.members && group.members[auth.currentUser.uid];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isMember ? (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" transition={1000} />
              <View style={styles.overlay}>
                <Text style={styles.postTitle}>{item.caption || 'No Title'}</Text>
                <Text style={styles.postedBy}>Posted by: {item.created_by_username}</Text>
              </View>
            </View>
          )}
          pagingEnabled
          horizontal={false}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.joinContainer}>
          <Text style={styles.groupName}>{group.name}</Text>
          <TouchableOpacity style={styles.joinButton} onPress={joinGroup}>
            <Text style={styles.joinButtonText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {isMember && (
        <View style={styles.iconBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Leaderboard', { groupId })}>
            <Icon name="trophy" size={24} color="gold" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Post', { groupId })}>
            <Icon name="plus" size={24} color="white" />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })}>
              <Icon name="edit" size={24} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('GroupMembers', { groupId, isAdmin })}
          >
            <Icon name="users" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('GroupChat', { groupId })}>
            <Icon name="comments" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={leaveGroup}>
            <Icon name="sign-out" size={24} color="red" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  postContainer: {
    height: height,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    height: height,
    width: width,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  postedBy: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'grey',
  },
  joinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groupName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  joinButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#1e90ff',
    borderRadius: 5,
  },
  joinButtonText: {
    fontSize: 18,
    color: 'white',
  },
  iconBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 10,
    flexDirection: 'column',
    alignItems: 'center',
  },
  icon: {
    margin: 10,
  },
});

export default GroupFeedScreen;
