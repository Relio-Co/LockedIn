import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { auth, db, rtdb } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

const GroupChatScreen = ({ route }) => {
  const { groupId } = route.params;
  const [messages, setMessages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    const fetchGroupInfo = async () => {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        setGroupName(groupSnap.data().name);
      }
    };

    const fetchUserProfile = async () => {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
      }
    };

    fetchGroupInfo();
    fetchUserProfile();

    const messagesRef = ref(rtdb, `groupChats/${groupId}/messages`);
    onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val();
      const parsedMessages = messagesData
        ? Object.keys(messagesData).map(key => ({ ...messagesData[key], _id: key }))
        : [];
      setMessages(parsedMessages.reverse());
    });

  }, [groupId]);

  const onSend = async () => {
    if (newMessage.trim() === '') return;

    const message = {
      text: newMessage,
      createdAt: serverTimestamp(),
      user: {
        _id: auth.currentUser.uid,
        username: userProfile.username,
        avatar: userProfile.profilePicture,
      },
    };

    try {
      const messagesRef = ref(rtdb, `groupChats/${groupId}/messages`);
      await push(messagesRef, message);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const renderItem = ({ item }) => {
    const isCurrentUser = item.user._id === auth.currentUser.uid;
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

  if (!userProfile) {
    return <View style={styles.loading}><Text>Loading...</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.headerContainer}>
        <Text style={styles.groupName}>{groupName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GroupMembers', { groupId })}>
          <Icon name="users" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={item => item._id}
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

export default GroupChatScreen;
