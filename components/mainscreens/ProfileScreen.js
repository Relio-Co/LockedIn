import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { auth, db, storage } from "../../firebaseConfig";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import Icon from "react-native-vector-icons/FontAwesome";
import { Image } from "expo-image";

function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState(
    "https://via.placeholder.com/100"
  );
  const [name, setName] = useState("John Doe");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [posts, setPosts] = useState([]);
  const [streaks, setStreaks] = useState({});

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUsername(userData.username);
        setName(userData.name);
        setProfilePicture(
          userData.profilePicture || "https://via.placeholder.com/100"
        );
        setStreaks(userData.streaks || {});

        // Fetch user's posts
        const postsQuery = query(
          collection(db, "posts"),
          where("createdBy", "==", auth.currentUser.uid)
        );
        const postsSnap = await getDocs(postsQuery);
        const postsData = postsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(postsData);
        setPosts(postsData);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch user data");
    }
  };

  const handleUpdateProfile = async () => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    try {
      await updateDoc(userRef, { username });
      Alert.alert("Profile updated successfully!");
      setIsEditingUsername(false);
    } catch (error) {
      Alert.alert("Failed to update profile: " + error.message);
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPermissionResult =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted || !cameraPermissionResult.granted) {
      Alert.alert(
        "Permission required",
        "You need to allow access to your photos and camera to upload an image."
      );
      return;
    }

    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Camera Roll",
          onPress: async () => {
            let pickerResult = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (pickerResult.cancelled) {
              return;
            }

            const manipResult = await manipulateAsync(
              pickerResult.assets[0].uri,
              [{ resize: { width: 200, height: 200 } }],
              { compress: 0.1, format: SaveFormat.JPEG }
            );

            const uploadUrl = await uploadImage(manipResult.uri);
            setProfilePicture(uploadUrl);
            updateProfilePicture(uploadUrl);
          },
        },
        {
          text: "Take Photo",
          onPress: async () => {
            let pickerResult = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (pickerResult.cancelled) {
              return;
            }

            const manipResult = await manipulateAsync(
              pickerResult.assets[0].uri,
              [{ resize: { width: 200, height: 200 } }],
              { compress: 0.1, format: SaveFormat.JPEG }
            );

            const uploadUrl = await uploadImage(manipResult.uri);
            setProfilePicture(uploadUrl);
            updateProfilePicture(uploadUrl);
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, `profilePics/${auth.currentUser.uid}`);

    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
  };

  const updateProfilePicture = async (url) => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, { profilePicture: url });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{ uri: profilePicture }}
            style={styles.profilePicture}
          />
          <Icon name="edit" size={24} color="white" style={styles.editIcon} />
        </TouchableOpacity>
        {isEditingUsername ? (
          <TextInput
            style={styles.input}
            placeholder="Update username"
            placeholderTextColor="#ccc"
            value={username}
            onChangeText={setUsername}
            onBlur={handleUpdateProfile}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditingUsername(true)}>
            <Text style={styles.name}>
              {username} <Icon name="edit" size={16} color="white" />
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Posts: {posts.length}</Text>
        <Text style={styles.stat}>
          Total Streaks: {Object.values(streaks).reduce((a, b) => a + b, 0)}
        </Text>
      </View>
      <View style={styles.streaks}>
        <Text style={styles.streaksTitle}>Streaks</Text>
        {Object.entries(streaks).map(([group, streak]) => (
          <View key={group} style={styles.streak}>
            <Icon name="bolt" size={20} color="orange" />
            <Text style={styles.streakText}>
              {group}: {streak} days
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.container}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
              <Text style={styles.caption}>{item.caption}</Text>
              <Text style={styles.details}>
                Posted by {item.createdByUsername} in {item.groupName}
              </Text>
            </View>
          )}
        />
      </View>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Icon name="cog" size={24} color="white" />
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
  },
  editIcon: {
    position: "absolute",
    top: 70,
    right: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  input: {
    backgroundColor: "#191919",
    color: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  stat: {
    fontSize: 16,
    color: "white",
  },
  streaks: {
    marginBottom: 20,
  },
  streaksTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  streakText: {
    fontSize: 16,
    color: "white",
    marginLeft: 10,
  },
  posts: {
    marginBottom: 20,
  },
  postsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  post: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    marginBottom: 10,
  },
  postText: {
    color: "white",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E90FF",
    padding: 10,
    borderRadius: 5,
    alignSelf: "center",
    marginTop: 20,
  },
  settingsButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 5,
  },
  postContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    marginBottom: 5,
  },
  caption: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  details: {
    fontSize: 14,
    color: "gray",
  },
});

export default ProfileScreen;
