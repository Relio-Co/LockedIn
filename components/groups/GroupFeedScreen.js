import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';

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
      <Text style={styles.header}>{group ? group.name : 'Loading...'}</Text>
      <Text style={styles.streak}>Group Streak: {group ? group.streak : 0} <Icon name="bolt" size={24} color="orange" /></Text>
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
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.postContainer} onPress={() => navigation.navigate('PostDetail', { postId: item.id, groupId })}>
            <Text style={styles.postTitle}>{item.title || 'No Title'}</Text>
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} accessibilityLabel="Post Image" />}
            <Text style={styles.postContent}>{item.content}</Text>
            <View style={styles.postFooter}>
              <Text style={styles.postedBy}>Posted by: {item.createdByUsername}</Text>
              <View style={styles.iconRow}>
                <Icon name="thumbs-up" size={20} color="white" style={styles.icon} />
                <Icon name="comment" size={20} color="white" style={styles.icon} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  streak: {
    color: 'orange',
    fontSize: 18,
    marginVertical: 10
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  postContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#fff',
    marginBottom: 10,
    backgroundColor: '#191919',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  postContent: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postedBy: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'grey',
  },
  iconRow: {
    flexDirection: 'row',
  },
  icon: {
    marginLeft: 10,
  }
});

export default GroupFeedScreen;
