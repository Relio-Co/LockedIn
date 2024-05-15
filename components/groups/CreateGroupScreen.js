/* [AI Doc Review] This React Native file implements a screen for creating a new group, allowing the user to input the group name and description, select whether the group is public or private, and then create the group by calling Firebase's Firestore database. */
/* [AI Bug Review] The bug is that the `handleCreateGroup` function is defined inside the `CreateGroupScreen` component, which means it will be re-created every time the component updates, and its state will not be preserved. To fix this, you should define the function outside the component, so that it's only created once when the component is initialized.*/
 import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
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
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Create a Group</Text>
        <Text style={styles.headerSubtitle}>Enter group name and description below.</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Name:</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Description:</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          value={groupDesc}
          onChangeText={setGroupDesc}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Privacy:</Text>
        <TouchableOpacity
          style={[styles.optionCard, isPublic ? styles.selectedOptionCard : null]}
          onPress={() => setIsPublic(!isPublic)}
        >
          <View style={styles.optionCardContent}>
            <Text style={styles.optionCardTitle}>{isPublic ? "Public Group" : "Private Group"}</Text>
          </View>
          <View style={styles.radioOuterCircle}>
            {isPublic && <View style={styles.radioInnerCircle} />}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.footerCard}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => { }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleCreateGroup}
        >
          <Text style={styles.saveButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  headerCard: {
    marginBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  headerSubtitle: {
    color: 'grey',
    fontSize: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
    marginVertical: 20,
  },
  pickerContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  dropdownContainer: {
    height: 40,
  },
  dropdown: {
    backgroundColor: 'black',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 10,
  },
  dropdownItem: {
    justifyContent: 'flex-start',
  },
  dropdownMenu: {
    backgroundColor: 'black',
    borderWidth: 0,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232323",
    backgroundColor: 'black',
    marginBottom: 10,
  },
  selectedOptionCard: {
    borderColor: '#424242',
  },
  optionCardContent: {
    flex: 1,
  },
  optionCardTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  optionCardDescription: {
    color: '#7e7e7e',
  },
  radioOuterCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#424242',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerCircle: {
    height: 8,
    width: 8,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  footerCard: {
    flexDirection: "row",
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 15,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: "#232323",
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: 'white',
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'black',
  },
});

export default CreateGroupScreen;