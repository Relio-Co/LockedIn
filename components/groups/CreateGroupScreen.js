import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome';

const CreateGroupScreen = ({ navigation }) => {
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
        members: [auth.currentUser.uid],
        streak: 0,
        type: 'chill', // Default type set to chill, can be updated based on user input
      };

      const docRef = await addDoc(collection(db, 'groups'), newGroup);

      // Add the group to the user's list of groups in their profile
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        groups: arrayUnion(docRef.id)
      });

      Alert.alert('Success', 'Group created successfully!');
      navigation.goBack(); // Navigate back to the previous screen after group creation
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Create a Group</Text>
          <Text style={styles.headerSubtitle}>Enter group name and description below.</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.inputContainer}>
          <Text style={styles.pickerLabel}>Name:</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            autoCapitalize="words"
            placeholder="Group Name"
            placeholderTextColor="#7e7e7e"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.inputContainer}>
          <Text style={styles.pickerLabel}>Description:</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={groupDesc}
            onChangeText={setGroupDesc}
            multiline
            numberOfLines={4}
            placeholder="Group Description"
            placeholderTextColor="#7e7e7e"
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
              <Text style={styles.optionCardTitle}>{isPublic ? 'Public Group' : 'Private Group'}</Text>
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
            onPress={() => navigation.goBack()}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 50,
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
  inputContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#7e7e7e',
    padding: 10,
    borderRadius: 10,
    color: 'white',
    backgroundColor: '#191919',
    fontSize: 18,
  },
  pickerContainer: {
    marginBottom: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232323',
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
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  footerCard: {
    flexDirection: 'row',
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
    backgroundColor: '#232323',
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 18,
  },
  saveButton: {
    backgroundColor: 'white',
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'black',
    fontSize: 18,
  },
});

export default CreateGroupScreen;
