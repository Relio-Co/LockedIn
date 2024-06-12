import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Picker } from '@react-native-picker/picker';
import { storage, db, auth } from '../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, addDoc, collection, query, getDoc, getDocs, where, updateDoc, arrayUnion } from 'firebase/firestore';

function PostScreen({ route }) {
  const { groupId, image: initialImage } = route.params || {};
  const [image, setImage] = useState(initialImage || null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(groupId || null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const q = query(collection(db, "groups"), where("members", "array-contains", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          public: doc.data().public
        }));
        setGroups(groupsData);
        if (!selectedGroup && groupsData.length > 0 && !groupId) {
          setSelectedGroup(groupsData[0].id);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    fetchGroups();
  }, [selectedGroup, groupId]);

  useEffect(() => {
    takePhoto();
  }, []);

  const takePhoto = async () => {
    const cameraPermissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!cameraPermissionResult.granted) {
      Alert.alert("Permission required", "You need to allow access to your camera to take a photo.");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      setImage(null);
      return;
    }

    const manipResult = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 800, height: 600 } }], { compress: 0.1, format: SaveFormat.JPEG });
    setImage(manipResult.uri);
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert("Upload Error", "Please select an image to upload.");
      return;
    }

    setUploading(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error("User does not exist");
      }
      const username = userSnap.data().username;

      const response = await fetch(image);
      const blob = await response.blob();
      const fileRef = ref(storage, `posts/${Date.now()}`);

      await uploadBytes(fileRef, blob);
      const imageUrl = await getDownloadURL(fileRef);

      const newPost = {
        imageUrl,
        caption,
        createdBy: auth.currentUser.uid,
        createdByUsername: username,
        createdAt: new Date(),
        groupName: selectedGroup ? groups.find(g => g.id === selectedGroup).name : "No Group",
        groupId: selectedGroup,
        isPublic: selectedGroup ? groups.find(g => g.id === selectedGroup).public : true
      };

      const newPostRef = await addDoc(collection(db, 'posts'), newPost);

      if (selectedGroup) {
        await updateDoc(doc(db, 'groups', selectedGroup), {
          posts: arrayUnion(newPostRef.id)
        });
      }

      Alert.alert('Success', 'Post uploaded successfully!');
      setImage(null);
      setCaption('');
    } catch (error) {
      console.error("Error uploading post:", error);
      Alert.alert("Upload Error", error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.imageContainer} onPress={takePhoto}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <Text style={styles.imagePlaceholderText}>Tap to take a photo</Text>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Write a caption..."
          placeholderTextColor="#aaa"
          value={caption}
          onChangeText={setCaption}
          multiline
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedGroup}
            onValueChange={(itemValue) => setSelectedGroup(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {groups.map((group) => (
              <Picker.Item key={group.id} label={group.name} value={group.id} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity style={[styles.button, uploading && styles.buttonDisabled]} onPress={handleUpload} disabled={uploading}>
          <Text style={styles.buttonText}>Upload Post</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#2c2c2c',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderText: {
    color: '#aaa',
    fontSize: 18,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    minHeight: 100,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    color: '#fff',
    backgroundColor: '#2c2c2c',
    marginBottom: 20,
    fontSize: 16,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: '#2c2c2c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
    color: '#fff',
  },
  pickerItem: {
    color: '#fff',
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#007BFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PostScreen;
