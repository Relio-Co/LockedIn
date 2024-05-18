import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const PickInterestsScreen = () => {
  const navigation = useNavigation();
  const [selectedInterests, setSelectedInterests] = useState([]);

  const interests = [
    "Fitness",
    "Meditation",
    "Reading",
    "Coding",
    "Yoga",
    "Journaling",
    "Nutrition",
    "Learning",
    "Other"
  ];

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(item => item !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <Text style={styles.title}>Pick some Habits to Get Started</Text>
        <Text style={styles.subtitle}>We will help you stay accountable and build habits in these areas.</Text>
        <View style={styles.interestsContainer}>
          {interests.map(interest => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestButton,
                selectedInterests.includes(interest) && styles.selectedInterestButton
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text style={styles.interestButtonText}>{interest}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Save the selected interests and navigate to the next screen
            console.log(selectedInterests);
            navigation.navigate('Feed');
          }}
        >
          <Text style={styles.buttonText}>Get Started</Text>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00b4d8',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  interestButton: {
    padding: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: '#0077b6',
    borderRadius: 50,
    backgroundColor: '#191919',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInterestButton: {
    backgroundColor: '#00b4d8',
  },
  interestButtonText: {
    color: 'white',
    fontSize: 18,
  },
  button: {
    padding: 15,
    backgroundColor: '#00b4d8',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PickInterestsScreen;
