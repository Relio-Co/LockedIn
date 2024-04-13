import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: `https://${process.env.EXPO_PUBLIC_API_LOGIN_API}`,
});

const Separator = () => <View style={styles.separator} />;

const FriendsScreen = () => {
  const navigation = useNavigation();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friendUsername, setFriendUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");

  useEffect(() => {
    getCurrentUsername();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (currentUsername) {
        fetchFriends();
        fetchPendingRequests();
        fetchIncomingRequests();
      }
    }, [currentUsername])
  );

  const getCurrentUsername = async () => {
    try {
      const username = await AsyncStorage.getItem("username");
      setCurrentUsername(username);
    } catch (error) {
      console.error("Error getting current username:", error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get("/get_friends", {
        params: { current_user_username: currentUsername },
      });
      setFriends(response.data.friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get("/get_pending_friend_requests", {
        params: { current_user_username: currentUsername },
      });
      setPendingRequests(response.data.pending_requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const response = await api.get("/get_incoming_friend_requests", {
        params: { current_user_username: currentUsername },
      });
      setIncomingRequests(response.data.incoming_requests);
    } catch (error) {
      console.error("Error fetching incoming requests:", error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const response = await api.post("/make_friend_request", {
        current_user_username: currentUsername,
        friend_username: friendUsername,
      });
      if (response.status === 200) {
        setFriendUsername("");
        fetchPendingRequests();
      } else {
        Alert.alert("Error", "Failed to send friend request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleFriendRequest = async (friendUsername, action) => {
    try {
      const response = await api.post("/add_friend", {
        current_user_username: currentUsername,
        friend_username: friendUsername,
        action: action,
      });
      if (response.status === 200) {
        fetchIncomingRequests();
        fetchFriends();
      } else {
        Alert.alert("Error", `Failed to ${action} friend request`);
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      Alert.alert("Error", `Failed to ${action} friend request`);
    }
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      <Image
        source={{
          uri: "https://media.licdn.com/dms/image/C4E03AQF0h_tiMM_Xew/profile-displayphoto-shrink_400_400/0/1657641150377?e=1718236800&v=beta&t=skWOaYHNhUXkdrFfHj1qKOmiC-6ep3hqOB6NLGoY14M",
        }}
        style={styles.profilePicture}
      />
      <Text style={styles.friendName}>{item}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
      </View>

      <Text style={styles.subtitle}>Your Friends</Text>
      <FlatList
        data={friends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item}
        ItemSeparatorComponent={Separator}
      />

      <Text style={styles.subtitle}>Send Friend Request</Text>
      <TextInput
        style={styles.input}
        placeholder="Friend's Username"
        value={friendUsername}
        onChangeText={setFriendUsername}
      />
      <TouchableOpacity style={styles.button} onPress={sendFriendRequest}>
        <Text style={styles.buttonText}>Send Request</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Pending Friend Requests</Text>
      <FlatList
        data={pendingRequests}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item}
        ItemSeparatorComponent={Separator}
      />

      <Text style={styles.subtitle}>Incoming Friend Requests</Text>
      <FlatList
        data={incomingRequests}
        renderItem={({ item }) => (
          <View style={styles.requestItem}>
            <Text style={styles.requestItemText}>{item}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleFriendRequest(item, "accept")}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleFriendRequest(item, "decline")}
              >
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => item}
        ItemSeparatorComponent={Separator}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "white",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "white",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#1f1f1f",
    padding: 10,
    borderRadius: 5,
    paddingVertical: 10,
  },
  friendIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  friendName: {
    fontSize: 18,
    color: "white",
  },
  input: {
    height: 40,
    borderColor: "#424242",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    color: "white",
    borderRadius: 5,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#1f1f1f",
    padding: 10,
    borderRadius: 5,
  },
  requestItemText: {
    flex: 1,
    color: "white",
    fontSize: 18,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: "row",
  },
  button: {
    backgroundColor: "#424242",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
  },
  buttonText: {
    color: "white",
  },
  separator: {
    height: 1,
    backgroundColor: "#424242",
    marginVertical: 10,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
});

export default FriendsScreen;
