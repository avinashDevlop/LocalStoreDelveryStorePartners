import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

const LoginScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('delivery');
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    userId: '',
    password: '',
  });
  const [storeForm, setStoreForm] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Fetch stored credentials and role on component mount
  useEffect(() => {
    const fetchStoredCredentials = async () => {
      try {
        const role = await AsyncStorage.getItem('role');
        if (role === 'deliveryPartner') {
          const userId = await AsyncStorage.getItem('userId');
          const password = await AsyncStorage.getItem('password');
          setDeliveryForm({ userId, password });
          setActiveTab('delivery');
        } else if (role === 'storePartner') {
          const username = await AsyncStorage.getItem('userId');
          const password = await AsyncStorage.getItem('password');
          setStoreForm({ username, password });
          setActiveTab('store');
        }
      } catch (error) {
        console.error('Error fetching stored credentials:', error);
      }
    };

    fetchStoredCredentials();
  }, []);

  const validateDeliveryPartner = async (userId, password) => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Login Failed', 'Please fill in all fields', [{ text: 'OK' }]);
      return false;
    }

    try {
      const userResponse = await api.get(`/Accounts/DeliveryPartner.json`);
      const users = userResponse.data;

      if (!users || !users[userId]) {
        Alert.alert('Login Failed', 'User ID not found', [{ text: 'OK' }]);
        return false;
      }

      const passwordResponse = await api.get(
        `/Accounts/DeliveryPartner/${userId}/profile/account/password.json`
      );
      const storedPassword = passwordResponse.data;

      if (password !== storedPassword) {
        Alert.alert('Login Failed', 'Incorrect password', [{ text: 'OK' }]);
        return false;
      }

      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('password', password);
      await AsyncStorage.setItem('role', 'deliveryPartner');
      return true;
    } catch (error) {
      Alert.alert(
        'Login Failed',
        'An error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const validateStorePartner = async (username, password) => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Login Failed', 'Please fill in all fields', [{ text: 'OK' }]);
      return false;
    }

    try {
      const storeResponse = await api.get(`/Accounts/Stores.json`);
      const stores = storeResponse.data;

      if (!stores || !stores[username]) {
        Alert.alert('Login Failed', 'Store not found', [{ text: 'OK' }]);
        return false;
      }

      const passwordResponse = await api.get(
        `/Accounts/Stores/${username}/profile/account/password.json`
      );
      const storedPassword = passwordResponse.data;

      if (password !== storedPassword) {
        Alert.alert('Login Failed', 'Incorrect password', [{ text: 'OK' }]);
        return false;
      }

      await AsyncStorage.setItem('userId', username);
      await AsyncStorage.setItem('password', password);
      await AsyncStorage.setItem('role', 'storePartner');
      return true;
    } catch (error) {
      Alert.alert(
        'Login Failed',
        'An error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      let isValid;
      if (activeTab === 'delivery') {
        isValid = await validateDeliveryPartner(deliveryForm.userId, deliveryForm.password);
        if (isValid) {
          navigation.navigate('DeliveryPartnerTabs');
        }
      } else {
        isValid = await validateStorePartner(storeForm.username, storeForm.password);
        if (isValid) {
          navigation.navigate('StorePartnerTabs');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.gradientContainer}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>
              {activeTab === 'delivery' ? '🚚' : '🏪'}
            </Text>
          </View>

          <View style={styles.tabContainer}>
            <TabButton
              title="Delivery Partner"
              isActive={activeTab === 'delivery'}
              onPress={() => setActiveTab('delivery')}
            />
            <TabButton
              title="Store Partner"
              isActive={activeTab === 'store'}
              onPress={() => setActiveTab('store')}
            />
          </View>

          <View style={styles.formContainer}>
            {activeTab === 'delivery' ? (
              <>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={24} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="User ID"
                    placeholderTextColor="#666"
                    value={deliveryForm.userId}
                    onChangeText={(text) => setDeliveryForm({ ...deliveryForm, userId: text })}
                    editable={!isLoading}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={24} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    value={deliveryForm.password}
                    onChangeText={(text) => setDeliveryForm({ ...deliveryForm, password: text })}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="store" size={24} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#666"
                    value={storeForm.username}
                    onChangeText={(text) => setStoreForm({ ...storeForm, username: text })}
                    editable={!isLoading}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={24} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    value={storeForm.password}
                    onChangeText={(text) => setStoreForm({ ...storeForm, password: text })}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4c669f', '#3b5998', '#192f6a']}
                style={styles.loginButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword} disabled={isLoading}>
              <Text style={[styles.forgotPasswordText, isLoading && styles.textDisabled]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  gradientContainer: {
    flex: 1,
    minHeight: Dimensions.get('window').height,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoText: {
    fontSize: 72,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 30,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: '#4c669f',
    fontSize: 14,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default LoginScreen;