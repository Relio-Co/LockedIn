import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, query, where, getDocs, collection } from 'firebase/firestore';
import RNPickerSelect from 'react-native-picker-select';
import { Image } from 'expo-image';

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
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
            <View style={styles.friendItem}>
                <Image source={{ uri: item.profilePicture }} style={styles.profilePic} />
                <Text style={styles.friendName}>{item.username}</Text>
                <Button title="Unfriend" onPress={() => removeFriend(item.id)} color="#fff" />
                <Button title="Block" onPress={() => blockUser(item.id)} color="#fff" />
                <RNPickerSelect
                    onValueChange={(value) => setSelectedGroup(value)}
                    items={groups.map(group => ({ label: group.name, value: group.id }))}
                    style={pickerSelectStyles}
                    value={selectedGroup}
                    placeholder={{ label: "Select a group...", value: null }}
                />
                <Button title="Invite to Group" onPress={() => inviteToGroup(item.id)} color="#fff" />
            </View>
        </TouchableOpacity>
    );

    const renderInviteItem = ({ item }) => (
        <View style={styles.inviteItem}>
            <Text style={styles.inviteText}>{item.username}</Text>
            <Button title="Accept" onPress={() => acceptFriendRequest(item)} color="#fff" />
            <Button title="Deny" onPress={() => denyFriendRequest(item)} color="#fff" />
            <Text style={styles.timestamp}>Sent: {new Date(item.timestamp).toLocaleString()}</Text>
        </View>
    );

    const renderOutgoingRequestItem = ({ item }) => (
        <View style={styles.inviteItem}>
            <Text style={styles.inviteText}>To: {item.username}</Text>
            <Text style={styles.timestamp}>Sent: {new Date(item.timestamp).toLocaleString()}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Friends</Text>
            <TextInput
                style={styles.input}
                onChangeText={setUsernameToAdd}
                value={usernameToAdd}
                placeholder="Enter username to add"
                placeholderTextColor="#ccc"
            />
            <Button title="Send Friend Request" onPress={sendFriendRequest} disabled={loading} color="#fff" />
            {loading && <ActivityIndicator size="large" color="#fff" />}
            <FlatList
                data={friends}
                keyExtractor={item => item.id}
                renderItem={renderFriendItem}
            />
            <Text style={styles.title}>Friend Requests</Text>
            <FlatList
                data={invites}
                keyExtractor={item => item.from}
                renderItem={renderInviteItem}
            />
            <Text style={styles.title}>Outgoing Requests</Text>
            <FlatList
                data={outgoingRequests}
                keyExtractor={item => item.id}
                renderItem={renderOutgoingRequestItem}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#000',
        paddingTop: 50,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: 'white',
    },
    input: {
        height: 40,
        marginBottom: 12,
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
        borderColor: 'white',
        color: 'white',
        backgroundColor: '#191919',
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#232323',
    },
    profilePic: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '500',
        color: 'white',
    },
    inviteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#232323',
    },
    inviteText: {
        color: 'white',
    },
    timestamp: {
        color: 'white',
        fontSize: 12,
        marginTop: 5,
    }
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 4,
        color: 'white',
        paddingRight: 30,
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 8,
        color: 'white',
        paddingRight: 30,
    },
});

export default FriendsScreen;
