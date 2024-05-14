import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, ScrollView, Button, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth} from '../../firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const navigation = useNavigation();

  const fetchUserDataAndPosts = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userGroups = docSnap.data().groups || [];
      setUserGroups(userGroups);
      AsyncStorage.setItem('userGroups', JSON.stringify(userGroups));
    }

    const postsQuery = await getDocs(collection(db, 'posts'));
    const allPosts = postsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const filteredPosts = allPosts.filter(post => post.isPublic || userGroups.includes(post.groupId));
    setPosts(filteredPosts);
  };

  useEffect(() => {
    

    fetchUserDataAndPosts();
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setRefreshing(true);
    await fetchUserDataAndPosts();
    setRefreshing(false);
    } catch (error) {
      console.error(error);
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
       <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
      <TouchableOpacity style={styles.toggleButton}>
        <Text style={styles.toggleText}>Friends</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toggleButton}>
        <Text style={styles.toggleText}>For You</Text>
      </TouchableOpacity>
      <Button title="Groups" style={styles.button} onPress={() => navigation.navigate('Groups')} />
    </ScrollView>
    <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.postContainer, userGroups.includes(item.groupId) ? styles.subscribed : {}]} >
            <View style={styles.imageHeader}>
              <Text style={[styles.nameText, styles.groupName]}>{item.createdByUsername} <Text style={styles.groupText}>{item.groupName || ""}</Text></Text>
              {item.isPublic ? <Icon name="unlock" size={24} style={userGroups.includes(item.groupId) ? styles.lockIconSubscribed : styles.lockIcon} /> : (
                <Icon name="lock" size={24} style={userGroups.includes(item.groupId) ? styles.lockIconSubscribed : styles.lockIcon} />
              )}
              
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
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
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      <View style={styles.floatingButtonsContainer}>
    <View style={styles.floatingButtonsBackground}>
      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Post')}>
          <Icon name="plus" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('FriendsScreen')}>
          <Icon name="search" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Profile')}>
          <Icon name="user" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingTop: 40,
  },
  subscribed: {
    borderColor: 'blue', // Blue border for subscribed posts
    borderWidth: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  settingsButton: {
    padding: 10,
  },
  button: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContainer: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderColor: 'transparent',
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  nameTag: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  lockIcon: {
    fontSize: 24,
    color: '#444',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  caption: {
    fontSize: 16,
    color: '#666',
    padding: 10,
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -120 }],
    zIndex: 1,
  },
  floatingButtonsBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingButton: {
    paddingHorizontal: 20,
  },
});

export default FeedScreen;