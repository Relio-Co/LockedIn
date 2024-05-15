/* [AI Doc Review] This React Native file displays a post detail screen with its caption, image, and comments. It also allows users to add new comments to the post, fetching data from Firebase Firestore database. */
/* [AI Bug Review] The bug/fault is that the `postId` is not checked for null or undefined before using it in the useEffect dependency array, which can cause an error if `route.params.postId` is not present.*/
 import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, getDocs, addDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

function PostDetailScreen({ route }) {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchPostAndComments() {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = {
          id: postSnap.id,
          ...postSnap.data(),
          createdAt: postSnap.data().createdAt.toDate()
        };
        setPost(postData);

        const commentsQuery = query(collection(db, `posts/${postId}/comments`));
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentsData = commentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }));

        setComments(commentsData);
      } else {
        console.log("No such document!");
      }
    }

    fetchPostAndComments();
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Please enter a comment before posting.");
      return;
    }

    const commentData = {
      text: newComment,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      likes: []
    };

    const newCommentRef = await addDoc(collection(db, `posts/${postId}/comments`), commentData);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      commentData.username = userSnap.data().username;
      commentData.id = newCommentRef.id; // Use Firestore generated ID for the comment
      setComments([...comments, commentData]);
    }
    setNewComment('');
  };

  return (
    <View style={styles.container}>
      {post && (
        <>
          <Text style={styles.caption}>{post.caption}</Text>
          <Image
            style={styles.image}
            source={{ uri: post.imageUrl }}
            placeholder={{ uri: blurhash }}
            contentFit="cover"
            transition={1000}
          />
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: post.createdBy })}>
            <Text style={styles.username}>{post.username}</Text>
          </TouchableOpacity>
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.commentContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}>
                  <Text style={styles.username}>{item.username}</Text>
                </TouchableOpacity>
                <Text style={styles.commentText}>{item.text}</Text>
                <Text style={styles.timestamp}>{item.createdAt.toLocaleString()}</Text>
              </View>
            )}
          />
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor="#ccc"
          />
          <Button title="Add Comment" onPress={handleAddComment} color="#fff" />
        </>
      )}
      {!post && <Text>Loading post...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Dark background
    padding: 10,
    paddingTop: 50,
    paddingBottom: 100,
  },
  image: {
    width: '100%',
    height: 300,
    marginBottom: 10,
  },
  caption: {
    fontWeight: 'bold',
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  username: {
    fontWeight: 'bold',
    color: '#ccc', // Subtle contrast
    fontSize: 16,
    marginBottom: 5,
  },
  commentContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#282828', // Slightly lighter border for contrast
    marginBottom: 5,
  },
  commentText: {
    color: 'white', // White text for comments
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#7e7e7e', // Grey for timestamps
  },
  input: {
    borderWidth: 1,
    borderColor: '#fff', // White border for input
    padding: 10,
    marginVertical: 10,
    color: 'white', // White text for input
    backgroundColor: '#191919', // Darker black for input background
    borderRadius: 5,
  }
});

export default PostDetailScreen;
