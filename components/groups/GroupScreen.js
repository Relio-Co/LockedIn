import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadGroupsFromStorage();
    fetchPublicGroups();
    fetchInvites();
  }, []);

  const loadGroupsFromStorage = async () => {
    const storedGroups = await AsyncStorage.getItem('userGroups');
    if (storedGroups) {
      setGroups(JSON.parse(storedGroups));
    } else {
      fetchGroups();
    }
  };

  const fetchGroups = async () => {
    setRefreshing(true);
    const userRef = doc(db, "users", auth.currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const groupIds = docSnap.data().groups || [];
      const groupsQuery = await Promise.all(groupIds.map(groupId => getDoc(doc(db, "groups", groupId))));
      const groupsData = groupsQuery.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setGroups(groupsData);
      AsyncStorage.setItem('userGroups', JSON.stringify(groupsData));
    }
    setRefreshing(false);
  };

  const fetchPublicGroups = async () => {
    const publicGroupsQuery = query(collection(db, "groups"), where("public", "==", true));
    const querySnapshot = await getDocs(publicGroupsQuery);
    const publicGroupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPublicGroups(publicGroupsData);
  };

  const fetchInvites = async () => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const groupInvites = docSnap.data().groupsInvitedTo || [];
      const invitesQuery = await Promise.all(groupInvites.map(groupId => getDoc(doc(db, "groups", groupId))));
      const invitesData = invitesQuery.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setInvites(invitesData);
    }
  };

  const getMemberCount = (members) => members ? members.length : '0';

  const handleJoinGroup = async (groupId) => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const groupRef = doc(db, "groups", groupId);

    await updateDoc(userRef, {
      groups: arrayUnion(groupId)
    });

    await updateDoc(groupRef, {
      members: arrayUnion(auth.currentUser.uid)
    });

    fetchGroups();
    Alert.alert("Success", "You have joined the group.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('FeedScreen')} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="white" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Groups</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}>
            <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={styles.profilePic} />
            <Text style={styles.listItemText}>{item.name} - {getMemberCount(item.members)} members</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <>
            {invites.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Group Invites</Text>
                {invites.map(invite => (
                  <TouchableOpacity key={invite.id} style={styles.listItemContainer} onPress={() => navigation.navigate('GroupDetails', { groupId: invite.id })}>
                    <Image source={{ uri: invite.image || 'https://via.placeholder.com/50' }} style={styles.profilePic} />
                    <Text style={styles.listItemText}>{invite.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Your Groups</Text>
            </View>
          </>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchGroups} />
        }
      />
      <FlatList
        data={publicGroups}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItemContainer}>
            <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={styles.profilePic} />
            <View style={styles.publicGroupInfo}>
              <Text style={styles.listItemText}>{item.name} - {getMemberCount(item.members)} members</Text>
              <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinGroup(item.id)}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Public Groups</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'white',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'white',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 10,
  },
  listItemText: {
    fontSize: 18,
    color: 'white',
  },
  publicGroupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  joinButton: {
    backgroundColor: '#1E90FF',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default GroupsScreen;
