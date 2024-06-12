import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from "expo-image";

const { width, height } = Dimensions.get('window');
const blurhash = "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const ImageFeed = ({ posts, loading, navigation }) => {
  
  const renderPostItem = (item, index) => (
    <TouchableOpacity 
      key={`${item.id}-${index}`} 
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })} 
      style={styles.postItem}
    >
      <Image
        style={styles.postImage}
        source={{ uri: item.imageUrl }}
        placeholder={{ uri: blurhash }}
        contentFit="cover"
        transition={1000}
      />
      <View style={styles.postDetails}>
        <Text style={styles.posterName}>
          <Ionicons name="flame-outline" size={16} color="orange" /> {item.streak} - {item.username}
        </Text>
        <Text style={styles.postCaption}>{item.caption}</Text>
        <View style={styles.groupPill}>
          <Text style={styles.groupPillText}>{item.group}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPosts = () => (
    <View style={styles.postsContainer}>
      {posts.map((item, index) => renderPostItem(item, index))}
      {loading && <ActivityIndicator size="large" color="#00b4d8" />}
    </View>
  );

  return <View>{renderPosts()}</View>;
};

const styles = StyleSheet.create({
  postsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  postItem: {
    width: (width / 2) - 10,
    height: (height / 2) - 10,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
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
