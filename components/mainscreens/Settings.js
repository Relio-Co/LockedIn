import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Switch, ScrollView, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { sendEmailVerification, deleteUser } from 'firebase/auth';

function SettingsScreen() {
  const [settings, setSettings] = useState({
    email: '',
    pushNotifications: false,
    emailNotifications: false,
    privateAccount: false,
  });

  // Fetch user settings from Firestore
  useEffect(() => {
    async function fetchSettings() {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    }
    fetchSettings();
  }, []);

  // Function to update user settings in Firestore
  const saveSettings = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, settings);
    alert('Settings updated successfully!');
  };

  // Function to send user data via email
  const handleDownloadData = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Placeholder for sending email with user data
    alert('User data will be sent to your email.');
  };

  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteUser(auth.currentUser);
              alert('Account deleted successfully.');
            } catch (error) {
              alert('Error deleting account: ' + error.message);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={settings.email}
          onChangeText={(text) => setSettings(prev => ({ ...prev, email: text }))}
          editable={false}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Push Notifications</Text>
        <Switch
          style={styles.switch}
          onValueChange={() => setSettings(prev => ({ ...prev, pushNotifications: !prev.pushNotifications }))}
          value={settings.pushNotifications}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Email Notifications</Text>
        <Switch
          style={styles.switch}
          onValueChange={() => setSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
          value={settings.emailNotifications}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Private Account</Text>
        <Switch
          style={styles.switch}
          onValueChange={() => setSettings(prev => ({ ...prev, privateAccount: !prev.privateAccount }))}
          value={settings.privateAccount}
        />
      </View>
      <View style={styles.section}>
        <Button title="Save Settings" onPress={saveSettings} color="#1E90FF" />
      </View>
      <View style={styles.section}>
        <Button title="Download My Data" onPress={handleDownloadData} color="#1E90FF" />
      </View>
      <View style={styles.section}>
        <Button title="Delete Account" onPress={handleDeleteAccount} color="red" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#fff',
    padding: 10,
    borderRadius: 5,
    color: '#fff',
    backgroundColor: '#1c1c1e',
  },
  switch: {
    alignSelf: 'flex-start',
  },
});

export default SettingsScreen;
