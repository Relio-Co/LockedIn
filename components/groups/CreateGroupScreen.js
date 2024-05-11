import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';

function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !groupDesc.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      // Create the new group with the current user as the admin
      const newGroup = {
        name: groupName,
        description: groupDesc,
        public: isPublic,
        admins: [auth.currentUser.uid],
        members: [auth.currentUser.uid]
      };

      const docRef = await addDoc(collection(db, "groups"), newGroup);

      // Add the group to the user's list of groups in their profile
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        groups: arrayUnion(docRef.id)
      });

      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert('Error', 'Failed to create group.');
    }
  };

  return (
    <View style={styles.container}>
      <Text>Name:</Text>
      <TextInput
        style={styles.input}
        value={groupName}
        onChangeText={setGroupName}
        autoCapitalize="words"
      />
      <Text>Description:</Text>
      <TextInput
        style={styles.input}
        value={groupDesc}
        onChangeText={setGroupDesc}
        multiline
        numberOfLines={4}
      />
      <Button
        title={isPublic ? "Public Group" : "Private Group"}
        onPress={() => setIsPublic(!isPublic)}
        color={isPublic ? "green" : "gray"}
      />
      <Button
        title="Create Group"
        onPress={handleCreateGroup}
        color="blue"
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
    borderRadius: 5,
  }
});

export default CreateGroupScreen;
