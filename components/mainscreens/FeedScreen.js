import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from "expo-image";

const { width, height } = Dimensions.get('window');
const numRows = 30;
const numCols = 31;
const pageSize = 40;

const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const FeedScreen = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const fetchInitialPosts = async () => {
    setLoading(true);
    try {
      console.log("firebasehit");
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      const postsSnap = await getDocs(postsQuery);
      const postsData = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      await AsyncStorage.setItem('posts', JSON.stringify(postsData));
    } catch (error) {
      console.error("Error fetching initial posts:", error);
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const cachedPosts = await AsyncStorage.getItem('posts');
      if (cachedPosts) {
        setPosts(JSON.parse(cachedPosts));
      } else {
        await fetchInitialPosts();
      }
    } catch (error) {
      console.error("Error loading posts:", error);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialPosts();
    setRefreshing(false);
  };

  const renderPostItem = (item, index) => (
    <TouchableOpacity key={`${item.id}-${index}`} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
      <Image
        style={styles.postImage}
        source={{ uri: item.imageUrl }}
        placeholder={{ uri: blurhash }}
        contentFit="cover"
        transition={1000}
      />
    </TouchableOpacity>
  );

  const renderPosts = () => {
    if (posts.length === 0) return null;

    const repeatedPosts = [];
    const totalPostsNeeded = numRows * numCols;

    for (let i = 0; i < totalPostsNeeded; i++) {
      const post = posts[i % posts.length];
      repeatedPosts.push(renderPostItem(post, i));
    }

    return (
      <View style={styles.postsContainer}>
        {repeatedPosts}
        {loading && <ActivityIndicator size="large" color="#00b4d8" />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.outerScrollView}
        contentContainerStyle={styles.contentContainer}
        horizontal
        pagingEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {renderPosts()}
        </ScrollView>
      </ScrollView>

      <View style={styles.topPillsContainer}>
        <View style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pill}>
            <Ionicons name="search" size={24} color="white" />
          </BlurView>
        </View>
        <View style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pill}>
            <Text style={styles.pillText}>Explore</Text>
          </BlurView>
        </View>
        <View style={styles.pillWrapper}>
          <BlurView intensity={50} style={styles.pill}>
            <TouchableOpacity onPress={() => navigation.replace('ForYouFeedScreen')}>
              <Text style={styles.pillText}>For You</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>

      <View style={styles.navbarWrapper}>
        <BlurView intensity={70} style={styles.navbar}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Groups')}>
            <MaterialIcons name="dashboard" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('NotificationsScreen')}>
            <View>
              <Ionicons name="notifications" size={24} color="white" />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCenterItem} onPress={() => navigation.navigate('Camera')}>
            <View style={styles.plusButton}>
              <Text style={styles.plusText}>+</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('GroupChatList')}>
            <View>
              <MaterialCommunityIcons name="chat" size={24} color="white" />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}>
            <Image 
              source={{ uri: 'https://example.com/profile.jpg' }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </BlurView>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(!profileModalVisible)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <TouchableOpacity style={styles.modalButton} onPress={() => {
              setProfileModalVisible(!profileModalVisible);
              navigation.navigate('FriendsScreen');
            }}>
              <Text style={styles.modalButtonText}>Add Friend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => {
              setProfileModalVisible(!profileModalVisible);
              navigation.navigate('ViewProfile');
            }}>
              <Text style={styles.modalButtonText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => {
              setProfileModalVisible(!profileModalVisible);
              navigation.navigate('AddHabit');
            }}>
              <Text style={styles.modalButtonText}>Add Habit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => {
              setProfileModalVisible(!profileModalVisible);
              navigation.navigate('Settings');
            }}>
              <Text style={styles.modalButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  outerScrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width * numCols,
    height: height * numRows,
  },
  postsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  postImage: {
    width: 130 * 1.9,
    height: 200 * 1.9,
    borderRadius: 8,
    margin: 5,
  },
  topPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20, // Adjust for iOS notch
    left: 10,
    right: 10,
    zIndex: 1,
  },
  pillWrapper: {
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 10,
  },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pillText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
  },
  navbarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 35,
    overflow: 'hidden',
  },
  navbar: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 18,
    color: 'white',
  },
  navCenterItem: {
    alignItems: 'center',
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  plusText: {
    fontSize: 30,
    color: 'black',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    width: 200,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FeedScreen;
