import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { db, auth, storage } from '../../firebaseConfig';
import { doc, getDoc, collection, query, getDocs, addDoc, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
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
      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = {
            id: postSnap.id,
            ...postSnap.data(),
            createdAt: postSnap.data().createdAt.toDate()
          };

          const userRef = doc(db, 'users', postData.createdBy);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            postData.username = userSnap.data().username;
            postData.streakScore = userSnap.data().streakScore;
          }

          setPost(postData);

          const commentsQuery = query(collection(db, `posts/${postId}/comments`));
          const commentsSnapshot = await getDocs(commentsQuery);
          const commentsData = await Promise.all(
            commentsSnapshot.docs.map(async (commentDoc) => {
              const commentData = {
                id: commentDoc.id,
                ...commentDoc.data(),
                createdAt: commentDoc.data().createdAt.toDate()
              };

              const commentUserRef = doc(db, 'users', commentData.userId);
              const commentUserSnap = await getDoc(commentUserRef);
              if (commentUserSnap.exists()) {
                commentData.username = commentUserSnap.data().username;
              }
              return commentData;
            })
          );

          setComments(commentsData);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching post and comments:", error);
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

    try {
      const newCommentRef = await addDoc(collection(db, `posts/${postId}/comments`), commentData);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        commentData.username = userSnap.data().username;
        commentData.id = newCommentRef.id; // Use Firestore generated ID for the comment
        setComments([...comments, commentData]);
      }
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeletePost = async () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const postRef = doc(db, 'posts', postId);
              await deleteDoc(postRef);

              const groupRef = doc(db, 'groups', post.groupId);
              await updateDoc(groupRef, {
                posts: arrayRemove(postId)
              });

              const userRef = doc(db, 'users', post.createdBy);
              await updateDoc(userRef, {
                posts: arrayRemove(postId)
              });

              const imageRef = ref(storage, post.imageUrl);
              await deleteObject(imageRef);

              navigation.goBack();
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {post ? (
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
            <Text style={styles.username}>{post.username} - Streak: {post.streakScore}</Text>
          </TouchableOpacity>
          {post.createdBy === auth.currentUser.uid && (
            <Button title="Delete Post" onPress={handleDeletePost} color="#ff4444" />
          )}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}>
                  <Text style={styles.commentUsername}>{item.username}</Text>
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
          <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
            <Text style={styles.addCommentButtonText}>Add Comment</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading post...</Text>
      )}
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
    borderRadius: 10,
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
    marginBottom: 10,
  },
  commentContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#282828', // Slightly lighter border for contrast
    marginBottom: 5,
  },
  commentUsername: {
    fontWeight: 'bold',
    color: '#1e90ff', // Blue color for usernames
    fontSize: 14,
  },
  commentText: {
    color: 'white', // White text for comments
    fontSize: 14,
    marginBottom: 5,
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
  },
  addCommentButton: {
    backgroundColor: '#1e90ff', // Blue button
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addCommentButtonText: {
    color: 'white',
    fontSize: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
});

export default PostDetailScreen;
