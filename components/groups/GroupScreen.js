import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
    fetchAllGroups();
  }, []);

  const fetchAllGroups = async () => {
    setRefreshing(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      let userGroups = [];
      if (docSnap.exists()) {
        const groupIds = docSnap.data().groups || [];
        const groupsQuery = await Promise.all(groupIds.map(groupId => getDoc(doc(db, 'groups', groupId))));
        userGroups = groupsQuery.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setGroups(userGroups);
        await AsyncStorage.setItem('userGroups', JSON.stringify(userGroups));
      }

      const publicGroupsQuery = query(collection(db, 'groups'), where('public', '==', true));
      const querySnapshot = await getDocs(publicGroupsQuery);
      const publicGroupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setPublicGroups(publicGroupsData);
      setAllGroups([...userGroups, ...publicGroupsData.filter(pg => !userGroups.some(ug => ug.id === pg.id))]);

    } catch (error) {
      Alert.alert('Error', 'Failed to fetch groups');
    }
    setRefreshing(false);
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

      fetchAllGroups();
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
      setAllGroups([...groups, ...publicGroups]);
    } else {
      const filteredGroups = allGroups.filter(group =>
        group.name.toLowerCase().includes(text.toLowerCase())
      );
      setAllGroups(filteredGroups);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const groupRef = doc(db, 'groups', groupId);

      await updateDoc(userRef, {
        groups: arrayRemove(groupId)
      });

      await updateDoc(groupRef, {
        members: arrayRemove(auth.currentUser.uid)
      });

      fetchAllGroups();
      Alert.alert('Success', 'You have left the group.');
    } catch (error) {
      Alert.alert('Error', 'Failed to leave the group');
    }
  };

  const getMemberCount = (members) => members ? members.length : '0';

  const isMember = (groupId) => {
    return groups.some(group => group.id === groupId);
  };

  const renderGroupItem = ({ item }) => {
    const groupType = item.type || 'chill';
    const groupColor = groupType === 'habits' ? '#00b4d8' : groupType === 'challenges' ? '#ff8c00' : '#32cd32';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: groupColor, borderColor: isMember(item.id) ? 'gold' : 'transparent' }]}
        onPress={isMember(item.id) ? () => navigation.navigate('GroupDetails', { groupId: item.id }) : null}
      >
        <Text style={styles.cardImage}>{item.groupIcon || '👥'}</Text>
        <Text style={styles.cardText}>#{item.name}</Text>
        <View style={styles.cardFooter}>
          <Icon name="user" size={20} color="white" />
          <Text style={styles.cardText}>{getMemberCount(item.members)}</Text>
        </View>
        {!isMember(item.id) && (
          <TouchableOpacity style={styles.cardButton} onPress={() => handleJoinGroup(item.id)}>
            <Icon name="lock" size={20} color="black" />
            <Text style={styles.cardButtonText}>Join</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title, description, data, sectionKey) => {
    return (
      <View style={styles.sectionContainer} key={sectionKey}>
        <Text style={styles.sectionHeader}>{title}</Text>
        <Text style={styles.sectionHeaderDescription}>{description}</Text>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          numColumns={4}
          renderItem={renderGroupItem}
          key={(data.length % 4).toString()} // Changing key to force re-render
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.searchContainer}>
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
      </View>
      <FlatList
        data={[]}
        keyExtractor={(item) => item.id}
        renderItem={null}
        ListHeaderComponent={() => (
          <View>
            {renderSection(
              'Habits',
              'Habits are things you do everyday. Try adding a private habit to your profile.',
              allGroups.filter(group => group.type === 'habits'),
              'habits-section'
            )}
            {renderSection(
              'Challenges',
              'Challenges are habits that have a goal or certain number of days. Try joining a group challenge.',
              allGroups.filter(group => group.type === 'challenges'),
              'challenges-section'
            )}
            {renderSection(
              'Chill',
              'Chill groups are regular accountability groups.',
              allGroups.filter(group => !group.type || group.type === 'chill'),
              'chill-section'
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAllGroups} />
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBox: {
    backgroundColor: '#191919',
    color: 'white',
    padding: 15,
    borderRadius: 50,
    fontSize: 18,
    flex: 1,
    marginRight: 10,
  },
  createGroupIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  plusIcon: {
    marginLeft: -10,
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
  card: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cardImage: {
    fontSize: 24,
    marginBottom: 5,
  },
  cardText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
    textAlign: 'center',
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
