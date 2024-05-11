import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Switch, ScrollView } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

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
        <ScrollView>
            <View>
                <Text>Email</Text>
                <TextInput value={settings.email} onChangeText={(text) => setSettings(prev => ({ ...prev, email: text }))} />
                <Text>Password</Text>
                <TextInput value={settings.password} secureTextEntry onChangeText={(text) => setSettings(prev => ({ ...prev, password: text }))} />
                <Text>Push Notifications</Text>
                <Switch onValueChange={() => setSettings(prev => ({ ...prev, pushNotifications: !prev.pushNotifications }))} value={settings.pushNotifications} />
                <Text>Email Notifications</Text>
                <Switch onValueChange={() => setSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))} value={settings.emailNotifications} />
                <Text>Default Group</Text>
                <TextInput value={settings.defaultGroup} onChangeText={(text) => setSettings(prev => ({ ...prev, defaultGroup: text }))} />
                <Text>Upload Quality</Text>
                <TextInput value={settings.uploadQuality} onChangeText={(text) => setSettings(prev => ({ ...prev, uploadQuality: text }))} />
                <Text>Upload Format</Text>
                <TextInput value={settings.uploadFormat} onChangeText={(text) => setSettings(prev => ({ ...prev, uploadFormat: text }))} />
                <Text>Group Notifications</Text>
                <Switch onValueChange={() => setSettings(prev => ({ ...prev, groupNotifications: !prev.groupNotifications }))} value={settings.groupNotifications} />
                <Text>Units</Text>
                <TextInput value={settings.units} onChangeText={(text) => setSettings(prev => ({ ...prev, units: text }))} />
                <Text>Date and Time Format</Text>
                <TextInput value={settings.dateFormat} onChangeText={(text) => setSettings(prev => ({ ...prev, dateFormat: text }))} />
                <Text>First Day of the Week</Text>
                <TextInput value={settings.firstDayOfWeek} onChangeText={(text) => setSettings(prev => ({ ...prev, firstDayOfWeek: text }))} />
                <Text>Private Account</Text>
                <Switch onValueChange={() => setSettings(prev => ({ ...prev, privateAccount: !prev.privateAccount }))} value={settings.privateAccount} />
                <Button title="Save Settings" onPress={saveSettings} />
            </View>
        </ScrollView>
    );
}

export default SettingsScreen;
