import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { Image } from 'expo-image';

function NotificationsScreen() {
    const [friendInvites, setFriendInvites] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchInvites();
    }, []);

    const fetchInvites = async () => {
        setLoading(true);
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const friendInvitesData = userData.friendRequests || [];
            const groupInvitesData = userData.groupsInvitedTo || [];

            setFriendInvites(friendInvitesData);
            setGroupInvites(groupInvitesData);
        }
        setLoading(false);
    };

    const handleAcceptFriendRequest = async (request) => {
        const currentUserRef = doc(db, 'users', auth.currentUser.uid);
        const friendUserRef = doc(db, 'users', request.from);

        // Update the friends subcollection for both users
        await addDoc(collection(currentUserRef, 'friends'), {
            friend_user_id: request.from,
            friend_since: new Date(),
        });
        await addDoc(collection(friendUserRef, 'friends'), {
            friend_user_id: auth.currentUser.uid,
            friend_since: new Date(),
        });

        // Remove the friend request
        await updateDoc(currentUserRef, {
            friendRequests: arrayRemove(request),
        });

        fetchInvites();
        Alert.alert('Success', 'Friend request accepted.');
    };

    const handleDenyFriendRequest = async (request) => {
        const currentUserRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(currentUserRef, {
            friendRequests: arrayRemove(request),
        });

        fetchInvites();
        Alert.alert('Success', 'Friend request denied.');
    };

    const handleAcceptGroupInvite = async (groupId) => {
        const currentUserRef = doc(db, 'users', auth.currentUser.uid);
        const groupRef = doc(db, 'groups', groupId);

        // Update the groups subcollection for the user and the members subcollection for the group
        await addDoc(collection(currentUserRef, 'groups'), {
            group_id: groupId,
            role: 'member',
            joined_at: new Date(),
        });
        await addDoc(collection(groupRef, 'members'), {
            user_id: auth.currentUser.uid,
            role: 'member',
            joined_at: new Date(),
        });

        // Remove the group invite
        await updateDoc(currentUserRef, {
            groupsInvitedTo: arrayRemove(groupId),
        });

        fetchInvites();
        Alert.alert('Success', 'Group invite accepted.');
    };

    const handleDenyGroupInvite = async (groupId) => {
        const currentUserRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(currentUserRef, {
            groupsInvitedTo: arrayRemove(groupId),
        });

        fetchInvites();
        Alert.alert('Success', 'Group invite denied.');
    };

    const renderFriendInviteItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.username}>{item.username}</Text>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptFriendRequest(item)}>
                <Text style={styles.buttonText}>✔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.denyButton} onPress={() => handleDenyFriendRequest(item)}>
                <Text style={styles.buttonText}>✘</Text>
            </TouchableOpacity>
        </View>
    );

    const renderGroupInviteItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.username}>{item}</Text>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptGroupInvite(item)}>
                <Text style={styles.buttonText}>✔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.denyButton} onPress={() => handleDenyGroupInvite(item)}>
                <Text style={styles.buttonText}>✘</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notifications</Text>
            {loading && <Text style={styles.loadingText}>Loading...</Text>}
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            <FlatList
                data={friendInvites}
                keyExtractor={(item) => item.from}
                renderItem={renderFriendInviteItem}
            />
            <Text style={styles.sectionTitle}>Group Invites</Text>
            <FlatList
                data={groupInvites}
                keyExtractor={(item) => item}
                renderItem={renderGroupInviteItem}
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
        color: 'white',
        marginBottom: 20,
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#232323',
        padding: 10,
        marginVertical: 5,
        borderRadius: 10,
    },
    username: {
        color: 'white',
        fontSize: 16,
    },
    acceptButton: {
        padding: 10,
        borderRadius: 5,
        backgroundColor: 'green',
        marginRight: 10,
    },
    denyButton: {
        padding: 10,
        borderRadius: 5,
        backgroundColor: 'red',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
});

export default NotificationsScreen;
