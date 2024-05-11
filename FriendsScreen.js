import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { db, auth } from './firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, query, collection, where, getDocs } from 'firebase/firestore';

function FriendsScreen({ navigation }) {
    const [friends, setFriends] = useState([]);
    const [invites, setInvites] = useState([]);
    const [usernameToAdd, setUsernameToAdd] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFriendsAndInvites();
    }, []);

    const fetchFriendsAndInvites = async () => {
        setLoading(true);
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            setFriends(userData.friends || []);
            setInvites(userData.friendRequests || []);
        }
        setLoading(false);
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

        if (currentUserData.sentRequests && currentUserData.sentRequests.includes(targetUserId)) {
            setLoading(false);
            Alert.alert("Error", "Friend request already sent.");
            return;
        }

        await updateDoc(currentUserRef, {
            sentRequests: arrayUnion(targetUserId)
        });

        await updateDoc(targetUserRef, {
            friendRequests: arrayUnion({ from: auth.currentUser.uid, username: currentUserData.username })
        });

        setLoading(false);
        Alert.alert("Success", "Friend request sent.");
        setUsernameToAdd('');
    };

    const acceptFriendRequest = async (request) => {
        const currentUserRef = doc(db, 'users', auth.currentUser.uid);
        const friendUserRef = doc(db, 'users', request.from);

        await updateDoc(currentUserRef, {
            friends: arrayUnion(request.from),
            friendRequests: arrayRemove(request)
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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Friends</Text>
            <TextInput
                style={styles.input}
                onChangeText={setUsernameToAdd}
                value={usernameToAdd}
                placeholder="Enter username to add"
            />
            <Button title="Send Friend Request" onPress={sendFriendRequest} disabled={loading} />
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
            <FlatList
                data={friends}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                    <View style={styles.friendItem}>
                        <Text style={styles.friendName}>{item}</Text>
                    </View>
                )}
            />
            <Text style={styles.title}>Friend Requests</Text>
            <FlatList
                data={invites}
                keyExtractor={item => item.from}
                renderItem={({ item }) => (
                    <View style={styles.inviteItem}>
                        <Text>{item.username}</Text>
                        <Button title="Accept" onPress={() => acceptFriendRequest(item)} />
                        <Button title="Deny" onPress={() => denyFriendRequest(item)} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        height: 40,
        marginBottom: 12,
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
    },
    friendItem: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#f0f0f0',
    },
    friendName: {
        fontSize: 16,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
    },
    groupLink: {
        color: 'blue',
        textDecorationLine: 'underline',
    },
    inviteItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    }
});

export default FriendsScreen;