import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedScreen from './components/mainscreens/FeedScreen';
import PostScreen from './components/posts/PostScreen';
import ProfileScreen from './components/mainscreens/ProfileScreen';
import PostDetailScreen from './components/posts/PostDetailScreen';
import UserProfileScreen from './components/mainscreens/UserProfileScreen';
import SettingsScreen from './components/mainscreens/Settings';
import GroupsScreen from './components/groups/GroupScreen';
import CreateGroupScreen from './components/groups/CreateGroupScreen';
import GroupDetailsScreen from './components/groups/GroupFeedScreen';
import GroupMembersScreen from './components/groups/GroupMembersScreen';
import GroupSettingsScreen from './components/groups/GroupSettingsScreen';
import FriendsScreen from './components/mainscreens/FriendsScreen';
import NotificationsScreen from './components/mainscreens/NotificationsScreen'
import GroupChatScreen from './components/groups/GroupChatScreen';
import LeaderboardScreen from './components/groups/LeaderboardScreen';
import WelcomeScreen from './components/authentication/WelcomeScreen';
import CreateAccountScreen from './components/authentication/CreateAccountScreen';
import PickInterestsScreen from './components/authentication/PickInterestsScreen';
import LoginScreen from './components/authentication/LoginScreen';
import GroupChatListScreen from './components/groups/GroupChatListScreen'
import AIChatScreen from './components/groups/AIChatScreen';
import ForYouFeedScreen from './components/mainscreens/ForYouFeedScreen';

const Stack = createNativeStackNavigator();

function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PickInterests" component={PickInterestsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Feed" component={FeedScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Post" component={PostScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="FriendsScreen" component={FriendsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="GroupChatList" component={GroupChatListScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="AIChatScreen" component={AIChatScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ForYouFeedScreen" component={ForYouFeedScreen} options={{ headerShown: false }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;
