import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
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

        await updateDoc(currentUserRef, {
            friends: arrayUnion(request.from),
            friendRequests: arrayRemove(request),
        });
        await updateDoc(friendUserRef, {
            friends: arrayUnion(auth.currentUser.uid),
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

        await updateDoc(currentUserRef, {
            groups: arrayUnion(groupId),
            groupsInvitedTo: arrayRemove(groupId),
        });
        await updateDoc(groupRef, {
            members: arrayUnion(auth.currentUser.uid),
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
