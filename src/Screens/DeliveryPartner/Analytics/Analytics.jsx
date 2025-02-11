import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimateNumber from 'react-native-animate-number';
import api from "../../../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const OrdersDashboard = () => {
  const [data, setData] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    canceledOrders: 0,
    rejectedOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchOrdersData();
    }, [])
  );

  const fetchOrdersData = async () => {
    setLoading(true);
    try {
      const phoneNumber = await AsyncStorage.getItem("userId");
  
      const fetchData = async (url) => {
        try {
          const response = await api.get(url);
          return response.data && typeof response.data === "object" ? Object.keys(response.data).length : 0;
        } catch (error) {
          console.warn(`Error fetching ${url}:`, error.message);
          return 0;
        }
      };
  
      const [deliveredOrders, canceledOrders, rejectedOrders] = await Promise.all([
        fetchData(`/Accounts/DeliveryPartner/${phoneNumber}/Orders/DeliveredOrders.json`),
        fetchData(`/Accounts/DeliveryPartner/${phoneNumber}/Orders/CanceledOrders.json`),
        fetchData(`/Accounts/DeliveryPartner/${phoneNumber}/Orders/RejectedOrders.json`) // Fixed typo
      ]);

      const totalOrders = deliveredOrders + canceledOrders + rejectedOrders;
  
      setData({
        totalOrders,
        deliveredOrders,
        canceledOrders,
        rejectedOrders
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdersData();
  };
  
  const calculatePercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  const metrics = [
    {
      title: 'Total Orders',
      value: data.totalOrders,
      icon: 'cube-outline',
      gradientColors: ['#6a11cb', '#2575fc']
    },
    {
      title: 'Delivered Orders',
      value: data.deliveredOrders,
      icon: 'checkmark-circle-outline',
      gradientColors: ['#4CAF50', '#8BC34A'],
      percentage: calculatePercentage(data.deliveredOrders, data.totalOrders)
    },
    {
      title: 'Canceled Orders',
      value: data.canceledOrders,
      icon: 'close-circle-outline',
      gradientColors: ['#FF416C', '#FF4B2B'],
      percentage: calculatePercentage(data.canceledOrders, data.totalOrders)
    },
    {
      title: 'Rejected Orders',
      value: data.rejectedOrders,
      icon: 'remove-circle-outline',
      gradientColors: ['#FF9800', '#F57C00'],
      percentage: calculatePercentage(data.rejectedOrders, data.totalOrders)
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a11cb" />
        <Text style={styles.loadingText}>Fetching Orders...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.cardsContainer}>
        {metrics.map((metric, index) => (
          <TouchableOpacity 
            key={index} 
            activeOpacity={0.9}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={metric.gradientColors}
              style={styles.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardHeader}>
                <Ionicons name={metric.icon} size={24} color="#fff" />
                <Text style={styles.cardTitle}>{metric.title}</Text>
              </View>
              
              <View style={styles.cardContent}>
                <AnimateNumber
                  value={metric.value}
                  formatter={(val) => parseInt(val).toString()}
                  timing="easeOut"
                  style={styles.cardValue}
                />
                
                {metric.percentage && (
                  <View style={styles.percentageContainer}>
                    <Text style={styles.percentageText}>{metric.percentage}%</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  cardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: width * 0.85,
    marginVertical: 8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  percentageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#6a11cb',
  }
});

export default OrdersDashboard;
