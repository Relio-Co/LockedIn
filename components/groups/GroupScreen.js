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
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  const navigation = useNavigation();

  useEffect(() => {
    fetchAllGroups();
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

  const getMemberCount = (members) => (members ? members.length : '0');

  const isMember = (groupId) => groups.some(group => group.id === groupId);

  const renderGroupItem = ({ item }) => {
    const isGroupMember = isMember(item.id);
    const groupBackgroundColor = isGroupMember ? 'white' : '#000';
    const groupBorderColor = '#000';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: groupBackgroundColor, borderColor: groupBorderColor }]} 
        onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
      >
        <Text style={[styles.cardText, { color: isGroupMember ? '#000' : '#fff' }]}>#{item.name}</Text>
        <View style={styles.cardFooter}>
          <Icon name="user" size={20} color={isGroupMember ? '#000' : '#fff'} />
          <Text style={[styles.cardText, { color: isGroupMember ? '#000' : '#fff' }]}>{getMemberCount(item.members)}</Text>
          <Icon name={isGroupMember ? "lock" : "unlock"} size={20} color={isGroupMember ? '#000' : '#fff'} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title, description, data, sectionKey) => (
    <View style={styles.sectionContainer} key={sectionKey}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <Text style={styles.sectionHeaderDescription}>{description}</Text>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
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
        keyExtractor={item => item.id}
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
                  'Chill',
                  'Chill groups are regular accountability groups.',
                  allGroups.filter(group => !group.type || group.type === 'chill'),
                  'chill-section'
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
    width: width * 0.7, // More rectangular (horizontal)
    height: width * 0.25,
    borderWidth: 1,
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
});

export default GroupsScreen;
