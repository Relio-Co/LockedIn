import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

const HabitsScreen = () => {
  const [habits, setHabits] = useState([]);
  const [habitProgress, setHabitProgress] = useState({});
  const [draggedHabitIndex, setDraggedHabitIndex] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));

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

  const getLastFiveDays = () => {
    const days = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const renderHabitProgress = (habitName) => {
    const lastFiveDays = getLastFiveDays();
    return lastFiveDays.map((date) => {
      const done = habitProgress[habitName]?.includes(date);
      return (
        <TouchableOpacity
          key={date}
          style={[styles.dayCircle, done && styles.dayCircleDone]}
          onPress={() => markHabitAsDone(habitName, date)}
        >
          {done && <Icon name="check" size={16} color="white" />}
        </TouchableOpacity>
      );
    });
  };

  const moveHabit = (from, to) => {
    const updatedHabits = [...habits];
    const movedHabit = updatedHabits.splice(from, 1)[0];
    updatedHabits.splice(to, 0, movedHabit);
    setHabits(updatedHabits);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      if (!dragging) {
        setDragging(true);
      }
      scrollY.setValue(gestureState.moveY);
    },
    onPanResponderRelease: (e, gestureState) => {
      if (draggedHabitIndex !== null) {
        const dropIndex = Math.floor((gestureState.moveY - 100) / 80); // Adjust this value based on the height of your habit items
        if (dropIndex >= 0 && dropIndex < habits.length && dropIndex !== draggedHabitIndex) {
          moveHabit(draggedHabitIndex, dropIndex);
          updateHabitsOrder([...habits]);
        }
      }
      setDragging(false);
      setDraggedHabitIndex(null);
    },
  });

  const updateHabitsOrder = async (updatedHabits) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        personalHabits: updatedHabits,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update habit order');
    }
  };

  const renderHabitItem = (habit, index) => (
    <Animated.View
      key={index}
      style={[
        styles.habitCard,
        { opacity: dragging && index === draggedHabitIndex ? 0.3 : 1 },
        { transform: [{ translateY: dragging && index === draggedHabitIndex ? scrollY : 0 }] },
      ]}
      onLongPress={() => setDraggedHabitIndex(index)}
      {...panResponder.panHandlers}
    >
      <Text style={styles.habitName}>{habit.name}</Text>
      <View style={styles.progressContainer}>
        {renderHabitProgress(habit.name)}
      </View>
    </Animated.View>
  );

  return (
    <ScrollView style={styles.container}>
      {habits.map((habit, index) => renderHabitItem(habit, index))}
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  dayCircleDone: {
    backgroundColor: '#00b4d8',
    borderColor: '#00b4d8',
  },
});

export default HabitsScreen;
