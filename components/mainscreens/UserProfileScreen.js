import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome';

function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUser(userData);
          
          // Fetch user's posts
          const postsQuery = query(collection(db, 'posts'), where('createdBy', '==', userId));
          const postsSnap = await getDocs(postsQuery);
          const postsData = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPosts(postsData);
        } else {
          console.log("No such user!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
  }, [userId]);

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <View style={styles.header}>
            <Image source={{ uri: user.profilePicture || 'https://via.placeholder.com/100' }} style={styles.profilePicture} />
            <Text style={styles.username}>{user.username}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.stat}>Posts: {posts.length}</Text>
            <Text style={styles.stat}>Streak: {user.streak || 0}</Text>
          </View>
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.post}>
                <Text style={styles.postCaption}>{item.caption}</Text>
                {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.postImage} />}
              </View>
            )}
            ListHeaderComponent={() => <Text style={styles.postsTitle}>Posts</Text>}
          />
        </>
      ) : (
        <Text style={styles.loadingText}>Loading...</Text>
      )}
      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Icon name="cog" size={24} color="white" />
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 20,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stat: {
    fontSize: 16,
    color: 'white',
  },
  postsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  post: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    marginBottom: 10,
  },
  postCaption: {
    color: 'white',
    marginBottom: 5,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  loadingText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    padding: 10,
    borderRadius: 5,
  },
  settingsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default UserProfileScreen;
