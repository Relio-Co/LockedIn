import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TextInput, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, getDocs, where } from 'firebase/firestore';

function GroupMembersScreen({ route }) {
  const { groupId } = route.params;
  const [members, setMembers] = useState([]);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const fetchMembers = async () => {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
      const membersIds = groupSnap.data().members;
      const membersData = await Promise.all(membersIds.map(async memberId => {
        const userRef = doc(db, 'users', memberId);
        const userSnap = await getDoc(userRef);
        return { id: memberId, username: userSnap.data().username, isAdmin: groupSnap.data().admins.includes(memberId) };
      }));
      setMembers(membersData);
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
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <Text style={styles.memberText}>{item.username} {item.isAdmin ? '(Admin)' : ''}</Text>
            <TouchableOpacity style={styles.adminButton} onPress={() => handleAdminToggle(item.id)}>
              <Text style={styles.buttonText}>{item.isAdmin ? 'Remove Admin' : 'Make Admin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveMember(item.id)}>
              <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    marginBottom: 10,
  },
  memberText: {
    color: 'white',
    fontSize: 16,
  },
  adminButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
    marginRight: 10,
  },
  removeButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
});

export default GroupMembersScreen;
