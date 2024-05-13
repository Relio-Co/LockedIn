import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../../firebaseConfig';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';

const blurhash = '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState(0);
  const navigation = useNavigation();

  const isToday = (date) => {
    const today = new Date();
    const dateToCheck = typeof date === 'object' ? date : new Date(date);

    return (
      dateToCheck.getDate() === today.getDate() &&
      dateToCheck.getMonth() === today.getMonth() &&
      dateToCheck.getFullYear() === today.getFullYear()
    );
  };

  const fetchUserDataAndPosts = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.metadata.hasPendingWrites && !docSnap.metadata.fromCache) {
      const userGroups = docSnap.exists() ? docSnap.data().groups || [] : [];
      setUserGroups(userGroups);
      AsyncStorage.setItem('userGroups', JSON.stringify(userGroups));

      const groupPosts = await Promise.all(
        userGroups.map(async (groupId) => {
          const groupRef = doc(db, 'groups', groupId);
          const groupSnap = await getDoc(groupRef);
          const groupData = groupSnap.data();

          const postIds = groupData?.posts || [];
          const postDocs = await Promise.all(
            postIds.map(async (postId) => {
              const postRef = doc(db, 'posts', postId);
              const postSnap = await getDoc(postRef);
              return postSnap.data();
            })
          );

          const memberIds = groupData?.members || [];
          const userProfilesQuery = await getDocs(
            query(collection(db, 'users'), where('__name__', 'in', memberIds))
          );
          const userProfiles = userProfilesQuery.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return { groupId, posts: postDocs, userProfiles };
        })
      );

      setPosts(groupPosts);
    }
  };

  useEffect(() => {
    fetchUserDataAndPosts();
  }, [feedType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUserDataAndPosts();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 0 && styles.buttonActive]}
          onPress={() => setFeedType(0)}
        >
          <Text style={styles.toggleText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 1 && styles.buttonActive]}
          onPress={() => setFeedType(1)}
        >
          <Text style={styles.toggleText}>For You</Text>
        </TouchableOpacity>
      </View>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setFeedType(e.nativeEvent.position)}
      >
        <View key="1" style={styles.page}>
          <FlatList
            data={posts}
            keyExtractor={(item) => item.groupId}
            renderItem={({ item }) => (
              <View style={styles.groupCard}>
                <Text style={styles.groupName}>{item.groupId}</Text>
                <View style={styles.postGrid}>
                  {item.userProfiles.map((profile) => {
                    const post = item.posts.find(
                      (post) =>
                        post.createdBy === profile.id &&
                        isToday(post.createdAt.toDate())
                    );
                    return (
                      <View key={profile.id} style={styles.postTile}>
                        {post ? (
                          <Image
                            style={styles.postImage}
                            source={{ uri: post.imageUrl }}
                            placeholder={{ uri: blurhash }}
                            contentFit="cover"
                            transition={1000}
                          />
                        ) : profile.profilePicture ? (
                          <Image
                            style={styles.profileImage}
                            source={{ uri: profile.profilePicture }}
                          />
                        ) : (
                          <View style={[styles.profileImage, styles.noProfilePic]}>
                            <Text style={styles.noProfilePicText}>No Profile Picture</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          />
        </View>
        <View key="2" style={styles.page}>
          <FlatList
            data={posts.flatMap(group => group.posts.filter(post => post.isPublic))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.postContainer}>
                <View style={styles.imageHeader}>
                  <Text style={[styles.nameText, styles.groupName]}>
                    {item.createdByUsername} <Text style={styles.groupText}>{item.groupName || ""}</Text>
                  </Text>
                  <Icon name={item.isPublic ? "unlock" : "lock"} size={24} style={styles.lockIcon} />
                </View>
                <TouchableOpacity onPress={() => {console.log(item.id); navigation.navigate('PostDetail', { postId: item.id }); }}>
                  <Image
                    style={styles.image}
                    source={{ uri: item.imageUrl }}
                    placeholder={{ uri: blurhash }}
                    contentFit="cover"
                    transition={1000}
                  />
                  <Text style={styles.caption}>{item.caption}</Text>
                </TouchableOpacity>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          />
        </View>
      </PagerView>

      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Post')}>
          <Icon name="plus" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('FriendsScreen')}>
         <Icon name="search" size={24} color="white" />
       </TouchableOpacity>
       <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Profile')}>
         <Icon name="user" size={24} color="white" />
       </TouchableOpacity>
     </View>
   </View>
 );
}

const styles = StyleSheet.create({
 container: {
  paddingTop: 50,
   flex: 1,
   backgroundColor: '#121212',
 },
 tabBar: {
   flexDirection: 'row',
 },
 toggleButton: {
   flex: 1,
   alignItems: 'center',
   padding: 10,
   borderBottomWidth: 2,
   borderBottomColor: 'transparent',
 },
 toggleText: {
   fontSize: 16,
   fontWeight: '500',
   color: 'white',
 },
 buttonActive: {
   borderBottomColor: '#ffffff',
 },
 pagerView: {
   flex: 1,
 },
 page: {
   padding: 20,
 },
 postContainer: {
   backgroundColor: '#1c1c1e',
   padding: 10,
   borderRadius: 10,
   marginVertical: 8,
   shadowColor: '#000',
   elevation: 5,
 },
 imageHeader: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   padding: 10,
 },
 nameText: {
   fontSize: 16,
   fontWeight: '500',
   color: '#ccc',
 },
 lockIcon: {
   color: '#ccc',
 },
 image: {
   width: '100%',
   height: 300,
   borderRadius: 15,
 },
 caption: {
   fontSize: 16,
   color: '#ccc',
   padding: 10,
 },
 floatingButtonsContainer: {
   position: 'absolute',
   bottom: 20,
   right: 20,
   flexDirection: 'row',
 },
 floatingButton: {
   backgroundColor: '#282828',
   borderRadius: 30,
   padding: 10,
   marginLeft: 10,
 },
 groupCard: {
   padding: 10,
   borderRadius: 10,
   backgroundColor: '#1c1c1e',
   margin: 5,
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.25,
   shadowRadius: 3.84,
   elevation: 5,
 },
 groupName: {
   fontSize: 18,
   fontWeight: 'bold',
   marginBottom: 10,
   color: '#ccc',
 },
 postGrid: {
   flexDirection: 'row',
   flexWrap: 'wrap',
   justifyContent: 'center',
 },
 postTile: {
   width: '25%',
   aspectRatio: 1,
   padding: 2,
 },
 postImage: {
   width: '100%',
   height: '100%',
   borderRadius: 5,
 },
 profileImage: {
   width: '100%',
   height: '100%',
   borderRadius: 50,
   backgroundColor: '#ccc',
 },
 noProfilePic: {
   justifyContent: 'center',
   alignItems: 'center',
 },
 noProfilePicText: {
   color: '#fff',
   fontWeight: 'bold',
 },
});

export default FeedScreen;