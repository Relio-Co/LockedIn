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
