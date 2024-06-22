import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const ImageFeed = ({ posts, loading, navigation }) => {
  const renderPostItem = (item, index) => (
    <View key={`${item.id}-${index}`} style={styles.postContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        style={styles.postItem}
      >
        <Image
          style={styles.postImage}
          source={{ uri: item.image_url }}
          contentFit="cover"
          transition={1000}
        />
        <View style={styles.postDetails}>
          <Text style={styles.posterName}>
            <Ionicons name="flame-outline" size={16} color="orange" /> {item.username}
          </Text>
          <Text style={styles.postCaption}>{item.caption}</Text>
          <View style={styles.groupPill}>
            <Text style={styles.groupPillText}>{item.group}</Text>
          </View>
          <Text style={styles.commentCount}>{item.comments} comments</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.postsContainer}>
      {posts.map((item, index) => renderPostItem(item, index))}
      {loading && <ActivityIndicator size="large" color="#00b4d8" />}
    </View>
  );
};

const styles = StyleSheet.create({
  postsContainer: {
    flex: 1,
    padding: 10,
  },
  postContainer: {
    marginBottom: 20,
  },
  postItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: width - 20,
    height: width - 20,
    borderRadius: 8,
  },
  postDetails: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  posterName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postCaption: {
    color: 'white',
    marginVertical: 5,
  },
  commentCount: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  groupPill: {
    backgroundColor: 'gray',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  groupPillText: {
    color: 'white',
    fontSize: 12,
  },
});

export default ImageFeed;
