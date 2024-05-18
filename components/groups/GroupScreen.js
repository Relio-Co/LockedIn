import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleAddDefaultGroup = async (groupType, groupName) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        personalHabits: arrayUnion({ type: groupType, name: groupName })
      });
      Alert.alert('Success', `You have added ${groupName} to your personal habits.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add personal habit');
    }
  };

  const getMemberCount = (members) => members ? members.length : '0';

  const isMember = (groupId) => {
    return groups.some(group => group.id === groupId);
  };

  const renderGroupItem = ({ item }) => {
    const groupType = item.type || 'chill';
    const groupColor = groupType === 'habits' ? '#00b4d8' : groupType === 'challenges' ? '#ff8c00' : '#32cd32';
    const isDefault = item.isDefault || false;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: groupColor }]}
        onPress={isMember(item.id) ? () => navigation.navigate('GroupDetails', { groupId: item.id }) : null}
      >
        <Text style={styles.cardImage}>{item.groupIcon || '👥'}</Text>
        <Text style={styles.cardText}>#{item.name}</Text>
        <View style={styles.cardFooter}>
          <Icon name="user" size={20} color="white" />
          <Text style={styles.cardText}>{getMemberCount(item.members)}</Text>
        </View>
        {!isMember(item.id) && !isDefault && (
          <TouchableOpacity style={styles.cardButton} onPress={() => handleJoinGroup(item.id)}>
            <Icon name="lock" size={20} color="black" />
            <Text style={styles.cardButtonText}>Join</Text>
          </TouchableOpacity>
        )}
        {isDefault && (
          <TouchableOpacity style={styles.cardButton} onPress={() => handleAddDefaultGroup(groupType, item.name)}>
            <Icon name="plus" size={20} color="black" />
            <Text style={styles.cardButtonText}>Add</Text>
          </TouchableOpacity>
        )}
        {isMember(item.id) && (
          <TouchableOpacity style={styles.cardButton} onPress={() => handleLeaveGroup(item.id)}>
            <Icon name="sign-out" size={20} color="black" />
            <Text style={styles.cardButtonText}>Leave</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title, description, data) => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>{title}</Text>
        <Text style={styles.sectionHeaderDescription}>{description}</Text>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={renderGroupItem}
          key={(data.length % 2).toString()} // Changing key to force re-render
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBox}
        placeholder="Search Groups"
        placeholderTextColor="#ccc"
        value={searchQuery}
        onChangeText={handleSearch}
      />
      <TouchableOpacity style={styles.createGroupIcon} onPress={handleCreateGroup}>
        <Icon name="users" size={30} color="white" />
        <Icon name="plus" size={15} color="white" style={styles.plusIcon} />
      </TouchableOpacity>
      <FlatList
        data={[]}
        keyExtractor={(item) => item.id}
        renderItem={null}
        ListHeaderComponent={() => (
          <View>
            {renderSection(
              'Habits',
              'Habits are things you do everyday. Try adding a private habit to your profile.',
              allGroups.filter(group => group.type === 'habits')
            )}
            {renderSection(
              'Challenges',
              'Challenges are habits that have a goal or certain number of days. Try joining a group challenge.',
              allGroups.filter(group => group.type === 'challenges')
            )}
            {renderSection(
              'Chill',
              'Chill groups are regular accountability groups.',
              allGroups.filter(group => !group.type || group.type === 'chill')
            )}
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
  searchBox: {
    backgroundColor: '#191919',
    color: 'white',
    padding: 15,
    margin: 20,
    borderRadius: 50,
    fontSize: 18,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionHeaderDescription: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#ccc',
  },
  createGroupIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  plusIcon: {
    marginLeft: -10,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    padding: 20,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  cardImage: {
    fontSize: 50,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
    justifyContent: 'center',
  },
  cardButtonText: {
    color: 'black',
    marginLeft: 5,
  },
});

export default GroupsScreen;
