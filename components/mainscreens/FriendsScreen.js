import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { db, auth } from '../../firebaseConfig';
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  query,
  where,
  getDocs,
  collection,
  writeBatch,
} from 'firebase/firestore';
import RNPickerSelect from 'react-native-picker-select';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

function FriendsScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [usernameToAdd, setUsernameToAdd] = useState('');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    fetchFriendsAndInvites();
    fetchGroups();
  }, []);

  const fetchFriendsAndInvites = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const friendRefs = userData.friends?.map(friendId => doc(db, 'users', friendId)) || [];
        const friendsData = await Promise.all(friendRefs.map(getDoc));
        
        setFriends(friendsData.map(snap => ({ id: snap.id, ...snap.data() })));
        setInvites(userData.friendRequests || []);
        setOutgoingRequests(userData.sentRequests || []);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const fetchGroups = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const groupRefs = userSnap.data().groups?.map(groupId => doc(db, 'groups', groupId)) || [];
        const groupsData = await Promise.all(groupRefs.map(getDoc));

        setGroups(groupsData.map(snap => ({ id: snap.id, ...snap.data() })));
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const sendFriendRequest = async () => {
    if (!usernameToAdd.trim()) {
      Alert.alert("Error", "Please enter a valid username.");
      return;
    }
    setLoading(true);
    try {
      const usersQuery = query(collection(db, "users"), where("username", "==", usernameToAdd));
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        setLoading(false);
        Alert.alert("Error", "No user found with this username.");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const targetUserId = userDoc.id;
      const targetUsername = userDoc.data().username;
      const currentUserId = auth.currentUser.uid;

      if (targetUserId === currentUserId) {
        setLoading(false);
        Alert.alert("Error", "You cannot send a friend request to yourself.");
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', currentUserId), {
        sentRequests: arrayUnion({ id: targetUserId, username: targetUsername, timestamp: new Date().toISOString() })
      });
      batch.update(doc(db, 'users', targetUserId), {
        friendRequests: arrayUnion({ from: currentUserId, username: auth.currentUser.displayName, timestamp: new Date().toISOString() })
      });

      await batch.commit();
      setLoading(false);
      Alert.alert("Success", "Friend request sent.");
      setUsernameToAdd('');
      fetchFriendsAndInvites();
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
    }
  };

  const handleFriendRequest = async (request, accept) => {
    setLoading(true);
    try {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const friendUserRef = doc(db, 'users', request.from);
      const batch = writeBatch(db);

      if (accept) {
        batch.update(currentUserRef, {
          friends: arrayUnion(request.from),
          friendRequests: arrayRemove(request),
        });
        batch.update(friendUserRef, {
          friends: arrayUnion(auth.currentUser.uid)
        });
      } else {
        batch.update(currentUserRef, {
          friendRequests: arrayRemove(request)
        });
      }

      await batch.commit();
      fetchFriendsAndInvites();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const removeFriend = async (friendId) => {
    setLoading(true);
    try {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const friendUserRef = doc(db, 'users', friendId);
      const batch = writeBatch(db);

      batch.update(currentUserRef, { friends: arrayRemove(friendId) });
      batch.update(friendUserRef, { friends: arrayRemove(auth.currentUser.uid) });

      await batch.commit();
      fetchFriendsAndInvites();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const blockUser = async (friendId) => {
    setLoading(true);
    try {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(currentUserRef, {
        blockedUsers: arrayUnion(friendId)
      });
      removeFriend(friendId);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const inviteToGroup = async (friendId) => {
    if (!selectedGroup) {
      Alert.alert("Error", "Please select a group to invite to.");
      return;
    }
    setLoading(true);
    try {
      const groupRef = doc(db, 'groups', selectedGroup);
      await updateDoc(groupRef, {
        [`members.${friendId}`]: { role: 'member', joined_at: new Date().toISOString() }
      });
      Alert.alert("Success", "Friend invited to the group.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
        <Image source={{ uri: item.profilePicture }} style={styles.profilePic} />
        <Text style={styles.cardText}>{item.username}</Text>
      </TouchableOpacity>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionButton} onPress={() => removeFriend(item.id)}>
          <Text style={styles.actionButtonText}>Unfriend</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => blockUser(item.id)}>
          <Text style={styles.actionButtonText}>Block</Text>
        </TouchableOpacity>
      </View>
      <RNPickerSelect
        onValueChange={(value) => setSelectedGroup(value)}
        items={groups.map(group => ({ label: group.name, value: group.id }))}
        style={pickerSelectStyles}
        value={selectedGroup}
        placeholder={{ label: "Select a group...", value: null }}
      />
      <TouchableOpacity style={styles.actionButton} onPress={() => inviteToGroup(item.id)}>
        <Text style={styles.actionButtonText}>Invite to Group</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInviteItem = ({ item }) => (
    <View style={styles.inviteCard}>
      <Text style={styles.cardText}>{item.username}</Text>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleFriendRequest(item, true)}>
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleFriendRequest(item, false)}>
          <Text style={styles.actionButtonText}>Deny</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.timestamp}>Sent: {new Date(item.timestamp).toLocaleString()}</Text>
    </View>
  );

  const renderOutgoingRequestItem = ({ item }) => (
    <View style={styles.inviteCard}>
      <Text style={styles.cardText}>To: {item.username}</Text>
      <Text style={styles.timestamp}>Sent: {new Date(item.timestamp).toLocaleString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>My Friends</Text>
        <TextInput
          style={styles.input}
          onChangeText={setUsernameToAdd}
          value={usernameToAdd}
          placeholder="Enter username to add"
          placeholderTextColor="#ccc"
        />
        <TouchableOpacity style={styles.addButton} onPress={sendFriendRequest} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.addButtonText}>Send Friend Request</Text>}
        </TouchableOpacity>
        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          renderItem={renderFriendItem}
          contentContainerStyle={styles.flatListContent}
        />
        <Text style={styles.title}>Friend Requests</Text>
        <FlatList
          data={invites}
          keyExtractor={item => item.from}
          renderItem={renderInviteItem}
          contentContainerStyle={styles.flatListContent}
        />
        <Text style={styles.title}>Outgoing Requests</Text>
        <FlatList
          data={outgoingRequests}
          keyExtractor={item => item.id}
          renderItem={renderOutgoingRequestItem}
          contentContainerStyle={styles.flatListContent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
    textAlign: 'center',
  },
  input: {
    height: 40,
    marginBottom: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 20,
    borderColor: 'white',
    color: 'white',
    backgroundColor: '#191919',
  },
  addButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderColor: '#fff',
    borderWidth: 1,
    width: '100%',
  },
  inviteCard: {
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#232323',
    borderColor: '#fff',
    borderWidth: 1,
    width: '100%',
  },
  cardText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 10,
  },
  timestamp: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  flatListContent: {
    paddingBottom: 20,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 20,
    color: 'white',
    paddingRight: 30,
    marginTop: 10,
    backgroundColor: '#333',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 20,
    color: 'white',
    paddingRight: 30,
    marginTop: 10,
    backgroundColor: '#333',
  },
});

export default FriendsScreen;
