import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Picker } from '@react-native-picker/picker';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs, where, doc, getDoc, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../../firebaseConfig';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

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

            if (result.canceled) {
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

            if (result.canceled) {
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
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedGroup}
            onValueChange={(itemValue) => setSelectedGroup(itemValue)}
            style={styles.picker}
          >
            {groups.map((group) => (
              <Picker.Item key={group.id} label={group.name} value={group.id} />
            ))}
          </Picker>
        </View>
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
    padding: 20,
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
  pickerContainer: {
    width: '100%',
    backgroundColor: '#191919',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
    color: 'white',
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

export default PostScreen;
