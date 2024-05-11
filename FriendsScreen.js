import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { db, auth } from './firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';

function FriendsScreen({ navigation }) {
    const [friends, setFriends] = useState([]);
    const [invites, setInvites] = useState([]);
    const [newFriendId, setNewFriendId] = useState('');

    useEffect(() => {
        fetchFriendsAndInvites();
    }, []);

    const fetchFriendsAndInvites = async () => {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const friendsData = await Promise.all(userData.friends.map(async friendId => {
                const friendRef = doc(db, 'users', friendId);
                const friendSnap = await getDoc(friendRef);
                return friendSnap.exists() ? { id: friendId, ...friendSnap.data() } : null;
            }));
            setFriends(friendsData.filter(Boolean));
            setInvites(userData.groupsInvitedTo);
        }
    };

    const removeFriend = async (friendId) => {
        Alert.alert("Remove Friend", "Are you sure you want to remove this friend?", [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: "Remove",
                onPress: async () => {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    try {
                        await updateDoc(userRef, {
                            friends: arrayRemove(friendId)
                        });
                        setFriends(prev => prev.filter(f => f.id !== friendId));
                        Alert.alert("Success", "Friend removed successfully.");
                    } catch (error) {
                        Alert.alert("Error", "Failed to remove friend. Please try again later.");
                    }
                }
            }
        ]);
    };

    const addFriend = async () => {
        if (!newFriendId.trim()) {
            Alert.alert("Error", "Please enter a valid friend ID.");
            return;
        }
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
            await updateDoc(userRef, {
                friends: arrayUnion(newFriendId)
            });
            setNewFriendId('');
            fetchFriendsAndInvites();  // Refresh the friend list
            Alert.alert("Success", "Friend added successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to add friend. Please try again later.");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Friends</Text>
            <TextInput
                style={styles.input}
                onChangeText={setNewFriendId}
                value={newFriendId}
                placeholder="Enter friend's ID"
            />
            <Button title="Add Friend" onPress={addFriend} />
            <FlatList
                data={friends}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.friendItem}>
                        <Text style={styles.friendName}>{item.username}</Text>
                        <Button title="Remove" onPress={() => removeFriend(item.id)} />
                        <Text style={styles.sectionTitle}>Groups:</Text>
                        <FlatList
                            data={item.groups}
                            keyExtractor={group => group}
                            renderItem={({ item: groupId }) => (
                                <TouchableOpacity onPress={() => navigation.navigate('GroupDetails', { groupId })}>
                                    <Text style={styles.groupLink}>{groupId}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            />
            <Text style={styles.title}>Invitations</Text>
            <FlatList
                data={invites}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                    <Text style={styles.inviteItem}>{item}</Text>
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
        padding: 10,
        backgroundColor: '#f9f9f9',
        marginTop: 5,
    }
});

export default FriendsScreen;
