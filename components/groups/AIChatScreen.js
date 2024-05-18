import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const AIChatScreen = ({ route }) => {
  const { coach } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const groupIds = userData.groups || [];
          const groupsData = await Promise.all(groupIds.map(async (groupId) => {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            return { id: groupSnap.id, ...groupSnap.data() };
          }));
          setUserProfile({ ...userData, groups: groupsData });
        }
      } catch (error) {
        console.error('Error fetching user profile: ', error);
        Alert.alert('Error', 'Failed to fetch user profile.');
      }
    };

    fetchUserProfile();
  }, []);

  const fetchResponse = async (message) => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer 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`
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are ${coach.name} as a life coach. You will help the user attend to any task and make sure he is accountable. Be short, sweet, and concise. Here is the user's data: ${JSON.stringify(userProfile)}`
            },
            {
              role: 'user',
              content: message,
            }
          ],
          model: 'llama3-8b-8192'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching AI response: ', error);
      Alert.alert('Error', 'Failed to fetch AI response. Please check your network connection and try again.');
      return null;
    }
  };

  const onSend = async () => {
    if (newMessage.trim() === '') return;

    const userMessage = {
      text: newMessage,
      createdAt: new Date().toISOString(),
      user: {
        _id: 'user',
        username: 'You',
        avatar: 'https://placekitten.com/200/200', // Placeholder avatar
      },
    };

    setMessages((prevMessages) => [userMessage, ...prevMessages]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const aiResponse = await fetchResponse(newMessage);
    if (aiResponse) {
      const aiMessage = {
        text: aiResponse,
        createdAt: new Date().toISOString(),
        user: {
          _id: 'ai',
          username: `${coach.name} - Life Coach`,
          avatar: coach.avatar, // Placeholder avatar
        },
      };

      setMessages((prevMessages) => [aiMessage, ...prevMessages]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setNewMessage('');
  };

  const renderItem = ({ item }) => {
    const isCurrentUser = item.user._id === 'user';
    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft]}>
        <Image style={styles.avatar} source={{ uri: item.user.avatar }} />
        <View style={[styles.bubble, isCurrentUser ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={styles.username}>{item.user.username}</Text>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.headerContainer}>
        <Text style={styles.groupName}>AI Chat with {coach.name}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.messagesContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#ccc"
        />
        <TouchableOpacity onPress={onSend}>
          <Icon name="paper-plane" size={24} color="#00b4d8" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  messagesContainer: {
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
  },
  bubbleRight: {
    backgroundColor: '#0078fe',
  },
  bubbleLeft: {
    backgroundColor: '#333',
  },
  username: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 50,
    marginVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    height: 60,
  },
  input: {
    flex: 1,
    color: 'white',
    paddingVertical: 15,
    fontSize: 18,
  },
});

export default AIChatScreen;
