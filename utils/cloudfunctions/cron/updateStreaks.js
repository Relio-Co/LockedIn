const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const cron = require('node-cron');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('../servicefile.json')),
});

const db = getFirestore();

// Helper function to get the start of today
function startOfToday() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Timestamp.fromDate(now);
}

// Helper function to get the start of yesterday
function startOfYesterday() {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - 1);
  now.setUTCHours(0, 0, 0, 0);
  return Timestamp.fromDate(now);
}

// Function to update streaks
async function updateStreaks() {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    const today = startOfToday();
    const yesterday = startOfYesterday();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      let globalStreak = 0;
      let highestGlobalStreak = userData.highestGlobalStreak || 0;
      let groupStreaks = userData.groupStreaks || {};
      
      const postsSnapshot = await db.collection('posts').where('createdBy', '==', userId).get();
      const posts = postsSnapshot.docs.map(doc => doc.data());
      
      const groupPosts = {};
      
      posts.forEach(post => {
        const postDate = post.createdAt.toDate();
        const postDay = postDate.toISOString().split('T')[0];
        
        if (!groupPosts[post.groupId]) {
          groupPosts[post.groupId] = new Set();
        }
        
        groupPosts[post.groupId].add(postDay);
      });
      
      let isGlobalStreakBroken = false;
      let lastPostDay;
      
      posts.forEach(post => {
        const postDate = post.createdAt.toDate();
        const postDay = postDate.toISOString().split('T')[0];
        
        if (!lastPostDay || (new Date(postDay) - new Date(lastPostDay)) === 86400000) {
          globalStreak += 1;
        } else {
          isGlobalStreakBroken = true;
        }
        
        lastPostDay = postDay;
      });
      
      if (!isGlobalStreakBroken) {
        highestGlobalStreak = Math.max(highestGlobalStreak, globalStreak);
      }
      
      for (const groupId in groupPosts) {
        const groupStreakDays = Array.from(groupPosts[groupId]).sort((a, b) => new Date(a) - new Date(b));
        let groupStreak = 0;
        let highestGroupStreak = groupStreaks[groupId]?.highestStreak || 0;
        let isGroupStreakBroken = false;
        let lastGroupPostDay;
        
        groupStreakDays.forEach(day => {
          if (!lastGroupPostDay || (new Date(day) - new Date(lastGroupPostDay)) === 86400000) {
            groupStreak += 1;
          } else {
            isGroupStreakBroken = true;
          }
          
          lastGroupPostDay = day;
        });
        
        if (!isGroupStreakBroken) {
          highestGroupStreak = Math.max(highestGroupStreak, groupStreak);
        }
        
        groupStreaks[groupId] = {
          streakScore: groupStreak,
          highestStreak: highestGroupStreak,
        };
      }
      
      await db.collection('users').doc(userId).update({
        streakScore: globalStreak,
        highestGlobalStreak: highestGlobalStreak,
        groupStreaks: groupStreaks,
      });
    }
  } catch (error) {
    console.error('Error updating streaks:', error);
  }
}

// Run the function immediately
updateStreaks();

// Schedule the function to run every hour
cron.schedule('0 * * * *', updateStreaks);

console.log('Streak update script scheduled to run every hour.');
