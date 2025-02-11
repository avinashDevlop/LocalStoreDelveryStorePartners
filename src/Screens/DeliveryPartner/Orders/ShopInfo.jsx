import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Linking, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ShopInfoScreen = ({ route }) => {
  const { storeInfo } = route.params;
  
  const openMap = () => {
    if (storeInfo.address.googleMapUrl) {
      Linking.openURL(storeInfo.address.googleMapUrl);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: storeInfo.documents.storeImage }}
          style={styles.storeImage}
          resizeMode="contain"
        />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{storeInfo.status}</Text>
        </View>
      </View>

      {/* Store Info Section */}
      <View style={styles.section}>
        <Text style={styles.storeName}>{storeInfo.storeInfo.name}</Text>
        <Text style={styles.ownerName}>Owner: {storeInfo.storeInfo.ownerName}</Text>
        
        <View style={styles.infoRow}>
          <Feather name="clock" size={20} color="#555" />
          <Text style={styles.infoText}>
            {storeInfo.storeInfo.operatingHours.opening} - {storeInfo.storeInfo.operatingHours.closing}
          </Text>
        </View>

        {/* Description Section */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About Store</Text>
          <Text style={styles.descriptionText}>
            {storeInfo.storeInfo.description}
          </Text>
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <Feather name="phone" size={20} color="#555" />
          <Text style={styles.infoText}>{storeInfo.storeInfo.phoneNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="phone-forwarded" size={20} color="#555" />
          <Text style={styles.infoText}>{storeInfo.storeInfo.alternatePhone}</Text>
        </View>
      </View>

      {/* Address Section */}
      <TouchableOpacity onPress={openMap} style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={20} color="#555" />
          <View>
            <Text style={styles.infoText}>{storeInfo.address.street}</Text>
            <Text style={styles.infoText}>{storeInfo.address.city}, {storeInfo.address.zipCode}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesContainer}>
          {storeInfo.categories.map((category, index) => (
            <View key={index} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    position: 'relative',
    width: width,
    height: width * 0.6, // Aspect ratio 5:3
    backgroundColor: '#ddd',
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  }
});

export default ShopInfoScreen;