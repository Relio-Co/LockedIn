import React, { useEffect, useState } from 'react';
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
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, query, where, getDocs, collection } from 'firebase/firestore';
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
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const friendIds = userData.friends || [];
      const friendRequests = userData.friendRequests || [];
      const sentRequests = userData.sentRequests || [];

      const friendQueries = friendIds.map((friendId) => getDoc(doc(db, 'users', friendId)));
      const friendSnaps = await Promise.all(friendQueries);
      const friendsData = friendSnaps.map((snap) => ({ id: snap.id, ...snap.data() }));
      setFriends(friendsData);
      setInvites(friendRequests);
      setOutgoingRequests(sentRequests);
    }
    setLoading(false);
  };

  const fetchGroups = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const groupIds = userSnap.data().groups || [];
      const groupQueries = groupIds.map((groupId) => getDoc(doc(db, 'groups', groupId)));
      const groupSnaps = await Promise.all(groupQueries);
      const groupsData = groupSnaps.map((snap) => ({ id: snap.id, ...snap.data() }));
      setGroups(groupsData);
    }
  };

  const sendFriendRequest = async () => {
    if (!usernameToAdd.trim()) {
      Alert.alert("Error", "Please enter a valid username.");
      return;
    }
    setLoading(true);
    const usersQuery = query(collection(db, "users"), where("username", "==", usernameToAdd));
    const querySnapshot = await getDocs(usersQuery);
    if (querySnapshot.empty) {
      setLoading(false);
      Alert.alert("Error", "No user found with this username.");
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const targetUserId = userDoc.id;
    if (targetUserId === auth.currentUser.uid) {
      setLoading(false);
      Alert.alert("Error", "You cannot send a friend request to yourself.");
      return;
    }

    const targetUserRef = doc(db, 'users', targetUserId);
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    const currentUserSnap = await getDoc(currentUserRef);
    const currentUserData = currentUserSnap.data();

    if (currentUserData.friends && currentUserData.friends.includes(targetUserId)) {
      setLoading(false);
      Alert.alert("Error", "This user is already your friend.");
      return;
    }

    await updateDoc(currentUserRef, {
      sentRequests: arrayUnion({ id: targetUserId, username: userDoc.data().username, timestamp: new Date().toISOString() })
    });

    await updateDoc(targetUserRef, {
      friendRequests: arrayUnion({ from: auth.currentUser.uid, username: currentUserData.username, timestamp: new Date().toISOString() })
    });

    setLoading(false);
    Alert.alert("Success", "Friend request sent.");
    setUsernameToAdd('');
    fetchFriendsAndInvites();
  };

  const acceptFriendRequest = async (request) => {
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    const friendUserRef = doc(db, 'users', request.from);

    await updateDoc(currentUserRef, {
      friends: arrayUnion(request.from),
      friendRequests: arrayRemove(request),
      sentRequests: arrayRemove({ id: request.from })
    });
    await updateDoc(friendUserRef, {
      friends: arrayUnion(auth.currentUser.uid)
    });

    fetchFriendsAndInvites();
  };

  const denyFriendRequest = async (request) => {
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(currentUserRef, {
      friendRequests: arrayRemove(request)
    });
    fetchFriendsAndInvites();
  };

  const removeFriend = async (friendId) => {
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    const friendUserRef = doc(db, 'users', friendId);

    await updateDoc(currentUserRef, {
      friends: arrayRemove(friendId)
    });
    await updateDoc(friendUserRef, {
      friends: arrayRemove(auth.currentUser.uid)
    });

    fetchFriendsAndInvites();
  };

  const blockUser = async (friendId) => {
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(currentUserRef, {
      blockedUsers: arrayUnion(friendId)
    });

    removeFriend(friendId);
  };

  const inviteToGroup = async (friendId) => {
    if (!selectedGroup) {
      Alert.alert("Error", "Please select a group to invite to.");
      return;
    }

    const groupRef = doc(db, 'groups', selectedGroup);
    await updateDoc(groupRef, {
      members: arrayUnion(friendId)
    });

    Alert.alert("Success", "Friend invited to the group.");
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
        <TouchableOpacity style={styles.actionButton} onPress={() => acceptFriendRequest(item)}>
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => denyFriendRequest(item)}>
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
