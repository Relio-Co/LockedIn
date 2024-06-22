import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

const HabitsScreen = () => {
  const [habits, setHabits] = useState([]);
  const [habitProgress, setHabitProgress] = useState({});

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setHabits(userData.personalHabits || []);
        setHabitProgress(userData.habitProgress || {});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch habits');
    }
  };

  const markHabitAsDone = async (habitName, date) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updatedProgress = { ...habitProgress };
      if (!updatedProgress[habitName]) {
        updatedProgress[habitName] = [];
      }
      if (!updatedProgress[habitName].includes(date)) {
        updatedProgress[habitName].push(date);
      }

      await updateDoc(userRef, {
        habitProgress: updatedProgress,
      });

      setHabitProgress(updatedProgress);
    } catch (error) {
      Alert.alert('Error', 'Failed to update habit progress');
    }
  };

  const renderHabitProgress = (habitName) => {
    const markedDates = {};
    if (habitProgress[habitName]) {
      habitProgress[habitName].forEach(date => {
        markedDates[date] = { marked: true, dotColor: '#00b4d8' };
      });
    }
    return (
      <Calendar
        style={styles.calendar}
        markedDates={markedDates}
        onDayPress={(day) => markHabitAsDone(habitName, day.dateString)}
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      {habits.map((habit, index) => (
        <View key={index} style={styles.habitCard}>
          <Text style={styles.habitName}>{habit.name}</Text>
          {renderHabitProgress(habit.name)}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  habitCard: {
    backgroundColor: '#191919',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  habitName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#191919',
    borderRadius: 10,
  },
});

export default HabitsScreen;
