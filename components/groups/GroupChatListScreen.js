import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { auth, db, rtdb } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref as sRef, get } from 'firebase/database';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

const GroupChatListScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allChats, setAllChats] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user profile: ", error);
        Alert.alert('Error', 'Failed to fetch user profile. Please try again.');
      }
    };

    const fetchChats = async () => {
      try {
        const groupChatsQuery = query(collection(db, 'groups'), where(`members.${auth.currentUser.uid}.role`, 'in', ['member', 'admin']));
        
        const groupChatsSnap = await getDocs(groupChatsQuery);

        const groupChatsData = groupChatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isGroupChat: true }));

        const updatedChats = await Promise.all(groupChatsData.map(async (chat) => {
          const messagesRef = sRef(rtdb, `groupChats/${chat.id}/messages`);
          try {
            const snapshot = await get(messagesRef);
            const messagesData = snapshot.val();
            if (messagesData) {
              const parsedMessages = Object.keys(messagesData).map(key => messagesData[key]);
              chat.lastMessage = parsedMessages[parsedMessages.length - 1];
            } else {
              chat.lastMessage = null;
            }
          } catch (error) {
            console.error(`Error fetching messages for chat ${chat.id}: `, error);
            chat.lastMessage = null;
          }
          return chat;
        }));

        setAllChats(updatedChats.sort((a, b) => (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0)));
      } catch (error) {
        console.error("Error fetching chats: ", error);
        Alert.alert('Error', 'Failed to fetch chats. Please try again.');
      }
    };

    fetchUserProfile();
    fetchChats();
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filteredChats = allChats.filter(chat => chat.name.toLowerCase().includes(text.toLowerCase()));
      setAllChats(filteredChats);
    } else {
      setAllChats(allChats.sort((a, b) => b.lastMessage?.createdAt - a.lastMessage?.createdAt));
    }
  };

  const handleMuteChat = async (chatId) => {
    try {
      const chatRef = doc(db, 'groups', chatId);
      await updateDoc(chatRef, { muted: true });
      Alert.alert('Muted', 'You have muted this chat.');
    } catch (error) {
      console.error("Error muting chat: ", error);
      Alert.alert('Error', 'Failed to mute chat. Please try again.');
    }
  };

  const handleLeaveChat = async (chatId) => {
    Alert.alert(
      "Leave Chat",
      "Are you sure you want to leave this chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const chatRef = doc(db, 'groups', chatId);
              await updateDoc(chatRef, { [`members.${auth.currentUser.uid}`]: arrayRemove(auth.currentUser.uid) });
              setAllChats(allChats.filter(chat => chat.id !== chatId));
              Alert.alert('Left Chat', 'You have left this chat.');
            } catch (error) {
              console.error("Error leaving chat: ", error);
              Alert.alert('Error', 'Failed to leave chat. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderChatItem = ({ item }) => {
    const isGroupChat = item.isGroupChat;
    return (
      <TouchableOpacity onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}>
        <View style={styles.chatContainer}>
          <Image style={styles.avatar} source={{ uri: item.profile_picture || 'https://via.placeholder.com/50' }} />
          <View style={styles.chatInfo}>
            <Text style={styles.chatName}>
              {item.name}
            </Text>
            <Text style={styles.lastMessage}>
              {item.lastMessage ? `${item.lastMessage.user.username}: ${item.lastMessage.text}` : 'No messages yet'}
            </Text>
          </View>
          <View style={styles.chatActions}>
            <TouchableOpacity onPress={() => handleMuteChat(item.id)}>
              <Icon name="volume-off" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLeaveChat(item.id)} style={styles.leaveButton}>
              <Icon name="sign-out" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!userProfile) {
    return <View style={styles.loading}><Text>Loading...</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search Chats"
          placeholderTextColor="#ccc"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      <TouchableOpacity style={styles.marketplaceButton} onPress={() => navigation.navigate('MarketplaceScreen')}>
        <Text style={styles.marketplaceButtonText}>Marketplace</Text>
      </TouchableOpacity>
      <FlatList
        data={allChats}
        keyExtractor={item => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatList}
      />
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  marketplaceButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginVertical: 10,
  },
  marketplaceButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chatList: {
    paddingBottom: 10,
  },
  chatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  lastMessage: {
    color: '#ccc',
    fontSize: 14,
  },
  chatActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaveButton: {
    marginLeft: 10,
  },
});

export default GroupChatListScreen;
