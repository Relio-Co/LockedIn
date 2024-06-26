import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, getDocs, where } from 'firebase/firestore';
import { Image } from 'expo-image';

function GroupMembersScreen({ route }) {
    const { groupId } = route.params;
    const [members, setMembers] = useState([]);
    const [username, setUsername] = useState('');
    const [friends, setFriends] = useState([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [userFriendsIds, setUserFriendsIds] = useState([]);

    useEffect(() => {
        fetchMembers();
        fetchFriends();
    }, [groupId]);

    const fetchMembers = async () => {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
            const groupData = groupSnap.data();
            const membersIds = groupData.members;
            const membersData = await Promise.all(membersIds.map(async memberId => {
                const userRef = doc(db, 'users', memberId);
                const userSnap = await getDoc(userRef);
                return { id: memberId, ...userSnap.data(), isAdmin: groupData.admins.includes(memberId) };
            }));
            setMembers(membersData);
            setIsPrivate(groupData.private);
        }
    };

    const fetchFriends = async () => {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const friendIds = userSnap.data().friends || [];
            setUserFriendsIds(friendIds);
            const friendQueries = friendIds.map((friendId) => getDoc(doc(db, 'users', friendId)));
            const friendSnaps = await Promise.all(friendQueries);
            const friendsData = friendSnaps.map((snap) => ({ id: snap.id, ...snap.data() }));
            setFriends(friendsData);
        }
    };

    const handleAdminToggle = async (memberId) => {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.data().admins.includes(memberId)) {
            await updateDoc(groupRef, { admins: arrayRemove(memberId) });
        } else {
            await updateDoc(groupRef, { admins: arrayUnion(memberId) });
        }
        fetchMembers();
    };

    const handleRemoveMember = async (memberId) => {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, { members: arrayRemove(memberId) });
        fetchMembers();
    };

    const handleInviteUser = async () => {
        if (isPrivate) {
            Alert.alert("Error", "Cannot invite users to a private group.");
            return;
        }
        if (username === auth.currentUser.displayName) {
            Alert.alert("Error", "You cannot invite yourself.");
            return;
        }
        const userQuery = query(collection(db, "users"), where("username", "==", username));
        const querySnapshot = await getDocs(userQuery);
        if (!querySnapshot.empty) {
            const userId = querySnapshot.docs[0].id;
            await updateDoc(doc(db, 'users', userId), {
                groupsInvitedTo: arrayUnion(groupId)
            });
            Alert.alert("Invitation sent!");
            setUsername('');
        } else {
            Alert.alert("No user found with that username.");
        }
    };

    const handleInviteFriendToGroup = async (friendId) => {
        if (isPrivate) {
            Alert.alert("Error", "Cannot invite users to a private group.");
            return;
        }
        if (friendId === auth.currentUser.uid) {
            Alert.alert("Error", "You cannot invite yourself.");
            return;
        }
        await updateDoc(doc(db, 'users', friendId), {
            groupsInvitedTo: arrayUnion(groupId)
        });
        Alert.alert("Friend invited to the group.");
    };

    const handleAddFriend = async (memberId) => {
        if (memberId === auth.currentUser.uid) {
            Alert.alert("Error", "You cannot add yourself as a friend.");
            return;
        }
        const currentUserRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(currentUserRef, {
            friends: arrayUnion(memberId)
        });
        fetchFriends();
        Alert.alert("Success", "Friend added successfully.");
    };

    const renderMemberItem = ({ item }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.profilePicture }} style={styles.profilePic} />
            <Text style={styles.username}>{item.username} {item.isAdmin ? '(Admin)' : ''}</Text>
            <TouchableOpacity style={styles.adminButton} onPress={() => handleAdminToggle(item.id)}>
                <Text style={styles.buttonText}>{item.isAdmin ? 'Remove Admin' : 'Make Admin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveMember(item.id)}>
                <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
            {item.id !== auth.currentUser.uid && !userFriendsIds.includes(item.id) && (
                <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item.id)}>
                    <Text style={styles.buttonText}>Add Friend</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderFriendItem = ({ item }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.profilePicture }} style={styles.profilePic} />
            <Text style={styles.username}>{item.username}</Text>
            {item.id !== auth.currentUser.uid && (
                <TouchableOpacity style={styles.inviteButton} onPress={() => handleInviteFriendToGroup(item.id)}>
                    <Text style={styles.buttonText}>Invite</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Invite by username"
                placeholderTextColor="#ccc"
                value={username}
                onChangeText={setUsername}
                onSubmitEditing={handleInviteUser}
            />
            <TouchableOpacity style={styles.inviteButton} onPress={handleInviteUser}>
                <Text style={styles.buttonText}>Send Invite</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Members</Text>
            <FlatList
                data={members}
                keyExtractor={item => item.id}
                renderItem={renderMemberItem}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
            />
            <Text style={styles.sectionTitle}>Friends</Text>
            <FlatList
                data={friends}
                keyExtractor={item => item.id}
                renderItem={renderFriendItem}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
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
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 10,
        color: 'white',
        backgroundColor: '#191919',
        marginBottom: 20,
        fontSize: 16,
    },
    inviteButton: {
        padding: 10,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 10,
        backgroundColor: '#333',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    card: {
        flex: 1,
        backgroundColor: '#232323',
        padding: 10,
        margin: 5,
        borderRadius: 10,
        alignItems: 'center',
    },
    profilePic: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 10,
    },
    username: {
        color: 'white',
        fontSize: 16,
        marginBottom: 10,
    },
    adminButton: {
        padding: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#333',
        marginBottom: 5,
    },
    removeButton: {
        padding: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#333',
    },
    addButton: {
        padding: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#333',
        marginTop: 5,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
});

export default GroupMembersScreen;
