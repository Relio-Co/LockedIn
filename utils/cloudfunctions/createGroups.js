const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceFile.json')),
  databaseURL: "https://lockedin-88dd7-default-rtdb.firebaseio.com", // Replace with your database URL
});

const db = admin.firestore();

// Function to create default habits
async function createDefaultHabits() {
  const habits = [
    { name: 'Morning Exercise', icon: '💪' },
    { name: 'Read a Book', icon: '📚' },
    { name: 'Meditation', icon: '🧘' },
    { name: 'Healthy Breakfast', icon: '🍳' },
    { name: 'Journal Writing', icon: '📝' },
    { name: 'Learning a New Skill', icon: '🎓' },
    { name: 'Daily Walk', icon: '🚶' },
    { name: 'Water Intake', icon: '💧' },
    { name: 'Evening Stretching', icon: '🧘' },
    { name: 'Sleep Early', icon: '😴' },
    { name: 'Yoga', icon: '🧘' },
    { name: 'Gratitude Practice', icon: '🙏' },
    { name: 'No Junk Food', icon: '🍏' },
    { name: 'Daily Planning', icon: '🗓' },
    { name: 'Language Learning', icon: '🈯' },
    { name: 'Digital Detox', icon: '📵' },
    { name: 'Cleaning Habit', icon: '🧹' },
    { name: 'Cooking New Recipe', icon: '🍲' },
    { name: 'Charity Work', icon: '❤️' },
    { name: 'Gardening', icon: '🌿' }
  ];

  const habitPromises = habits.map(habit => {
    const groupId = uuidv4();
    return db.collection('groups').doc(groupId).set({
      name: habit.name,
      type: 'habits',
      isDefault: true,
      public: true,
      members: [],
      admins: [],
      groupIcon: habit.icon,
      description: '',
      posts: [],
      streak: 0
    });
  });

  await Promise.all(habitPromises);
  console.log('Default habits created successfully.');
}

// Function to create public challenges
async function createPublicChallenges() {
  const challenges = [
    {
      name: '30 Days of Coding',
      type: 'challenges',
      challengeType: 'goal',
      public: true,
      isDefault: false,
      groupIcon: '💻',
      description: 'Code every day for 30 days.',
      members: [],
      admins: [],
      posts: [],
      streak: 0
    },
    {
      name: 'Daily Running',
      type: 'challenges',
      challengeType: 'goal',
      public: true,
      isDefault: false,
      groupIcon: '🏃',
      description: 'Run every day for 30 days.',
      members: [],
      admins: [],
      posts: [],
      streak: 0
    },
    {
      name: 'Meditation for 30 Days',
      type: 'challenges',
      challengeType: 'timeline',
      public: true,
      isDefault: false,
      groupIcon: '🧘',
      description: 'Meditate every day for 30 days.',
      members: [],
      admins: [],
      posts: [],
      streak: 0,
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from today
    },
    {
      name: 'Healthy Eating',
      type: 'challenges',
      challengeType: 'goal',
      public: true,
      isDefault: false,
      groupIcon: '🥗',
      description: 'Eat healthy every day for 30 days.',
      members: [],
      admins: [],
      posts: [],
      streak: 0
    },
    {
      name: 'Learn a New Skill',
      type: 'challenges',
      challengeType: 'timeline',
      public: true,
      isDefault: false,
      groupIcon: '🛠',
      description: 'Learn a new skill in 30 days.',
      members: [],
      admins: [],
      posts: [],
      streak: 0,
      startDate: admin.firestore.Timestamp.now(),
      endDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from today
    }
  ];

  const challengePromises = challenges.map(challenge => {
    const groupId = uuidv4();
    return db.collection('groups').doc(groupId).set(challenge);
  });

  await Promise.all(challengePromises);
  console.log('Public challenges created successfully.');
}

// Main function to run the scripts
async function main() {
  await createDefaultHabits();
  await createPublicChallenges();
  process.exit(0);
}

main().catch(error => {
  console.error('Error creating default groups:', error);
  process.exit(1);
});