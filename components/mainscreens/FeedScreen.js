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
  const [feedType, setFeedType] = useState(1); // Set default to "For You" view
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
            const groupData = groupSnap.exists() ? groupSnap.data() : null;

            const postIds = groupData?.posts || [];
            const postDocs = await Promise.all(
              postIds.map(async (postId) => {
                const postRef = doc(db, "posts", postId);
                const postSnap = await getDoc(postRef);
                return {
                  ...postSnap.data(),
                  groupName: groupData?.name || "Unknown",
                  id: postSnap.id,
                };
              })
            );

            const memberIds = groupData?.members || [];
            const userProfiles = memberIds.length
              ? (
                  await getDocs(
                    query(collection(db, "users"), where("__name__", "in", memberIds))
                  )
                ).docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))
              : [];

            return {
              groupId,
              name: groupData?.name || "Unknown",
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
      console.error("Error fetching user data and posts:", error);
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
            createdByUsername: userSnap.exists() ? userSnap.data().username : "Unknown",
            profilePictureUrl: userSnap.exists() ? userSnap.data().profilePicture : null,
            groupName: groupSnap && groupSnap.exists() ? groupSnap.data().name : null,
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
      console.error("Error fetching all posts:", error);
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
    <View style={styles.forYouPostContainer}>
      <TouchableOpacity onPress={() => handlePostPress(item.id, item.groupId)}>
        <Image
          style={styles.forYouImage}
          source={{ uri: item.imageUrl }}
          placeholder={{ uri: blurhash }}
          contentFit="cover"
          transition={1000}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <View style={styles.profileContainer}>
                <Image
                  style={styles.profilePicture}
                  source={{ uri: item.profilePictureUrl }}
                />
                <Text style={styles.emoji}>😊</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.username}>{item.createdByUsername}</Text>
                <Text style={styles.postedTime}>{new Date(item.createdAt.seconds * 1000).toDateString()}</Text>
              </View>
              <View style={styles.groupInfo}>
                {isUserInGroup(item.groupId) ? (
                  <View style={styles.groupIconContainer}>
                    <Icon name="check-circle" size={24} color="#00b4d8" style={styles.iconBackground} />
                  </View>
                ) : (
                  <View style={styles.groupIconContainer}>
                    <Icon name="unlock-alt" size={24} color="#000000" style={styles.iconBackground} />
                  </View>
                )}
                {item.groupName && (
                  <View style={styles.groupPill}>
                    <Text style={styles.groupPillText}>#{item.groupName}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.interactionButtons}>
              <TouchableOpacity style={styles.interactionButton}>
                <View style={styles.frostedIconContainer}>
                  <Icon name="comment" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.interactionButton}>
                <View style={styles.frostedIconContainer}>
                  <Icon name="thumbs-up" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.interactionButton}>
                <View style={styles.frostedIconContainer}>
                  <Icon name="share" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Image>
      </TouchableOpacity>
    </View>
  );

  const renderGroupPostItem = ({ item }) => (
    <View style={styles.groupCard}>
      <Text style={styles.groupName}>#{item.name}</Text>
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
      return <ActivityIndicator size="large" color="#00b4d8" />;
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
              progressViewOffset={100}
              progressBackgroundColor="#282828"
              colors={["#00b4d8"]}
            />
          }
          contentContainerStyle={styles.flatListContainer}
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
            progressViewOffset={100}
            progressBackgroundColor="#282828"
            colors={["#00b4d8"]}
          />
        }
        contentContainerStyle={styles.flatListContainer}
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
        initialPage={1} // Set default to "For You" view
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

      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBarItem}
          onPress={() => navigation.navigate("Groups")}
          accessibilityLabel="Habit"
        >
          <Icon name="list-alt" size={26} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBarItem}
          onPress={() => navigation.navigate("GroupChatList")}
          accessibilityLabel="Chat"
        >
          <Icon name="comments" size={26} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBarItem}
          onPress={() => navigation.navigate("Post")}
          accessibilityLabel="Add"
        >
          <Icon name="plus-circle" size={26} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBarItem}
          onPress={() => navigation.navigate("NotificationsScreen")}
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={26} color="#ffffff" />
          {invitesCount > 0 && <View style={styles.notificationDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBarItem}
          onPress={() => navigation.navigate("Profile")}
          accessibilityLabel="Profile"
        >
          <Icon name="user" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingTop: 50,
    paddingBottom: 20,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#000000",
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
    color: "#ffffff",
  },
  buttonActive: {
    borderBottomColor: "#ffffff",
  },
  pagerView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: "#000",
    elevation: 5,
  },
  textContainer: {
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "black",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  usernameText: {
    fontSize: 16,
    color: "#ffffff",
  },
  emoji: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 16,
  },
  groupNameContainer: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "black",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupNameText: {
    fontSize: 14,
    color: "#ffffff",
  },
  forYouImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    justifyContent: "flex-end",
  },
  forYouCaption: {
    fontSize: 16,
    color: "#ffffff",
    marginTop: 10,
  },
  pillContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "black",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  pillText: {
    color: "#ffffff",
    fontSize: 14,
  },
  pillTextSuggest: {
    color: "yellow",
    fontSize: 14,
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
  flatListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontSize: 18,
    color: "#ffffff",
    marginBottom: 20,
  },
  addButton: {
    padding: 10,
    backgroundColor: "#00b4d8",
    borderRadius: 5,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "#000000",
    height: 60,
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1e1e1e",
  },
  navBarItem: {
    alignItems: "center",
  },
  navBarText: {
    color: "#ffffff",
    fontSize: 12,
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "red",
  },
  forYouPostContainer: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profileInfo: {
    justifyContent: "center",
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  postedTime: {
    fontSize: 12,
    color: "#b0b0b0",
  },
  groupInfo: {
    alignItems: "flex-end",
  },
  groupIconContainer: {
    marginBottom: 5,
  },
  groupPill: {
    backgroundColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 5,
  },
  groupPillText: {
    color: "#ffffff",
    fontSize: 14,
  },
  frostedPillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    margin: 10,
  },
  frostedPillText: {
    marginLeft: 5,
    color: "#ffffff",
    fontSize: 14,
  },
  interactionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  interactionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  frostedIconContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 400,
    padding: 10,
  },
  captionContainer: {
    display: false,
    marginBottom: 10,
    borderRadius: 400,
    backgroundColor: "#1c1c1e",
    padding: 10,
  },
});

export default FeedScreen;
