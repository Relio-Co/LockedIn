import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image, Alert, TextInput } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const groupIds = docSnap.data().groups || [];
        const groupsQuery = await Promise.all(groupIds.map(groupId => getDoc(doc(db, 'groups', groupId))));
        const groupsData = groupsQuery.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setGroups(groupsData);
        setAllGroups(groupsData.concat(publicGroups));
        await AsyncStorage.setItem('userGroups', JSON.stringify(groupsData));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch groups');
    }
    setRefreshing(false);
  };

  const fetchPublicGroups = async () => {
    try {
      const publicGroupsQuery = query(collection(db, 'groups'), where('public', '==', true));
      const querySnapshot = await getDocs(publicGroupsQuery);
      const publicGroupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPublicGroups(publicGroupsData);
      setAllGroups(groups.concat(publicGroupsData));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch public groups');
    }
  };

  const fetchInvites = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const groupInvites = docSnap.data().groupsInvitedTo || [];
        const invitesQuery = await Promise.all(groupInvites.map(groupId => getDoc(doc(db, 'groups', groupId))));
        const invitesData = invitesQuery.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setInvites(invitesData);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch group invites');
    }
  };

  const getMemberCount = (members) => members ? members.length : '0';

  const handleJoinGroup = async (groupId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const groupRef = doc(db, 'groups', groupId);

      await updateDoc(userRef, {
        groups: arrayUnion(groupId)
      });

      await updateDoc(groupRef, {
        members: arrayUnion(auth.currentUser.uid)
      });

      fetchGroups();
      Alert.alert('Success', 'You have joined the group.');
    } catch (error) {
      Alert.alert('Error', 'Failed to join the group');
    }
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === '') {
      setAllGroups(groups.concat(publicGroups));
    } else {
      const filteredGroups = allGroups.filter(group =>
        group.name.toLowerCase().includes(text.toLowerCase())
      );
      setAllGroups(filteredGroups);
    }
  };

  const isMember = (groupId) => {
    return groups.some(group => group.id === groupId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Feed')} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="white" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Groups</Text>
        <TouchableOpacity onPress={handleCreateGroup} style={styles.createButton}>
          <Icon name="plus" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.searchBox}
        placeholder="Search Groups"
        placeholderTextColor="grey"
        value={searchQuery}
        onChangeText={handleSearch}
      />
      <FlatList
        data={[...groups, ...publicGroups.filter(group => !isMember(group.id))]}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, isMember(item.id) && styles.memberCard]}
            onPress={isMember(item.id) ? () => navigation.navigate('GroupDetails', { groupId: item.id }) : null}
          >
            <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={styles.cardImage} />
            <Text style={styles.cardText}>{item.name}</Text>
            <Text style={styles.cardText}>{getMemberCount(item.members)} members</Text>
            {!isMember(item.id) && (
              <TouchableOpacity style={styles.cardButton} onPress={() => handleJoinGroup(item.id)}>
                <Icon name="sign-in" size={20} color="white" />
                <Text style={styles.cardButtonText}>Join</Text>
              </TouchableOpacity>
            )}
            {isMember(item.id) && <Icon name="lock" size={20} color="white" style={styles.lockIcon} />}
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>All Groups</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchGroups} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E90FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  createButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  searchBox: {
    backgroundColor: '#333',
    color: 'white',
    padding: 10,
    margin: 20,
    borderRadius: 5,
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
  card: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 20,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCard: {
    backgroundColor: '#1E90FF',
  },
  cardImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    padding: 5,
    borderRadius: 5,
    margin: 5,
    justifyContent: 'center',
  },
  cardButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  lockIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default GroupsScreen;
