import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { auth, db, rtdb } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';

const GroupChatScreen = ({ route }) => {
  const { groupId } = route.params;
  const [messages, setMessages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [groupName, setGroupName] = useState('');
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
      const parsedMessages = messagesData ? Object.keys(messagesData).map(key => ({ ...messagesData[key], _id: key })) : [];
      setMessages(parsedMessages.reverse());
    });

  }, [groupId]);

  const onSend = useCallback((messages = []) => {
    const messagesRef = ref(rtdb, `groupChats/${groupId}/messages`);
    messages.forEach(message => {
      push(messagesRef, {
        ...message,
        createdAt: serverTimestamp(),
      });
    });
  }, [groupId]);

  if (!userProfile) {
    return <View style={styles.loading}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.groupName}>{groupName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GroupMembers', { groupId })}>
          <Icon name="users" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: auth.currentUser.uid,
          name: userProfile.username,
          avatar: userProfile.profilePicture,
        }}
        renderBubble={props => (
          <Bubble
            {...props}
            wrapperStyle={{
              right: { backgroundColor: '#0078fe' },
              left: { backgroundColor: '#333' },
            }}
            textStyle={{
              right: { color: '#fff' },
              left: { color: '#fff' },
            }}
          />
        )}
        renderInputToolbar={props => <InputToolbar {...props} containerStyle={styles.inputToolbar} />}
        renderAvatarOnTop
        renderAvatar={props => {
          return (
            <View style={styles.avatarContainer}>
              {props.currentMessage.user.avatar && (
                <Image
                  source={{ uri: props.currentMessage.user.avatar }}
                  style={styles.avatar}
                />
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
    paddingHorizontal: 10, // Added padding for edges
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
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  inputToolbar: {
    borderTopWidth: 1.5,
    borderTopColor: '#0078fe',
    backgroundColor: '#333',
  },
  avatarContainer: {
    marginLeft: -10, // Adjusts avatar position closer to the bubble
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  }
});

export default GroupChatScreen;
