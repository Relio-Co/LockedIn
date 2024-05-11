import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import { Image } from 'expo-image';


function FriendsScreen({ navigation }) {
    const [friends, setFriends] = useState([]);
    const [usernameToAdd, setUsernameToAdd] = useState('');
    const [loading, setLoading] = useState(false);
    const [invites, setInvites] = useState([]);

    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        setLoading(true);
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const friendIds = userSnap.data().friends || [];
          const friendQueries = friendIds.map((friendId) => getDoc(doc(db, 'users', friendId)));
          const friendSnaps = await Promise.all(friendQueries);
          const friendsData = friendSnaps.map((snap) => snap.data());
          setFriends(friendsData);
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

        if (currentUserData.friends && currentUserData.friends.some(friend => friend.id === targetUserId)) {
            setLoading(false);
            Alert.alert("Error", "This user is already your friend.");
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
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}>
                    <View  style={styles.friendItem}>
                        <Image source={{ uri: item.profilePicture }} style={styles.profilePic} />
                        <Text style={styles.friendName}>{item.username}</Text>
                    </View>
                    </TouchableOpacity>
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
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#f0f0f0',
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
    },
});

export default FriendsScreen;
