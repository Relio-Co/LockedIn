import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, getDocs, addDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

function PostDetailScreen({ route }) {
  const { postId, groupId } = route.params;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchPostAndComments() {
      const postRef = doc(db, 'posts', postId); // Directly referencing the posts collection
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
    if (!newComment.trim()) return;

    const commentData = {
      text: newComment,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      likes: []
    };

    await addDoc(collection(db, `posts/${postId}/comments`), commentData);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      commentData.username = userSnap.data().username;
      commentData.id = new Date().getTime().toString(); // Temp ID for the newly added comment
      setComments([...comments, commentData]);
    }
    setNewComment('');
  };

  return (
    <View style={{ flex: 1 }}>
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
                <Text>{item.text}</Text>
                <Text style={styles.timestamp}>{item.createdAt.toLocaleString()}</Text>
              </View>
            )}
          />
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            style={styles.input}
            placeholder="Write a comment..."
          />
          <Button title="Add Comment" onPress={handleAddComment} />
        </>
      )}
      {!post && <Text>Loading post...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 300,
  },
  caption: {
    fontWeight: 'bold',
    fontSize: 16,
    padding: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    margin: 10,
  },
  username: {
    fontWeight: 'bold',
    color: 'blue',
    margin: 10,
  },
  commentContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: 'lightgrey',
  },
  timestamp: {
    fontSize: 12,
    color: 'grey',
  },
});

export default PostDetailScreen;
