/* [AI Doc Review] This React Native file retrieves a user's profile data and posts from a Firebase Firestore database, displaying the username and post captions in a FlatList component. */
/* [AI Bug Review] The bug is that the `fetchUser` function is not setting the `posts` state variable when fetching data from Firebase, so the FlatList will always render an empty list.*/
 import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

function UserProfileScreen({ route }) {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUser(docSnap.data());
      } else {
        console.log("No such user!");
      }
    };

    fetchUser();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {user && (
        <>
          <Text>Username: {user.username}</Text>
          <FlatList
            data={posts}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => <Text>{item.caption}</Text>}
          />
        </>
      )}
    </View>
  );
}

export default UserProfileScreen;
