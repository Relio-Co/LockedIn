/* [AI Doc Review] This React Native file displays a group feed screen, showing posts from a specific group that the user is a member of. It fetches data from Firebase Firestore and renders a list of posts with details such as title, content, image, and posted by information, along with navigation to post detail and group settings screens if the user is an admin. */
/* [AI Bug Review] The bug is that the `groupId` in the `useEffect` dependency array `[groupId]` should be removed, as it's already defined within the component.*/
 import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
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

  const isAdmin = group && group.admins && group.admins.includes(auth.currentUser.uid);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{group ? group.name : 'Loading...'}</Text>
      <View style={styles.iconBar}>
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
    backgroundColor: '#000', // Dark background for black and white theme
    paddingTop: 50,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
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
    backgroundColor: '#191919', // Slightly lighter black for contrast
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
