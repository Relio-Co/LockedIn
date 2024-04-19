import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableWithoutFeedbackBase,
} from "react-native";

const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.profilePictureContainer}>
        <Image
          source={{
            uri: "https://media.licdn.com/dms/image/C4E03AQF0h_tiMM_Xew/profile-displayphoto-shrink_400_400/0/1657641150377?e=1718236800&v=beta&t=skWOaYHNhUXkdrFfHj1qKOmiC-6ep3hqOB6NLGoY14M", // Placeholder URL
          }}
          style={styles.profilePicture}
        />
      </View>

      {/* Friends Count */}
      <View style={styles.friendsContainer}>
        <Text style={styles.friendsCount}>200 Friends</Text>
      </View>

      {/* Interests Section */}
      <View style={styles.interestsContainer}>
        <Text style={styles.interestsHeader}>Interests:</Text>
        <View style={styles.hashtagsContainer}>
          {/* Replace with actual interests */}
          <Text style={styles.hashtag}>#Reading</Text>
          <Text style={styles.hashtag}>#WorkingOut</Text>
          {/* Add more interests here */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    color: "#fff",
  },
  profilePictureContainer: {
    marginBottom: 20,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  friendsContainer: {
    marginBottom: 20,
    color: "#fff",
  },
  friendsCount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  interestsContainer: {
    alignItems: "center",
  },
  interestsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  hashtagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  hashtag: {
    marginHorizontal: 5,
    marginVertical: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
});

export default ProfileScreen;
