import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const WelcomeScreen = () => {
  const navigation = useNavigation();

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Lock In</Text>
          <Text style={[styles.title, { color: '#00b4d8', fontWeight: 'bold' }]}>To Your</Text>
          <Text style={[styles.title, { color: '#0077b6', fontWeight: 'bold' }]}>Hardest Habits</Text>
          <Text style={[styles.title, { color: '#90e0ef', fontWeight: 'bold' }]}>and Grow!</Text>
        </View>
        <Text style={styles.subtitle}>Join the platform and transform your habits one step at a time.</Text>
        <TouchableOpacity style={styles.arrowButton} onPress={() => navigation.replace('CreateAccount')}>
          <Ionicons name="chevron-forward-circle-outline" size={64} color="#00b4d8" />
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  textContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginVertical: 20,
  },
  arrowButton: {
    marginTop: 30,
  },
});

export default WelcomeScreen;
