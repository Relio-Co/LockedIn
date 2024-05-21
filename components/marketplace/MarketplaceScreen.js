import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

const MarketplaceScreen = () => {
  const [items, setItems] = useState([]);
  const [credits, setCredits] = useState(100); // Assuming initial credits are 100
  const navigation = useNavigation();

  useEffect(() => {
    const fetchItems = async () => {
      const itemsSnapshot = await getDocs(collection(db, 'marketplace'));
      const itemsList = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(itemsList);
    };

    fetchItems();
  }, []);

  const handleAddCoach = async (item) => {
    if (credits < item.price) {
      Alert.alert('Insufficient Credits', 'You do not have enough credits to buy this item.');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        'items.chatbot': arrayUnion(item)
      });
      setCredits(credits - item.price);
      Alert.alert('Success', `${item.name} has been added to your coaches.`);
    } catch (error) {
      console.error("Error adding coach: ", error);
      Alert.alert('Error', 'Failed to add coach. Please try again.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image style={styles.avatar} source={{ uri: item.avatar }} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>{item.type}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
      </View>
      <TouchableOpacity style={styles.buyButton} onPress={() => handleAddCoach(item)}>
        <Text style={styles.buyButtonText}>Buy</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.creditsContainer}>
        <Text style={styles.creditsText}>Credits: {credits}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  creditsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  creditsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  list: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  itemType: {
    color: '#ccc',
    fontSize: 14,
  },
  itemPrice: {
    color: '#fff',
    fontSize: 14,
  },
  buyButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  marketplaceButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginVertical: 10,
  },
  marketplaceButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MarketplaceScreen;
