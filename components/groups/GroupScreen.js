import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const GroupsScreen = () => {
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [userHabits, setUserHabits] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchAllGroups();
    fetchUserHabits();
  }, []);

  const fetchAllGroups = async () => {
    setRefreshing(true);
    setLoading(true);
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
    setLoading(false);
  };

  const fetchUserHabits = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const habits = docSnap.data().habits || [];
        setUserHabits(habits);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user habits');
    }
  };

  const handleAddHabit = async (groupId) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        habits: arrayUnion(groupId)
      });
      setUserHabits([...userHabits, groupId]);
      Alert.alert('Success', 'Habit added to your profile!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add habit');
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

  const getMemberCount = (members) => (members ? members.length : '0');

  const isMember = (groupId) => groups.some(group => group.id === groupId);

  const renderGroupItem = ({ item }) => {
    const isGroupMember = isMember(item.id);
    const groupBackgroundColor = isGroupMember ? 'white' : '#000';
    const groupBorderColor = '#000';
    const isHabitAdded = userHabits.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: groupBackgroundColor, borderColor: groupBorderColor }]}
        onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
      >
        <Text style={[styles.cardText, { color: isGroupMember ? '#000' : '#fff' }]}>#{item.name}</Text>
        <View style={styles.cardFooter}>
          <Icon name="user" size={20} color={isGroupMember ? '#000' : '#fff'} />
          <Text style={[styles.cardText, { color: isGroupMember ? '#000' : '#fff' }]}>{getMemberCount(item.members)}</Text>
        </View>
        {item.type === 'habits' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => !isHabitAdded && handleAddHabit(item.id)}
          >
            <Icon name={isHabitAdded ? 'lock' : 'plus'} size={24} color={isHabitAdded ? 'blue' : 'white'} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title, description, data, sectionKey) => (
    <View style={styles.sectionContainer} key={sectionKey}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <Text style={styles.sectionHeaderDescription}>{description}</Text>
      <FlatList
        data={data}
        keyExtractor={item => `${sectionKey}-${item.id}`}
        horizontal
        renderItem={renderGroupItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  );

  const renderSuggestedSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeader}>Suggested</Text>
      <Text style={styles.sectionHeaderDescription}>Here are some groups you might like.</Text>
      <FlatList
        data={allGroups.filter(group => !isMember(group.id))}
        keyExtractor={item => `suggested-${item.id}`}
        horizontal
        renderItem={renderGroupItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.schoolButton} onPress={() => Alert.alert('School button pressed')}>
            <Icon name="graduation-cap" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.createGroupIcon} onPress={handleCreateGroup}>
            <Icon name="users" size={30} color="white" />
            <Icon name="plus" size={15} color="white" style={styles.plusIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBox}
            placeholder="Search Groups"
            placeholderTextColor="#ccc"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loadingIndicator} />
        ) : (
          <FlatList
            data={[]}
            keyExtractor={(item) => item.id}
            renderItem={null}
            ListHeaderComponent={() => (
              <View>
                {renderSection(
                  'Habits',
                  'Habits are things you do every day. Try adding a private habit to your profile.',
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
                  'Groups',
                  'Groups you are part of.',
                  groups,
                  'groups-section'
                )}
                {renderSuggestedSection()}
              </View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchAllGroups} />
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  schoolButton: {
    padding: 10,
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
  flatListContent: {
    paddingLeft: 20,
  },
  card: {
    borderRadius: 10,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.7,
    height: width * 0.25,
    borderWidth: 1,
    position: 'relative',
  },
  cardText: {
    fontSize: 14,
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 5,
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
  },
});

export default GroupsScreen;
