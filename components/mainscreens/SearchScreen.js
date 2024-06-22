import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, startAt, endAt } from 'firebase/firestore';
import debounce from 'lodash.debounce';

const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const navigation = useNavigation();

  const debouncedSearch = useCallback(debounce((text) => performSearch(text), 300), []);

  useEffect(() => {
    if (searchText.length > 2) {
      debouncedSearch(searchText);
    } else {
      setResults([]);
    }
  }, [searchText]);

  const performSearch = async (text) => {
    setLoading(true);
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('name', '>=', text),
        where('name', '<=', text + '\uf8ff')
      );
      const postsQuery = query(
        collection(db, 'posts'),
        where('caption', '>=', text),
        where('caption', '<=', text + '\uf8ff')
      );

      const [usersSnapshot, postsSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(postsQuery),
      ]);

      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'user' }));
      const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'post' }));

      setResults([...users, ...posts]);
    } catch (error) {
      console.error('Error performing search:', error);
    }
    setLoading(false);
  };

  const handleResultPress = (item) => {
    if (item.type === 'user') {
      navigation.navigate('UserProfile', { userId: item.id });
    } else if (item.type === 'post') {
      navigation.navigate('PostDetail', { postId: item.id });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
      <Text style={styles.resultText}>{item.name || item.caption}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={24} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for users, posts..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#00b4d8" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.resultsContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: 50,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 10,
    fontSize: 16,
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
});

export default SearchScreen;
