import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6T21NpWBns1U2tT5R3TKP85Mh2712-r0",
    authDomain: "lockedin-88dd7.firebaseapp.com",
    projectId: "lockedin-88dd7",
    storageBucket: "lockedin-88dd7.appspot.com",
    messagingSenderId: "264306491964",
    appId: "1:264306491964:web:d323a0a6e646babf4fb939"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const storage = getStorage(app);

export { db, auth, storage };