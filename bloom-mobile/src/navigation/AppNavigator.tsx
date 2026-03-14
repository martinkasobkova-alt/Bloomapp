import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OutlineIcon } from '../components/OutlineIcon';
import { BugReportModal } from '../components/BugReportModal';
import BloomLoadingScreen from '../components/BloomLoadingScreen';
import { LotusLogo } from '../components/LotusLogo';
import { AvatarImage } from '../components/AvatarImage';
import { useAuth } from '../context/AuthContext';
import { fixAvatarUrl } from '../config/api';
import { BiometricLockProvider, useBiometricLock } from '../context/BiometricLockContext';

import AuthScreen from '../screens/AuthScreen';
import BiometricLockScreen from '../screens/BiometricLockScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import HomeScreen from '../screens/HomeScreen';
import SupportScreen from '../screens/SupportScreen';
import SpecialistsScreen from '../screens/SpecialistsScreen';
import LegalScreen from '../screens/LegalScreen';
import NewsScreen from '../screens/NewsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NearbyScreen from '../screens/NearbyScreen';
import SearchScreen from '../screens/SearchScreen';
import StoriesScreen from '../screens/StoriesScreen';
import JourneyScreen from '../screens/JourneyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AboutScreen from '../screens/AboutScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, color }: { name: 'home' | 'message-circle' | 'search'; color?: string }) {
  return <OutlineIcon name={name} size={22} color={color || '#5D6472'} />;
}

function ProfileTabIcon() {
  const { user } = useAuth();
  return (
    <View style={tabStyles.avatarIconWrap}>
      <AvatarImage
        avatar={user?.avatar || 'fem-pink'}
        customImage={fixAvatarUrl(user?.custom_avatar)}
        size={24}
      />
    </View>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Specialists" component={SpecialistsScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="Nearby" component={NearbyScreen} />
      <Stack.Screen name="Stories" component={StoriesScreen} />
      <Stack.Screen name="Journey" component={JourneyScreen} />
    </Stack.Navigator>
  );
}

function UserProfileWrapper({ navigation, route }: any) {
  return (
    <UserProfileScreen
      userId={route.params?.userId || ''}
      onBack={() => navigation.goBack()}
      onMessage={(userId) => {
        navigation.navigate('Main', { screen: 'Messages', params: { openUserId: userId } });
      }}
    />
  );
}

function AuthenticatedApp() {
  const { isLocked } = useBiometricLock();
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="UserProfile" component={UserProfileWrapper} />
      </Stack.Navigator>
      {isLocked && (
        <View style={lockOverlayStyles.overlay}>
          <BiometricLockScreen />
        </View>
      )}
    </View>
  );
}

const lockOverlayStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FCFBFF',
    zIndex: 9999,
  },
});

function HeaderLogo() {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={headerLogoStyles.wrap}
      onPress={() => navigation.navigate('HomeTab', { screen: 'HomeMain' })}
      activeOpacity={0.7}
    >
      <LotusLogo size={40} />
      <Text style={headerLogoStyles.title}>Bloom</Text>
    </TouchableOpacity>
  );
}

function BugReportButton() {
  const [visible, setVisible] = React.useState(false);
  return (
    <>
      <TouchableOpacity
        style={bugReportStyles.btn}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <OutlineIcon name="bug" size={20} color="#8A7CFF" />
      </TouchableOpacity>
      <BugReportModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const bugReportStyles = StyleSheet.create({
  btn: { padding: 8, marginRight: 4 },
});

const headerLogoStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    fontWeight: '800',
    color: '#8A7CFF',
    letterSpacing: 0.5,
  },
});

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreenWrapper} />
      <Stack.Screen name="About" component={AboutScreenWrapper} />
      <Stack.Screen name="Privacy" component={PrivacySettingsScreenWrapper} />
    </Stack.Navigator>
  );
}

function EditProfileScreenWrapper({ navigation }: any) {
  return (
    <EditProfileScreen onBack={() => navigation.goBack()} />
  );
}

function AboutScreenWrapper({ navigation }: any) {
  return (
    <AboutScreen onBack={() => navigation.goBack()} />
  );
}

function PrivacySettingsScreenWrapper({ navigation }: any) {
  return (
    <PrivacySettingsScreen onBack={() => navigation.goBack()} />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#8A7CFF',
        tabBarInactiveTintColor: '#5D6472',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
        headerStyle: { backgroundColor: '#FCFBFF' },
        headerTintColor: '#2F3441',
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        headerLeft: () => <HeaderLogo />,
        headerRight: () => <BugReportButton />,
        headerTitle: () => null,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Domů',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Zprávy',
          tabBarLabel: 'Zprávy',
          tabBarIcon: ({ color }) => <TabIcon name="message-circle" color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Vyhledávání',
          tabBarLabel: 'Hledat',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: () => <ProfileTabIcon />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreenWrapper} />
      <Stack.Screen name="Register" component={RegisterScreenWrapper} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreenWrapper} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreenWrapper} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreenWrapper} />
    </Stack.Navigator>
  );
}

function AuthScreenWrapper({ navigation }: any) {
  return (
    <AuthScreen
      onForgotPassword={() => navigation.navigate('ForgotPassword')}
      onRegister={() => navigation.navigate('Register')}
    />
  );
}

function RegisterScreenWrapper({ navigation }: any) {
  return (
    <RegisterScreen
      onSuccess={() => {}}
      onBack={() => navigation.goBack()}
    />
  );
}

function ForgotPasswordScreenWrapper({ navigation }: any) {
  return <ForgotPasswordScreen onBack={() => navigation.goBack()} />;
}

function ResetPasswordScreenWrapper({ navigation, route }: any) {
  return (
    <ResetPasswordScreen
      token={route.params?.token || ''}
      onSuccess={() => navigation.navigate('Auth')}
      onBack={() => navigation.navigate('Auth')}
    />
  );
}

function VerifyEmailScreenWrapper({ navigation, route }: any) {
  return (
    <VerifyEmailScreen
      token={route.params?.token || ''}
      onSuccess={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
      onBack={() => navigation.navigate('Auth')}
    />
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <BloomLoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AuthFlow" component={AuthStack} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <BiometricLockProvider isAuthenticated={isAuthenticated} isReady={!loading}>
      <NavigationContainer>
        <AuthenticatedApp />
      </NavigationContainer>
    </BiometricLockProvider>
  );
}

const tabStyles = StyleSheet.create({
  avatarIconWrap: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden' },
});
