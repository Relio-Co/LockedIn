import React, { useState, useEffect } from 'react';

import { View, Button, TouchableOpacity, Image, Text, TextInput, StyleSheet, Alert } from 'react-native';

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

      // Set default group only if none selected and not directed from a group

      if (!selectedGroup && groupsData.length > 0 && !groupId) {

        setSelectedGroup(groupsData[0].id);

      }

    };

    fetchGroups();

  }, []);



  const pickImage = async () => {

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {

      Alert.alert("Permission required", "You need to allow access to your photos to upload an image.");

      return;

    }



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

      const username = userSnap.data().username;  // Assuming username is stored under the 'username' key

  

      const response = await fetch(image);

      const blob = await response.blob();

      const fileRef = ref(storage, `posts/${Date.now()}`);

  

      await uploadBytes(fileRef, blob);

      const imageUrl = await getDownloadURL(fileRef);

  

      const newPost = {

        imageUrl,

        caption,

        createdBy: auth.currentUser.uid,

        createdByUsername: username, // Now correctly using the fetched username

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

    <View style={styles.container}>

      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>

        <Text style={styles.buttonText}>Pick an image from camera roll</Text>

      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.image} />}

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

      <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>

        <Text style={styles.buttonText}>Upload Post</Text>

      </TouchableOpacity>

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    padding: 20,

    backgroundColor: '#000', // Dark theme background

  },

  image: {

    width: 300,

    height: 300,

    borderRadius: 10,

    marginBottom: 20,

  },

  input: {

    width: '90%',

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

  imagePickerButton: {

    marginBottom: 20,

    padding: 10,

    borderWidth: 2,

    borderColor: '#fff',

    borderRadius: 10,

    backgroundColor: '#333',

  },

  uploadButton: {

    padding: 10,

    borderWidth: 2,

    borderColor: '#fff',

    borderRadius: 10,

    backgroundColor: '#333',

  },

  buttonText: {

    color: 'white',

    fontSize: 16,

  }

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

