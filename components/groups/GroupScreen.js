// this page loads the groups the user is part of

// TODO: load the user's group invites as well

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadGroupsFromStorage();
    fetchPublicGroups();
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
    const publicGroupsQuery = query(collection(db, "groups"), where("isPublic", "==", true));
    const querySnapshot = await getDocs(publicGroupsQuery);
    const publicGroupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPublicGroups(publicGroupsData);
  };

  const getMemberCount = (members) => members ? members.length : '0';

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Your Groups</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchGroups} />
        }
      />
      <Text style={styles.sectionHeaderText}>Challenges</Text>
      <FlatList
        data={publicGroups}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}>
            <Image source={{ uri: item.image || 'https://via.placeholder.com/50' }} style={styles.profilePic} />
            <Text style={styles.listItemText}>{item.name} - {getMemberCount(item.members)} members</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
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
    color: '#333',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 10, // Slightly rounded corners
    marginRight: 10,
  },
  listItemText: {
    fontSize: 18,
    color: '#333',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default GroupsScreen;
