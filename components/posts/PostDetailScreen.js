import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { db, auth, storage } from '../../firebaseConfig';
import { doc, getDoc, collection, query, getDocs, addDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

function PostDetailScreen({ route }) {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportCommentId, setReportCommentId] = useState(null);
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
            createdAt: postSnap.data().createdAt.toDate(),
          };

          const userRef = doc(db, 'users', postData.createdBy);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            postData.username = userSnap.data().username;
            postData.streakScore = userSnap.data().streakScore;
            postData.profilePictureUrl = userSnap.data().profilePicture;
          }

          setPost(postData);

          const commentsQuery = query(collection(db, `posts/${postId}/comments`));
          const commentsSnapshot = await getDocs(commentsQuery);
          const commentsData = await Promise.all(
            commentsSnapshot.docs.map(async (commentDoc) => {
              const commentData = {
                id: commentDoc.id,
                ...commentDoc.data(),
                createdAt: commentDoc.data().createdAt.toDate(),
              };

              const commentUserRef = doc(db, 'users', commentData.userId);
              const commentUserSnap = await getDoc(commentUserRef);
              if (commentUserSnap.exists()) {
                commentData.username = commentUserSnap.data().username;
                commentData.profilePictureUrl = commentUserSnap.data().profilePicture;
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
      likes: [],
    };

    try {
      const newCommentRef = await addDoc(collection(db, `posts/${postId}/comments`), commentData);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        commentData.username = userSnap.data().username;
        commentData.profilePictureUrl = userSnap.data().profilePicture;
        commentData.id = newCommentRef.id; // Use Firestore generated ID for the comment
        setComments([...comments, commentData]);
      }
      setNewComment('');
      Keyboard.dismiss();
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

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
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
              const commentRef = doc(db, `posts/${postId}/comments`, commentId);
              await deleteDoc(commentRef);

              setComments(comments.filter((comment) => comment.id !== commentId));
            } catch (error) {
              console.error("Error deleting comment:", error);
              Alert.alert("Error", "Failed to delete comment. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleReportPost = () => {
    setReportCommentId(null);
    setReportModalVisible(true);
  };

  const handleReportComment = (commentId) => {
    setReportCommentId(commentId);
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!reportType.trim() || !reportDetails.trim()) {
      Alert.alert("Error", "Please fill in all fields before submitting.");
      return;
    }

    const reportData = {
      type: reportType,
      details: reportDetails,
      reportedBy: auth.currentUser.uid,
      createdAt: new Date(),
    };

    try {
      if (reportCommentId) {
        const commentRef = doc(db, `posts/${postId}/comments`, reportCommentId);
        await updateDoc(commentRef, {
          reports: arrayUnion(reportData),
        });
      } else {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          reports: arrayUnion(reportData),
        });
      }
      setReportType('');
      setReportDetails('');
      setReportModalVisible(false);
      Alert.alert("Report Submitted", "Thank you for your report.");
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
          <View style={styles.header}>
            <View style={styles.profileContainer}>
              <Image style={styles.profilePicture} source={{ uri: post.profilePictureUrl }} />
              <View style={styles.profileInfo}>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: post.createdBy })}>
                  <Text style={styles.username}>{post.username}</Text>
                </TouchableOpacity>
                <Text style={styles.streak}>Streak: {post.streakScore}</Text>
              </View>
            </View>
            {post.createdBy === auth.currentUser.uid ? (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePost}>
                <Icon name="trash" size={24} color="#ff4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.reportButton} onPress={handleReportPost}>
                <Icon name="flag" size={24} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentContainer}>
                <View style={styles.commentHeader}>
                  <Image style={styles.commentProfilePicture} source={{ uri: item.profilePictureUrl }} />
                  <View style={styles.commentInfo}>
                    <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}>
                      <Text style={styles.commentUsername}>{item.username}</Text>
                    </TouchableOpacity>
                    {item.userId === auth.currentUser.uid || post.createdBy === auth.currentUser.uid ? (
                      <TouchableOpacity style={styles.deleteCommentButton} onPress={() => handleDeleteComment(item.id)}>
                        <Icon name="trash" size={16} color="#ff4444" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.reportCommentButton} onPress={() => handleReportComment(item.id)}>
                        <Icon name="flag" size={16} color="#ff4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
                <Text style={styles.timestamp}>{item.createdAt.toLocaleString()}</Text>
              </View>
            )}
          />
          <View style={styles.inputContainer}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor="#ccc"
              onSubmitEditing={handleAddComment}
            />
          </View>
          <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
            <Text style={styles.addCommentButtonText}>Add Comment</Text>
          </TouchableOpacity>
          <Modal
            visible={reportModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setReportModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Report {reportCommentId ? 'Comment' : 'Post'}</Text>
                <TextInput
                  value={reportType}
                  onChangeText={setReportType}
                  style={styles.modalInput}
                  placeholder="Type of Report"
                  placeholderTextColor="#ccc"
                />
                <TextInput
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  style={styles.modalInput}
                  placeholder="Details"
                  placeholderTextColor="#ccc"
                  multiline
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleSubmitReport}>
                    <Text style={styles.modalButtonText}>Submit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButton} onPress={() => setReportModalVisible(false)}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <Text style={styles.loadingText}>Loading post...</Text>
      )}
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  username: {
    fontWeight: 'bold',
    color: '#1e90ff', // Blue color for username
    fontSize: 16,
  },
  streak: {
    color: '#ccc',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#282828',
    padding: 8,
    borderRadius: 8,
  },
  reportButton: {
    backgroundColor: '#282828',
    padding: 8,
    borderRadius: 8,
  },
  commentContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#282828', // Slightly lighter border for contrast
    marginBottom: 5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentProfilePicture: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUsername: {
    fontWeight: 'bold',
    color: '#1e90ff', // Blue color for usernames
    fontSize: 14,
  },
  deleteCommentButton: {
    padding: 4,
    borderRadius: 4,
  },
  reportCommentButton: {
    padding: 4,
    borderRadius: 4,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 50,
    marginVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    height: 60,
  },
  input: {
    flex: 1,
    color: 'white',
    paddingVertical: 15,
    fontSize: 18,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#191919',
    color: 'white',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default PostDetailScreen;
