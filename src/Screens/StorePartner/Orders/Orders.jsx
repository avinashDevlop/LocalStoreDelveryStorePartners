import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../api";

const CategoryItem = ({ name, items, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={{ marginLeft: level * 20 }}>
      <TouchableOpacity
        style={styles.categoryRow}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color="#666"
        />
        <Text style={styles.categoryText}>{name}</Text>
      </TouchableOpacity>

      {expanded &&
        items.map((item, index) => (
          <View key={index} style={[styles.itemRow, { marginLeft: 20 }]}>
            <View style={styles.itemWithBullet}>
              <View style={styles.bullet} />
              <Text style={styles.itemText}>{item.name}</Text>
            </View>
            <Text style={styles.quantityText}>
            {item.itemsQuantity} X {item.quantity} {item.unit}
            </Text>
          </View>
        ))}
    </View>
  );
};

const StorePartnerOrders = () => {
  const [newOrders, setNewOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleCall = async (phoneNumber) => {
    if (phoneNumber) {
      try {
        await Linking.openURL(`tel:${phoneNumber}`);
      } catch (error) {
        console.error('Error making phone call:', error);
      }
    }
  };

  const transformItems = (products) => {
    const transformed = {};
    
    if (products) {
      Object.entries(products).forEach(([category, items]) => {
        transformed[category.toLowerCase()] = Object.entries(items).map(([name, details]) => ({
          name: name,
          quantity: details.quantity || '1',
          itemsQuantity: details.itemsQuantity,
          unit: details.unit || 'unit'
        }));
      });
    }
    
    return transformed;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const isToday = (timestamp) => {
    const today = new Date();
    const date = new Date(timestamp);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isYesterday = (timestamp) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(timestamp);
    return date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
  };

  const fetchOrders = async () => {
    try {
      const storePhone = await AsyncStorage.getItem("userId");
      
      // Fetch new orders
      const newOrdersResponse = await api.get(`/Accounts/Stores/${storePhone}/Orders/NewOrder.json`);
      
      // Fetch previous orders
      const previousOrdersResponse = await api.get(`/Accounts/Stores/${storePhone}/Orders/PreviousOrders.json`);
      
      let transformedNewOrders = [];
      let transformedRecentOrders = [];

      // Transform new orders
      if (newOrdersResponse.data) {
        transformedNewOrders = Object.entries(newOrdersResponse.data)
          .map(([key, order]) => ({
            orderId: order.orderId || key,
            items: transformItems(order.products),
            status: order.status,
            time: formatTimestamp(order.timestamp),
            timestamp: order.timestamp,
            partnerNumber: order.deliveryPartnerNumber,
            deliveryInfo: {
              charge: order.deliveryInfo?.charge,
              estimatedTime: order.deliveryInfo?.estimatedTime,
              method: order.deliveryInfo?.method,
            }
          }))
          .filter(order => order.status === "New Order");
      }

      // Transform and filter recent orders (today and yesterday)
      if (previousOrdersResponse.data) {
        const allPreviousOrders = [];
        
        // Recursively get orders from the nested structure
        const extractOrders = (obj, year, month) => {
          Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              if (key.length === 4) { // Year
                extractOrders(value, key);
              } else if (key.length === 2) { // Month
                extractOrders(value, year, key);
              } else if (typeof value.status !== 'undefined') { // Order object
                allPreviousOrders.push({
                  ...value,
                  orderId: value.orderId || key,
                  year,
                  month
                });
              }
            }
          });
        };

        extractOrders(previousOrdersResponse.data);

        transformedRecentOrders = allPreviousOrders
          .filter(order => isToday(order.timestamp) || isYesterday(order.timestamp))
          .map(order => ({
            orderId: order.orderId,
            items: transformItems(order.products),
            status: order.status,
            time: formatTimestamp(order.timestamp),
            timestamp: order.timestamp,
            partnerNumber: order.deliveryPartnerNumber,
            deliveryInfo: {
              charge: order.deliveryInfo?.charge,
              estimatedTime: order.deliveryInfo?.estimatedTime,
              method: order.deliveryInfo?.method,
            }
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      setNewOrders(transformedNewOrders);
      setRecentOrders(transformedRecentOrders);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const OrderCard = ({ order }) => (
    // console.log(order),
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>#{order.orderId}</Text>
          <View style={[styles.statusBadge, 
            { backgroundColor: order.status === "New Order" ? '#FFE4B5' : '#98FB98' }
          ]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>
        <Text style={styles.timeText}>{order.deliveryInfo?.method}</Text>
      </View>

      <Text style={styles.orderDetails}>Order Details</Text>
      
      <View style={styles.itemsList}>
        {Object.entries(order.items).map(([category, items]) => (
          <CategoryItem
            key={category}
            name={category.charAt(0).toUpperCase() + category.slice(1)}
            items={items}
          />
        ))}
      </View>

      <View style={styles.deliveryInfo}>
        <View>
          <Text style={styles.label}>Delivery Info</Text>
          <Text style={styles.deliveryText}>{order.deliveryInfo.estimatedTime}</Text>
        </View>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleCall(order.partnerNumber)}
        >
          <Feather name="phone" size={16} color="#007AFF" />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyOrdersState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateCard}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.emptyStateLoader} />
        <Text style={styles.emptyStateTitle}>Waiting for Orders</Text>
        <Text style={styles.emptyStateDescription}>New orders will appear here automatically</Text>
      </View>
    </View>
  );


  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store Partner</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Feather name="bell" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Orders</Text>
          {newOrders.length === 0 ? (
            <EmptyOrdersState />
          ) : (
            newOrders.map((order, index) => (
              <OrderCard key={index} order={order} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.length === 0 ? (
            <View style={styles.noRecentOrders}>
              <Text style={styles.noOrdersText}>No recent orders</Text>
            </View>
          ) : (
            recentOrders.map((order, index) => (
              <OrderCard key={index} order={order} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Base container styles
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Lighter background for better contrast
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Enhanced header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  notificationButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },

  // Section styles
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // Enhanced order card styles
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 17,
    fontWeight: '600',
    marginRight: 10,
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  // Enhanced delivery method badge
  timeText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },

  // Enhanced order details
  orderDetails: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 12,
  },
  itemsList: {
    marginBottom: 16,
  },

  // Enhanced category and item styles
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingRight: 8,
  },
  itemWithBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginRight: 10,
  },
  itemText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  quantityText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // Enhanced delivery info section
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginTop: 16,
  },
  label: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  deliveryText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callButtonText: {
    marginLeft: 8,
    color: '#2563EB',
    fontWeight: '600',
  },

  // Enhanced empty state styles
  emptyStateContainer: {
    paddingVertical: 32,
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateLoader: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  noRecentOrders: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  noOrdersText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
});

export default StorePartnerOrders;