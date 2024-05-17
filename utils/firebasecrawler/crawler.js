const admin = require('firebase-admin');
const serviceAccount = require('./file.json'); // Ensure this file exists in the same directory

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lockedin-88dd7-default-rtdb.firebaseio.com",
  storageBucket: "lockedin-88dd7.appspot.com"
});

const db = admin.firestore();
const rtdb = admin.database();
const storage = admin.storage().bucket();

// Function to crawl Firestore schema
async function crawlFirestoreSchema() {
  const schema = {};

  async function traverseCollection(collectionRef, schemaNode) {
    const snapshot = await collectionRef.get();
    for (const doc of snapshot.docs) {
      schemaNode[doc.id] = { fields: Object.keys(doc.data()), subcollections: {} };
      const subcollections = await doc.ref.listCollections();
      for (const subcollection of subcollections) {
        schemaNode[doc.id].subcollections[subcollection.id] = {};
        await traverseCollection(subcollection, schemaNode[doc.id].subcollections[subcollection.id]);
      }
    }
  }

  const collections = await db.listCollections();
  for (const collection of collections) {
    schema[collection.id] = {};
    await traverseCollection(collection, schema[collection.id]);
  }

  return schema;
}

// Function to crawl Realtime Database schema
async function crawlRTDBSchema() {
  const schema = {};

  async function traverseRTDB(ref, schemaNode) {
    const snapshot = await ref.once('value');
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        schemaNode[childSnapshot.key] = {};
        traverseRTDB(ref.child(childSnapshot.key), schemaNode[childSnapshot.key]);
      });
    }
  }

  await traverseRTDB(rtdb.ref(), schema);
  return schema;
}

// Function to crawl Storage schema
async function crawlStorageSchema() {
  const [files] = await storage.getFiles();
  const schema = files.map(file => ({
    name: file.name,
    contentType: file.metadata.contentType,
    size: file.metadata.size,
  }));
  return schema;
}

async function crawlFirebaseSchema() {
  const firestoreSchema = await crawlFirestoreSchema();
  const rtdbSchema = await crawlRTDBSchema();
  const storageSchema = await crawlStorageSchema();

  return {
    firestore: firestoreSchema,
    realtimeDatabase: rtdbSchema,
    storage: storageSchema,
  };
}

crawlFirebaseSchema().then(schema => {
  console.log(JSON.stringify(schema, null, 2));
}).catch(error => {
  console.error('Error crawling Firebase schema:', error);
});
