import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { Image } from "expo-image";
import Icon from "react-native-vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PagerView from "react-native-pager-view";

const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const fetchInvitesCount = async () => {
  const userRef = doc(db, "users", auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const friendInvites = userData.friendRequests || [];
    const groupInvites = userData.groupsInvitedTo || [];
    return friendInvites.length + groupInvites.length;
  }
  return 0;
};

const isToday = (date) => {
  const today = new Date();
  const dateToCheck = typeof date === "object" ? date : new Date(date);

  return (
    dateToCheck.getDate() === today.getDate() &&
    dateToCheck.getMonth() === today.getMonth() &&
    dateToCheck.getFullYear() === today.getFullYear()
  );
};

const FeedScreen = () => {
  const [friendsPosts, setFriendsPosts] = useState([]);
  const [forYouPosts, setForYouPosts] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState(0);
  const [invitesCount, setInvitesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFriendsPostsLoaded, setIsFriendsPostsLoaded] = useState(false);
  const [isForYouPostsLoaded, setIsForYouPostsLoaded] = useState(false);
  const navigation = useNavigation();
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (feedType === 0 && !isFriendsPostsLoaded) {
      fetchUserDataAndPosts();
    } else if (feedType === 1 && !isForYouPostsLoaded) {
      fetchAllPosts();
    }
    fetchInvitesCount().then(setInvitesCount);
  }, [feedType]);

  const fetchUserDataAndPosts = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.metadata.hasPendingWrites && !docSnap.metadata.fromCache) {
        const userGroups = docSnap.exists() ? docSnap.data().groups || [] : [];
        setUserGroups(userGroups);
        await AsyncStorage.setItem("userGroups", JSON.stringify(userGroups));

        const groupPosts = await Promise.all(
          userGroups.map(async (groupId) => {
            const groupRef = doc(db, "groups", groupId);
            const groupSnap = await getDoc(groupRef);
            const groupData = groupSnap.data();

            const postIds = groupData?.posts || [];
            const postDocs = await Promise.all(
              postIds.map(async (postId) => {
                const postRef = doc(db, "posts", postId);
                const postSnap = await getDoc(postRef);
                return {
                  ...postSnap.data(),
                  groupName: groupData.name,
                  id: postSnap.id,
                };
              })
            );

            const memberIds = groupData?.members || [];
            const userProfilesQuery = await getDocs(
              query(collection(db, "users"), where("__name__", "in", memberIds))
            );
            const userProfiles = userProfilesQuery.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            return {
              groupId,
              name: groupData.name,
              posts: postDocs,
              userProfiles,
            };
          })
        );

        setFriendsPosts(groupPosts);
        setLoading(false);
        setIsFriendsPostsLoaded(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch user data and posts");
      setLoading(false);
    }
  };

  const fetchAllPosts = async () => {
    setLoading(true);
    try {
      const allPostsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      );
      const allPostsSnap = await getDocs(allPostsQuery);
      const allPosts = await Promise.all(
        allPostsSnap.docs.map(async (postDoc) => {
          const postData = postDoc.data();
          const userRef = doc(db, "users", postData.createdBy);
          const userSnap = await getDoc(userRef);
          const groupRef = postData.groupId
            ? doc(db, "groups", postData.groupId)
            : null;
          const groupSnap = groupRef ? await getDoc(groupRef) : null;

          return {
            id: postDoc.id,
            ...postData,
            createdByUsername: userSnap.data().username,
            groupName: groupSnap ? groupSnap.data().name : null,
          };
        })
      );
      setForYouPosts(allPosts);
      setLoading(false);
      setIsForYouPostsLoaded(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      Alert.alert("Error", "Failed to fetch all posts");
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (feedType === 0) {
        await fetchUserDataAndPosts();
      } else {
        await fetchAllPosts();
      }
      await fetchInvitesCount().then(setInvitesCount);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostPress = (postId, groupId) => {
    navigation.navigate("PostDetail", { postId, groupId });
  };

  const handleProfilePress = (userId) => {
    navigation.navigate("UserProfile", { userId });
  };

  const handleGroupPress = (groupId) => {
    navigation.navigate("GroupDetails", { groupId });
  };

  const isUserInGroup = useCallback((groupId) => {
    return userGroups.includes(groupId);
  }, [userGroups]);

  const renderNoPostsMessage = () => (
    <View style={styles.centeredContent}>
      <Text style={styles.messageText}>Add some friends to get started.</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("FriendsScreen")}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>Add Friends</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPostItem = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.imageHeader}>
        <TouchableOpacity onPress={() => handleProfilePress(item.createdBy)}>
          <Text style={[styles.nameText, styles.userName]}>
            {item.createdByUsername}
          </Text>
        </TouchableOpacity>
        {item.groupName && (
          <TouchableOpacity onPress={() => handleGroupPress(item.groupId)}>
            <Text style={[styles.nameText, styles.groupName]}>
              {item.groupName}
            </Text>
          </TouchableOpacity>
        )}
        {!isUserInGroup(item.groupId) && item.groupName && (
          <TouchableOpacity onPress={() => handleGroupPress(item.groupId)}>
            <Text style={styles.suggestedButton}>Suggested</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={() => handlePostPress(item.id, item.groupId)}>
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
  );

  const renderGroupPostItem = ({ item }) => (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>{item.name}</Text>
      <View style={styles.postGrid}>
        {item.userProfiles?.map((profile) => {
          const post = item.posts?.find(
            (post) =>
              post.createdBy === profile.id &&
              isToday(post.createdAt.toDate())
          );
          return (
            <View key={profile.id} style={styles.postTile}>
              {post ? (
                <TouchableOpacity
                  onPress={() => handlePostPress(post.id, item.groupId)}
                >
                  <Image
                    style={styles.postImage}
                    source={{ uri: post.imageUrl }}
                    placeholder={{ uri: blurhash }}
                    contentFit="cover"
                    transition={1000}
                  />
                </TouchableOpacity>
              ) : profile.profilePicture ? (
                <TouchableOpacity
                  onPress={() => handleProfilePress(profile.id)}
                >
                  <Image
                    style={styles.profileImage}
                    source={{ uri: profile.profilePicture }}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleProfilePress(profile.id)}
                >
                  <View style={[styles.profileImage, styles.noProfilePic]}>
                    <Text style={styles.noProfilePicText}>
                      No Profile Picture
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#1e90ff" />;
    }

    if (feedType === 0 && friendsPosts.length === 0) {
      return renderNoPostsMessage();
    }

    if (feedType === 1 && forYouPosts.length === 0) {
      return renderNoPostsMessage();
    }

    if (feedType === 0) {
      return (
        <FlatList
          data={friendsPosts}
          keyExtractor={(item) => item.groupId}
          renderItem={renderGroupPostItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      );
    }

    return (
      <FlatList
        data={forYouPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 0 && styles.buttonActive]}
          onPress={() => setFeedType(0)}
          accessibilityLabel="Friends Feed"
        >
          <Text style={styles.toggleText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, feedType === 1 && styles.buttonActive]}
          onPress={() => setFeedType(1)}
          accessibilityLabel="For You Feed"
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
          <Animated.View style={{ ...styles.page, opacity: fadeAnim }}>
            {renderContent()}
          </Animated.View>
        </View>
        <View key="2" style={styles.page}>
          <Animated.View style={{ ...styles.page, opacity: fadeAnim }}>
            {renderContent()}
          </Animated.View>
        </View>
      </PagerView>

      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate("NotificationsScreen")}
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={24} color="white" />
          {invitesCount > 0 && <View style={styles.notificationDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate("Groups")}
          accessibilityLabel="Groups"
        >
          <Icon name="users" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate("Post")}
          accessibilityLabel="New Post"
        >
          <Icon name="plus" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate("FriendsScreen")}
          accessibilityLabel="Search Friends"
        >
          <Icon name="search" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate("Profile")}
          accessibilityLabel="Profile"
        >
          <Icon name="user" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    flex: 1,
    backgroundColor: "#000",
  },
  tabBar: {
    flexDirection: "row",
  },
  toggleButton: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
  buttonActive: {
    borderBottomColor: "#ffffff",
  },
  pagerView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: "#1c1c1e",
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: "#000",
    elevation: 5,
  },
  imageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ccc",
  },
  userName: {
    color: "#fff",
  },
  groupName: {
    color: "#1e90ff",
  },
  suggestedButton: {
    backgroundColor: "yellow",
    color: "black",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    fontWeight: "bold",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 15,
  },
  caption: {
    fontSize: 16,
    color: "#ccc",
    padding: 10,
  },
  floatingButtonsContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
  },
  floatingButton: {
    backgroundColor: "#282828",
    borderRadius: 30,
    padding: 10,
    marginLeft: 10,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "red",
  },
  groupCard: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#1c1c1e",
    margin: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#ccc",
  },
  postGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  postTile: {
    width: "25%",
    aspectRatio: 1,
    padding: 2,
  },
  postImage: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "#ccc",
  },
  noProfilePic: {
    justifyContent: "center",
    alignItems: "center",
  },
  noProfilePicText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontSize: 18,
    color: "white",
    marginBottom: 20,
  },
  addButton: {
    padding: 10,
    backgroundColor: "#1e90ff",
    borderRadius: 5,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
  },
});

export default FeedScreen;
