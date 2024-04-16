import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";

// Import your other screens
import MainScreen from "./components/MainScreen";
import AddChallengeScreen from "./components/AddChallenge";
import FriendsScreen from "./components/FriendScreen";
import ProfileScreen from "./components/ProfilePage";
// Import the onboarding screens
import Onboarding from "./components/Onboarding/OnboardingScreen";
import LoginScreen from "./components/Onboarding/LoginScreen";
import SignUpScreen from "./components/Onboarding/SignUp";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: "#000" }}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Close drawer"
        onPress={() => props.navigation.closeDrawer()}
      />
    </DrawerContentScrollView>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Main"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: "#000",
        },
        drawerActiveTintColor: "#fff",
        drawerInactiveTintColor: "#fff",
      }}
    >
      <Drawer.Screen
        name="Main"
        component={MainScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="AddChallenge"
        component={AddChallengeScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ headerShown: false }}
      />

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      {/* Add additional screens here */}
    </Drawer.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Onboarding"
          component={Onboarding}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DrawerNavigator"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Friends"
          component={FriendsScreen}
          options={{
            headerShown: true,
            headerTitle: "Friends",
            headerStyle: { backgroundColor: "#000" },
            headerTintColor: "#fff",
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            ),
          }}
        />
        {/* Add additional screens here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
