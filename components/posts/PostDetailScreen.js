import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Dimensions, Platform, Modal, TextInput, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { db, auth, storage } from '../../firebaseConfig';
import { doc, getDoc, collection, query, getDocs, addDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';

const { height, width } = Dimensions.get('window');

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [posts, setPosts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportCommentId, setReportCommentId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    async function fetchPosts() {
      try {
        const postsQuery = query(collection(db, 'posts'));
        const postsSnapshot = await getDocs(postsQuery);

        const postsData = await Promise.all(
          postsSnapshot.docs.map(async (docSnapshot) => {
            const postData = {
              id: docSnapshot.id,
              ...docSnapshot.data(),
              createdAt: docSnapshot.data().createdAt.toDate(),
            };

            const userRef = doc(db, 'users', postData.createdBy);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              postData.username = userSnap.data().username;
              postData.streakScore = userSnap.data().streakScore;
              postData.profilePictureUrl = userSnap.data().profilePicture;
            }

            const groupRef = doc(db, 'groups', postData.groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
              postData.groupName = groupSnap.data().name;
            }

            return postData;
          })
        );

        setPosts(postsData);

        const initialIndex = postsData.findIndex(post => post.id === postId);
        setCurrentIndex(initialIndex !== -1 ? initialIndex : 0);
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    }

    fetchPosts();
  }, [postId]);

  useEffect(() => {
    async function fetchComments() {
      if (posts[currentIndex]) {
        const commentsQuery = query(collection(db, `posts/${posts[currentIndex].id}/comments`));
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
      }
    }

    fetchComments();
  }, [currentIndex, posts]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment before posting.');
      return;
    }

    const commentData = {
      text: newComment,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      likes: [],
    };

    try {
      const newCommentRef = await addDoc(collection(db, `posts/${posts[currentIndex].id}/comments`), commentData);
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
      console.error('Error adding comment:', error);
    }
  };

  const handleDeletePost = async () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const postRef = doc(db, 'posts', posts[currentIndex].id);
              await deleteDoc(postRef);

              const groupRef = doc(db, 'groups', posts[currentIndex].groupId);
              await updateDoc(groupRef, {
                posts: arrayRemove(posts[currentIndex].id),
              });

              const userRef = doc(db, 'users', posts[currentIndex].createdBy);
              await updateDoc(userRef, {
                posts: arrayRemove(posts[currentIndex].id),
              });

              const imageRef = ref(storage, posts[currentIndex].imageUrl);
              await deleteObject(imageRef);

              navigation.goBack();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const commentRef = doc(db, `posts/${posts[currentIndex].id}/comments`, commentId);
              await deleteDoc(commentRef);

              setComments(comments.filter((comment) => comment.id !== commentId));
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
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
      Alert.alert('Error', 'Please fill in all fields before submitting.');
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
        const commentRef = doc(db, `posts/${posts[currentIndex].id}/comments`, reportCommentId);
        await updateDoc(commentRef, {
          reports: arrayUnion(reportData),
        });
      } else {
        const postRef = doc(db, 'posts', posts[currentIndex].id);
        await updateDoc(postRef, {
          reports: arrayUnion(reportData),
        });
      }
      setReportType('');
      setReportDetails('');
      setReportModalVisible(false);
      Alert.alert('Report Submitted', 'Thank you for your report.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <Image
                style={styles.image}
                source={{ uri: item.imageUrl }}
                placeholder={{ uri: blurhash }}
                contentFit="cover"
                transition={1000}
              />
              <View style={styles.overlay}>
                <Text style={styles.caption}>{item.caption}</Text>
                <View style={styles.header}>
                  <View style={styles.profileContainer}>
                    <Image style={styles.profilePicture} source={{ uri: item.profilePictureUrl }} />
                    <View style={styles.profileInfo}>
                      <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.createdBy })}>
                        <Text style={styles.username}>{item.username}</Text>
                      </TouchableOpacity>
                      <Text style={styles.streak}>Streak: {item.streakScore}</Text>
                      <Text style={styles.groupName}>Group: {item.groupName}</Text>
                    </View>
                  </View>
                  {item.createdBy === auth.currentUser.uid ? (
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
                  keyExtractor={(comment) => comment.id}
                  renderItem={({ item: comment }) => (
                    <View style={styles.commentContainer}>
                      <View style={styles.commentHeader}>
                        <Image style={styles.commentProfilePicture} source={{ uri: comment.profilePictureUrl }} />
                        <View style={styles.commentInfo}>
                          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: comment.userId })}>
                            <Text style={styles.commentUsername}>{comment.username}</Text>
                          </TouchableOpacity>
                          {comment.userId === auth.currentUser.uid || item.createdBy === auth.currentUser.uid ? (
                            <TouchableOpacity style={styles.deleteCommentButton} onPress={() => handleDeleteComment(comment.id)}>
                              <Icon name="trash" size={16} color="#ff4444" />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.reportCommentButton} onPress={() => handleReportComment(comment.id)}>
                              <Icon name="flag" size={16} color="#ff4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <Text style={styles.timestamp}>{comment.createdAt.toLocaleString()}</Text>
                    </View>
                  )}
                />
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={styles.inputContainer}
                >
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    style={styles.input}
                    placeholder="Write a comment..."
                    placeholderTextColor="#ccc"
                    onSubmitEditing={handleAddComment}
                  />
                  <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
                    <Text style={styles.addCommentButtonText}>Add Comment</Text>
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </View>
            </View>
          )}
          pagingEnabled
          horizontal={false}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / height);
            setCurrentIndex(index);
          }}
          initialScrollIndex={currentIndex}
          getItemLayout={(data, index) => (
            { length: height, offset: height * index, index }
          )}
        />
      ) : (
        <Text style={styles.loadingText}>Loading post...</Text>
      )}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setReportModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    color: '#1e90ff',
    fontSize: 16,
  },
  streak: {
    color: '#ccc',
    fontSize: 14,
  },
  groupName: {
    color: 'grey',
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
    borderColor: '#282828',
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
    color: '#1e90ff',
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
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#7e7e7e',
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
    backgroundColor: '#1e90ff',
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
