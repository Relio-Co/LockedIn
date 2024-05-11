import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TextInput, Alert, StyleSheet } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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
        value={username}
        onChangeText={setUsername}
        onSubmitEditing={handleInviteUser}
      />
      <Button title="Send Invite" onPress={handleInviteUser} />
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <Text>{item.username} {item.isAdmin ? '(Admin)' : ''}</Text>
            <Button title="Toggle Admin" onPress={() => handleAdminToggle(item.id)} />
            <Button title="Remove" onPress={() => handleRemoveMember(item.id)} />
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
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc'
  }
});

export default GroupMembersScreen;
