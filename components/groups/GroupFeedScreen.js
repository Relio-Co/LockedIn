import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';

const { height, width } = Dimensions.get('window');

const GroupFeedScreen = ({ route }) => {
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchGroupAndPosts() {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists() && groupSnap.data().members.includes(auth.currentUser.uid)) {
        setGroup(groupSnap.data());
        const postIds = groupSnap.data().posts || [];
        const postsData = await Promise.all(
          postIds.map(async postId => {
            const postRef = doc(db, 'posts', postId);
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
              const postData = postSnap.data();
              const userRef = doc(db, 'users', postData.createdBy);
              const userSnap = await getDoc(userRef);
              return userSnap.exists() ? { id: postSnap.id, ...postData, createdByUsername: userSnap.data().username } : null;
            }
            return null;
          })
        );
        setPosts(postsData.filter(post => post !== null));
      } else {
        Alert.alert("Access Denied", "You are not a member of this group.");
        navigation.goBack();
      }
    }

    fetchGroupAndPosts();
  }, [groupId]);

  const leaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          onPress: async () => {
            const groupRef = doc(db, 'groups', groupId);
            const userRef = doc(db, 'users', auth.currentUser.uid);

            await updateDoc(groupRef, {
              members: arrayRemove(auth.currentUser.uid)
            });

            await updateDoc(userRef, {
              groups: arrayRemove(groupId)
            });

            Alert.alert("Success", "You have left the group.");
            navigation.goBack();
          }
        }
      ]
    );
  };

  const isAdmin = group && group.admins && group.admins.includes(auth.currentUser.uid);

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.postContainer}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
            <View style={styles.overlay}>
              <Text style={styles.postTitle}>{item.title || 'No Title'}</Text>
              <Text style={styles.postContent}>{item.content}</Text>
              <Text style={styles.postedBy}>Posted by: {item.createdByUsername}</Text>
            </View>
          </View>
        )}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
      />
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
        <TouchableOpacity onPress={() => navigation.navigate('GroupMembers', { groupId, isAdmin })}>
          <Icon name="users" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('GroupChat', { groupId })}>
          <Icon name="comments" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={leaveGroup}>
          <Icon name="sign-out" size={24} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  postContent: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  postedBy: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'grey',
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
