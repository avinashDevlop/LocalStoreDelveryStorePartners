import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from "../../../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const StorePartnerProfile = () => {
  const navigation = useNavigation();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setError('User ID not found');
        return;
      }
      const response = await api.get(`/Accounts/Stores/${userId}/profile.json`);
      if (response?.data) {
        setStoreData(response.data);
      } else {
        setError('Invalid data received');
      }
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.replace("Login");
            } catch (error) {
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]
    );
  };

  const openGoogleMaps = async () => {
    if (storeData?.address?.googleMapUrl) {
      try {
        await Linking.openURL(storeData.address?.googleMapUrl);
      } catch (error) {
        Alert.alert("Error", "Could not open Google Maps");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading store profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#ff6b6b" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfileData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const DocumentViewer = ({ visible, document, onClose }) => {
    if (!document?.url) return null;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{document.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.documentContainer}>
            <Image
              source={{ uri: document.url }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity 
              style={styles.documentRow}
              onPress={() => setSelectedDocument({
                url: storeData.documents?.storeImage,
                title: 'Store View'
              })}
            >
          <Image
            source={{ uri: storeData?.documents?.storeImage || 'https://via.placeholder.com/80' }}
            style={styles.storeImage}
          />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{storeData?.storeInfo?.name || 'Store Name'}</Text>
            <View style={styles.statusSection}>
              <View style={[styles.statusBadge, { 
                backgroundColor: storeData?.status === 'Active' ? '#4CAF50' : '#757575' 
              }]}>
                <Text style={styles.statusText}>
                  {(storeData?.status || 'INACTIVE').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.operatingHours}>
                {storeData?.storeInfo?.operatingHours?.opening || '--:--'} - {storeData?.storeInfo?.operatingHours?.closing || '--:--'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Owner Name:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.ownerName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone Number:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.phoneNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Alternative Number:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.alternatePhone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>GST Number:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.gstNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>{storeData?.storeInfo?.description || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Street:</Text>
            <Text style={styles.value}>{storeData?.address?.street || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>City:</Text>
            <Text style={styles.value}>{storeData?.address?.city || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Zip Code:</Text>
            <Text style={styles.value}>{storeData?.address?.zipCode || 'N/A'}</Text>
          </View>
          <TouchableOpacity onPress={openGoogleMaps} style={styles.mapButton}>
            <MaterialIcons name="map" size={24} color="#4CAF50" />
            <Text style={styles.mapButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>

        {storeData?.categories?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoriesContainer}>
              {storeData.categories.map((category, index) => (
                <View key={index} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          {storeData?.documents?.panCard && (
            <TouchableOpacity 
              style={styles.documentRow}
              onPress={() => setSelectedDocument({
                url: storeData?.documents?.panCard,
                title: 'PAN Card'
              })}
            >
              <MaterialIcons name="description" size={24} color="#666" />
              <Text style={styles.documentText}>PAN Card</Text>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          )}
          {storeData?.documents?.shopLicense && (
            <TouchableOpacity 
              style={styles.documentRow}
              onPress={() => setSelectedDocument({
                url: storeData.documents?.shopLicense,
                title: 'Shop License'
              })}
            >
              <MaterialIcons name="business" size={24} color="#666" />
              <Text style={styles.documentText}>Shop License</Text>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <DocumentViewer
        visible={!!selectedDocument}
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  headerInfo: {
    marginLeft: 20,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  operatingHours: {
    marginLeft: 12,
    color: '#666',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    color: '#666',
    fontSize: 16,
    flex: 1,
  },
  value: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  mapButtonText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    color: '#333',
    fontSize: 14,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  documentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  documentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  operatingHours: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },
  mapButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

export default StorePartnerProfile;