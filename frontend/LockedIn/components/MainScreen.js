import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: `https://${process.env.EXPO_PUBLIC_API_LOGIN_API}`,
});

const MainScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState("forYou");
  const [challenges, setChallenges] = useState([]);
  const [currentUsername, setCurrentUsername] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    getCurrentUsername();
  }, []);

  useEffect(() => {
    if (currentUsername) {
      fetchChallenges();
    }
  }, [currentUsername, selectedTab]);

  const getCurrentUsername = async () => {
    try {
      const username = await AsyncStorage.getItem("username");
      setCurrentUsername(username);
    } catch (error) {
      console.error("Error getting current username:", error);
    }
  };

  const fetchChallenges = async () => {
    try {
      console.log(
        "Fetching challenges for:",
        currentUsername,
        "Tab:",
        selectedTab
      );
      const response = await api.get("/challenges", {
        params: {
          username: currentUsername,
          type: selectedTab,
        },
      });
      console.log("Challenges response:", response.data);
      setChallenges(response.data.challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    }
  };

  const handleSubscribe = async (challengeId) => {
    try {
      await api.post("/toggle_subscribe_challenge", {
        username: currentUsername,
        challengeId: challengeId,
      });
      // Update the state directly to reflect the subscription change
      setChallenges(
        challenges.map((challenge) => {
          if (challenge._id === challengeId) {
            return { ...challenge, subscribed: !challenge.subscribed };
          }
          return challenge;
        })
      );
    } catch (error) {
      console.error("Error toggling subscription to challenge:", error);
    }
  };

  const renderChallengeItem = ({ item }) => (
    <View
      style={[
        styles.challenge,
        item.subscribed ? styles.subscribedChallenge : null,
      ]}
    >
      <Text style={styles.title}>{item.title}</Text>
      <TouchableOpacity
        style={[
          styles.subscribeButton,
          item.subscribed ? styles.subscribedButton : styles.unsubscribedButton,
        ]}
        onPress={() => handleSubscribe(item._id)}
      >
        <Text style={styles.subscribeButtonText}>
          {item.subscribed ? "LockedIn" : "LockIn"}
        </Text>
        <Ionicons
          name={item.subscribed ? "lock-closed" : "lock-open"}
          size={16}
          color="white"
          style={styles.lockIcon}
        />
      </TouchableOpacity>
      <View style={styles.friendTagsContainer}>
        {item.subscribedFriends.map((friend) => (
          <Text key={friend} style={styles.friendTag}>
            {friend}
          </Text>
        ))}
      </View>
      {item.images && item.images.length > 0 && (
        <View style={styles.imageGrid}>
          {item.images.slice(0, 6).map((imageId, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setSelectedImage(imageId);
                setModalVisible(true);
              }}
            >
              <Image
                source={{
                  uri: `https://${process.env.EXPO_PUBLIC_API_LOGIN_API}/image/${imageId}`,
                }}
                style={styles.imageSquare}
              />
              {/* Hardcoded profile picture */}
              <Image
                source={{
                  uri: "https://media.licdn.com/dms/image/C4E03AQF0h_tiMM_Xew/profile-displayphoto-shrink_400_400/0/1657641150377?e=1718236800&v=beta&t=skWOaYHNhUXkdrFfHj1qKOmiC-6ep3hqOB6NLGoY14M",
                }}
                style={styles.profilePictureOverlay}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Friends")}>
          <Ionicons name="people" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>🔒Tackle</Text>

        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Image
            source={{
              uri: "https://media.licdn.com/dms/image/C4E03AQF0h_tiMM_Xew/profile-displayphoto-shrink_400_400/0/1657641150377?e=1718236800&v=beta&t=skWOaYHNhUXkdrFfHj1qKOmiC-6ep3hqOB6NLGoY14M",
            }}
            style={styles.profilePicture}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "forYou" && styles.selectedTab]}
          onPress={() => setSelectedTab("forYou")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "forYou" && styles.selectedTabText,
            ]}
          >
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "friends" && styles.selectedTab]}
          onPress={() => setSelectedTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "friends" && styles.selectedTabText,
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.content}
        data={challenges}
        renderItem={renderChallengeItem}
        keyExtractor={(item) => item._id}
      />

      {/* <View style={styles.addButtonContainer}>
        <Button
          title="Post a Challenge"
          onPress={() => navigation.navigate("AddChallenge")}
          color="black"
        />
      </View> */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>alanka</Text>
            {selectedImage && (
              <Image
                source={{
                  uri: `https://${process.env.EXPO_PUBLIC_API_LOGIN_API}/image/${selectedImage}`,
                }}
                style={styles.modalImage}
              />
            )}

            <Image
              source={{
                uri: "https://media.licdn.com/dms/image/C4E03AQF0h_tiMM_Xew/profile-displayphoto-shrink_400_400/0/1657641150377?e=1718236800&v=beta&t=skWOaYHNhUXkdrFfHj1qKOmiC-6ep3hqOB6NLGoY14M",
              }}
              style={styles.profilePictureOverlayModal}
            />
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Text style={styles.textStyle}>Close</Text>
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
    backgroundColor: "#000",
    paddingTop: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000",
    paddingTop: 35,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "black",
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  selectedTab: {
    backgroundColor: "#02fff1",
    color: "black",
  },
  tabText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  selectedTabText: {
    fontWeight: "bold",
    color: "black",
  },
  challenge: {
    margin: 10,
    padding: 15,
    backgroundColor: "#232323",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#424242",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: "white",
    fontSize: 16,
    flex: 1,
  },
  imageSquare: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 10,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: "auto",
  },
  subscribedButton: {
    backgroundColor: "#02fff1",
  },
  unsubscribedButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#02fff1",
  },
  subscribeButtonText: {
    color: "white",
    fontSize: 14,
  },
  lockIcon: {
    marginLeft: 5,
  },
  subscribedChallenge: {
    borderColor: "#02fff1",
  },
  friendTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  friendTag: {
    backgroundColor: "#02fff1",
    color: "black",
    borderRadius: 5,
    padding: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#02fff1",
    borderRadius: 10,
    marginBottom: 30,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "black",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginTop: 20,
    marginBottom: 15,
    textAlign: "center",
    color: "white",
  },
  modalImage: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  profilePictureOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  profilePictureOverlayModal: {
    position: "absolute",

    width: 60,
    height: 50,
    borderRadius: 15,
  },

  profilePicture: {
    bottom: 0,
    right: 0,
    width: 35,
    height: 35,
    borderRadius: 25,
  },
});

export default MainScreen;
