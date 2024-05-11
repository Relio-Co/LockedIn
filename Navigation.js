import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from './components/authentication/AuthScreen';
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
import FriendsScreen from './FriendsScreen';

const Stack = createNativeStackNavigator();

function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth">
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Feed" component={FeedScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Post" component={PostScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="GroupMembers" component={GroupMembersScreen} />
        <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
        <Stack.Screen name="FriendsScreen" component={FriendsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;
