import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const LeaderboardScreen = ({ route }) => {
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchLeaderboard();
  }, [groupId]);

  const fetchLeaderboard = async () => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        setGroup(groupData);

        const members = groupData.members;
        const memberData = await Promise.all(members.map(async (memberId) => {
          const userRef = doc(db, 'users', memberId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const userStreak = userData.streaks[groupId] || 0;
            return {
              id: memberId,
              username: userData.username,
              streak: userStreak,
              profilePicture: userData.profilePicture || 'https://via.placeholder.com/50',
            };
          }
          return null;
        }));

        const sortedLeaderboard = memberData.filter(user => user !== null).sort((a, b) => b.streak - a.streak);
        setLeaderboard(sortedLeaderboard);
      } else {
        Alert.alert("Error", "Group does not exist.");
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch leaderboard.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{group ? `${group.name} Leaderboard` : 'Loading...'}</Text>
      <FlatList
        data={leaderboard}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.leaderboardItem}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Image source={{ uri: item.profilePicture }} style={styles.profilePicture} />
            <Text style={styles.username}>{item.username}</Text>
            <View style={styles.streakContainer}>
              <Icon name="bolt" size={16} color="orange" />
              <Text style={styles.streak}>{item.streak} days</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#444',
    marginBottom: 10,
    backgroundColor: '#191919',
    borderRadius: 10,
  },
  rank: {
    fontSize: 18,
    color: 'white',
    marginRight: 10,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streak: {
    fontSize: 16,
    color: 'orange',
    marginLeft: 5,
  },
});

export default LeaderboardScreen;
