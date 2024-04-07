import React, { useState } from 'react';
import { Button, TextInput, View, StyleSheet, Alert, Image, TouchableOpacity, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const api = axios.create({
  baseURL: `https://${process.env.EXPO_PUBLIC_API_LOGIN_API}`,
});

const AddChallenge = ({ navigation }) => {
  const [challengeTitle, setChallengeTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const pickImageAsync = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const createAndUploadChallenge = async () => {
    if (!selectedImage) {
      alert('Please select an image for the challenge.');
      return;
    }

    const filename = selectedImage.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    console.log('Selected Image URI:', selectedImage); // Debug log
    console.log('Filename:', filename); // Debug log

    const formData = new FormData();
    formData.append('title', challengeTitle);
    formData.append('email', 'user@example.com'); // This should be the logged-in user's email
    formData.append('image', {
      uri: selectedImage,
      name: filename,
      type,
    });

    try {
      const response = await api.post('/create_challenge', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Server Response:', response.data); // Debug log

      if (response.data.success) {
        Alert.alert('Success', 'Challenge created with image!');
        navigation.goBack();
      } else {
        alert('Failed to create challenge.');
      }
    } catch (error) {
      console.error('Error:', error); // Debug log
      alert('An error occurred while creating the challenge.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Create a New Challenge</Text>
      <TextInput
        style={styles.input}
        onChangeText={setChallengeTitle}
        value={challengeTitle}
        placeholder="Enter Challenge Title"
        placeholderTextColor="#7e7e7e"
      />
      <TouchableOpacity style={styles.button} onPress={pickImageAsync}>
        <Text style={styles.buttonText}>Pick an image</Text>
      </TouchableOpacity>
      {selectedImage && (
        <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
      )}
      <TouchableOpacity style={styles.button} onPress={createAndUploadChallenge}>
        <Text style={styles.buttonText}>Create Challenge</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#232323',
    padding: 10,
    width: '100%',
    color: 'white',
    borderRadius: 10,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 10,
  },
});

export default AddChallenge;
