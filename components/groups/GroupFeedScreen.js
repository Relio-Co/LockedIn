import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome5'; 

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

  function GroupFeedScreen({ route }) {
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
              return postSnap.exists() ? { id: postSnap.id, ...postSnap.data() } : null;
            })
          );
          setPosts(postsData.filter(post => post !== null));
        } else {
          Alert.alert("Access Denied", "You are not a member of this group.");
          navigation.goBack();
        }
      };
  
      fetchGroupAndPosts();
    }, [groupId]);
  
    const isAdmin = group && group.admins && group.admins.includes(auth.currentUser.uid);
  
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{group ? group.name : 'Loading...'}</Text>
        <View style={styles.iconBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Post', { groupId })}>
            <Icon name="edit" size={24} color="#4CAF50" />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })}>
              <Icon name="cogs" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('GroupMembers', { groupId, isAdmin })}>
            <Icon name="users" size={24} color="#4CAF50" />
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
              <Text style={styles.postedBy}>Posted by: {item.createdBy}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff', // Bright background for better readability
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
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
        borderColor: '#ccc',
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    postTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    postContent: {
        fontSize: 16,
        marginBottom: 5,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 5,
    },
    postedBy: {
        fontSize: 14,
        fontStyle: 'italic',
        color: 'grey',
    }
});

export default GroupFeedScreen;