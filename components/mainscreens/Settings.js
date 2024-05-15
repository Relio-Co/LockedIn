import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Switch, ScrollView, StyleSheet } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

function SettingsScreen() {
  const [settings, setSettings] = useState({
    email: '',
    password: '',
    pushNotifications: false,
    emailNotifications: false,
    defaultGroup: '',
    uploadQuality: '',
    uploadFormat: '',
    groupNotifications: false,
    units: '',
    dateFormat: '',
    firstDayOfWeek: '',
    privateAccount: false,
    blockedUsers: [],
    termsOfService: '',
    privacyPolicy: '',
    helpAndFAQs: ''
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={settings.email}
          onChangeText={(text) => setSettings(prev => ({ ...prev, email: text }))}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={settings.password}
          secureTextEntry
          onChangeText={(text) => setSettings(prev => ({ ...prev, password: text }))}
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
        <Text style={styles.label}>Default Group</Text>
        <TextInput
          style={styles.input}
          value={settings.defaultGroup}
          onChangeText={(text) => setSettings(prev => ({ ...prev, defaultGroup: text }))}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Upload Quality</Text>
        <TextInput
          style={styles.input}
          value={settings.uploadQuality}
          onChangeText={(text) => setSettings(prev => ({ ...prev, uploadQuality: text }))}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Upload Format</Text>
        <TextInput
          style={styles.input}
          value={settings.uploadFormat}
          onChangeText={(text) => setSettings(prev => ({ ...prev, uploadFormat: text }))}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Group Notifications</Text>
        <Switch
          style={styles.switch}
          onValueChange={() => setSettings(prev => ({ ...prev, groupNotifications: !prev.groupNotifications }))}
          value={settings.groupNotifications}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Units</Text>
        <TextInput
          style={styles.input}
          value={settings.units}
          onChangeText={(text) => setSettings(prev => ({ ...prev, units: text }))}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Date and Time Format</Text>
        <TextInput
          style={styles.input}
          value={settings.dateFormat}
          onChangeText={(text) => setSettings(prev => ({ ...prev, dateFormat: text }))}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>First Day of the Week</Text>
        <TextInput
          style={styles.input}
          value={settings.firstDayOfWeek}
          onChangeText={(text) => setSettings(prev => ({ ...prev, firstDayOfWeek: text }))}
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
