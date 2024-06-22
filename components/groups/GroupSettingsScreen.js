/* [AI Doc Review] This React Native file defines a `GroupSettingsScreen` component that allows users to edit the name, and public/private status of a group stored in Firebase Firestore, with the ability to save changes and display an alert upon success. */
/* [AI Bug Review] The bug or fault in the code is that the `onPress` property of the second `Button` component is not correctly defined, it should be `onPress={() => updateGroupSettings()}`.*/
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function GroupSettingsScreen({ route }) {
  const { groupId } = route.params;
  const [groupName, setGroupName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const fetchGroupSettings = async () => {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        setGroupName(groupData.name);
        setIsPublic(groupData.public);
      }
    };

    fetchGroupSettings();
  }, [groupId]);

  const updateGroupSettings = async () => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      name: groupName,
      public: isPublic
    });
    alert('Group settings updated successfully!');
  };

  return (
    <View style={styles.container}>
      <Text>Group Name:</Text>
      <TextInput
        style={styles.input}
        value={groupName}
        onChangeText={setGroupName}
      />
      <Button title={isPublic ? "Public" : "Private"} onPress={() => setIsPublic(!isPublic)} />
      <Button title="Update Settings" onPress={updateGroupSettings} />
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
  }
});

export default GroupSettingsScreen;
