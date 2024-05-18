import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { storage, db, auth } from '../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, addDoc, collection, query, getDoc, getDocs, where, updateDoc, arrayUnion } from 'firebase/firestore';
import RNPickerSelect from 'react-native-picker-select';

function PostScreen({ route }) {
  const { groupId } = route.params || {};
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(groupId || null);

  useEffect(() => {
    const fetchGroups = async () => {
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
    };
    fetchGroups();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPermissionResult = await ImagePicker.requestCameraPermissionsAsync();
  
    if (!permissionResult.granted || !cameraPermissionResult.granted) {
      Alert.alert("Permission required", "You need to allow access to your photos and camera to upload an image.");
      return;
    }
  
    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Camera Roll",
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });
  
            if (result.cancelled) {
              setImage(null);
              return;
            }
  
            const manipResult = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 800, height: 600 } }], { compress: 0.1, format: SaveFormat.JPEG });
            setImage(manipResult.uri);
          }
        },
        {
          text: "Take Photo",
          onPress: async () => {
            let result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });
  
            if (result.cancelled) {
              setImage(null);
              return;
            }
  
            const manipResult = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 800, height: 600 } }], { compress: 0.1, format: SaveFormat.JPEG });
            setImage(manipResult.uri);
          }
        },
        { text: "Cancel", style: "cancel" }
      ],
      { cancelable: true }
    );
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
        <TouchableOpacity style={styles.profilePictureButton} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.profilePicture} />
          ) : (
            <Text style={styles.buttonText}>Pick an image</Text>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Write a caption..."
          placeholderTextColor="#ccc"
          value={caption}
          onChangeText={setCaption}
          multiline
        />
        <RNPickerSelect
          onValueChange={(value) => setSelectedGroup(value)}
          items={groups.map(group => ({ label: group.name, value: group.id }))}
          style={pickerSelectStyles}
          value={selectedGroup}
          useNativeAndroidPickerStyle={false}
          placeholder={{ label: "Select a group...", value: null }}
        />
        <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={uploading}>
          <Text style={styles.buttonText}>Upload Post</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  profilePictureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#232323',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  input: {
    width: '100%',
    minHeight: 100,
    padding: 15,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    color: 'white',
    backgroundColor: '#191919',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#00b4d8',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 4,
    color: 'white',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    color: 'white',
    paddingRight: 30,
  },
});

export default PostScreen;
