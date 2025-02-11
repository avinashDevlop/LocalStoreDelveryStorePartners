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
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from "../../../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DeliveryPartnerProfile = () => {
  const navigation = useNavigation();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState({
    status: "",
    personalInfo: {},
    vehicleInfo: {},
    address: {},
    documents: {},
    lastStatusUpdate: null
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const phoneNumber = await AsyncStorage.getItem("userId");
      if (!phoneNumber) {
        setError('User ID not found');
        return;
      }
      const response = await api.get(`/Accounts/DeliveryPartner/${phoneNumber}/profile.json`);
      if (response?.data) {
        setPartnerData(response.data);
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
    try {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Logout",
            onPress: async () => {
              try {
                await AsyncStorage.clear();
                navigation.replace("Login"); // Navigate to Login screen
              } catch (error) {
                console.error("Error during logout:", error);
                Alert.alert("Error", "Failed to logout. Please try again.");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Unexpected error in logout process:", error);
    }
  };  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
            <Text style={styles.modalTitle}>
              {document.title || 'Document'}
            </Text>
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

  const InfoSection = ({ title, data }) => {
    if (!data || Object.keys(data).length === 0) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {Object.entries(data).map(([key, value]) => (
          <View key={key} style={styles.infoRow}>
            <Text style={styles.label}>
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
            </Text>
            <Text style={styles.value}>{value || 'N/A'}</Text>
          </View>
        ))}
      </View>
    );
  };

  const StatusBadge = ({ status }) => (
    <View style={[styles.statusBadge, { backgroundColor: status === 'online' ? '#4CAF50' : '#757575' }]}>
      <Text style={styles.statusText}>{(status || 'OFFLINE').toUpperCase()}</Text>
    </View>
  );

  const handleDocumentPress = (documentType) => {
    if (!partnerData.documents) return;

    const documentMap = {
      drivingLicense: {
        url: partnerData.documents.drivingLicense,
        title: 'Driving License'
      },
      idProof: {
        url: partnerData.documents.idProof,
        title: 'ID Proof'
      }
    };
    
    if (documentMap[documentType]?.url) {
      setSelectedDocument(documentMap[documentType]);
    }
  };

  const hasDocuments = partnerData.documents && 
    (partnerData.documents.drivingLicense || partnerData.documents.idProof);

  return (
    <>
     <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => partnerData.documents?.profileImage && setSelectedDocument({
              url: partnerData.documents.profileImage,
              title: 'Profile Photo'
            })}
          >
            <Image
              source={{ 
                uri: partnerData.documents?.profileImage || 'https://via.placeholder.com/80'
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {partnerData.personalInfo?.firstName || ''} {partnerData.personalInfo?.lastName || ''}
            </Text>
            <StatusBadge status={partnerData.status} />
            {partnerData.lastStatusUpdate && (
              <Text style={styles.lastUpdate}>
                Last Updated: {new Date(partnerData.lastStatusUpdate).toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        <InfoSection title="Personal Information" data={partnerData.personalInfo} />
        <InfoSection title="Vehicle Information" data={partnerData.vehicleInfo} />
        <InfoSection title="Address" data={partnerData.address} />

        {hasDocuments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>
            {partnerData.documents.drivingLicense && (
              <TouchableOpacity 
                style={styles.documentRow}
                onPress={() => handleDocumentPress('drivingLicense')}
              >
                <MaterialIcons name="assignment" size={24} color="#666" />
                <Text style={styles.documentText}>Driving License</Text>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            )}
            {partnerData.documents.idProof && (
              <TouchableOpacity 
                style={styles.documentRow}
                onPress={() => handleDocumentPress('idProof')}
              >
                <MaterialIcons name="badge" size={24} color="#666" />
                <Text style={styles.documentText}>ID Proof</Text>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}

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
    backgroundColor: '#f5f5f5',
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  lastUpdate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  value: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
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
});

export default DeliveryPartnerProfile;