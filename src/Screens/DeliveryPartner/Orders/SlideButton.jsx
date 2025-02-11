import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../api";

const SlideButton = () => {
  const navigation = useNavigation();
  const [slideComplete, setSlideComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;
  const windowWidth = Dimensions.get('window').width;
  const buttonWidth = windowWidth - 24;
  const slideThreshold = buttonWidth * 0.75;

  const handleOrderStatusUpdate = async () => {
    try {
      setIsProcessing(true);
      const phoneNumber = await AsyncStorage.getItem("userId");
      
      if (!phoneNumber) {
        throw new Error("User ID not found");
      }
  
      // Get and update delivery partner's order
      const { orderData } = await getDeliveryPartnerOrder(phoneNumber);
      await updateDeliveryPartnerOrderStatus(phoneNumber, orderData);
      
      // Update user's order status
      await updateUserOrderStatus(orderData);
      
      // Get and update main order
      const mainOrderData = await getMainOrder(orderData.orderId);
      await updateMainOrderStatus(mainOrderData);
      
      // Clean up old order records
      await cleanupOldOrders(phoneNumber, orderData, mainOrderData);

      
  
      // Navigate to next screen
      navigation.navigate('FinalProductList');
    } catch (error) {
      handleError(error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper Functions
  const getDeliveryPartnerOrder = async (phoneNumber) => {
    const response = await api.get(
      `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder.json`
    );
    
    const orderKey = Object.keys(response.data)[0];
    const orderData = response.data[orderKey];
  
    if (!orderData) {
      throw new Error("No order data found");
    }
  
    return { orderData };
  };
  
  const updateDeliveryPartnerOrderStatus = async (phoneNumber, orderData) => {
    const combinedOrderData = {
      ...orderData,
      status: 'Out For Delivery',
    };
  
    await api.put(
      `/Accounts/DeliveryPartner/${phoneNumber}/Orders/OutForDelivery/${orderData.orderId}.json`,
      combinedOrderData
    );
  };
  
  const updateUserOrderStatus = async (orderData) => {
    if (orderData.userId && orderData.orderAddress) {
      await api.patch(
        `/Accounts/Users/${orderData.userId}/Orders/${orderData.orderAddress}.json`,
        { status: "Out For Delivery" }
      );
    }
  };
  
  const getMainOrder = async (orderId) => {
    const response = await api.get('/Orders/AcceptedOrders.json');
    const mainOrderData = response.data[orderId];
  
    if (!mainOrderData) {
      throw new Error("No order data found");
    }
  
    return mainOrderData;
  };
  
  const updateMainOrderStatus = async (mainOrderData) => {
    const mainCombinedOrderData = {
      ...mainOrderData,
      status: 'Out For Delivery',
    };
  
    await api.put(
      `/Orders/OutForDelivery/${mainOrderData.orderId}.json`,
      mainCombinedOrderData
    );
  };
  
  const cleanupOldOrders = async (phoneNumber, orderData, mainOrderData) => {
    await Promise.all([
      api.delete(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder/${orderData.orderId}.json`
      ),
      api.delete(
        `/Orders/AcceptedOrders/${mainOrderData.orderId}.json`
      )
    ]);
  };
  
  const handleError = (error) => {
    console.error("Error updating order status:", error);
    Alert.alert(
      "Error",
      "Failed to start delivery. Please try again."
    );
    
    // Reset slide button on error
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 5
    }).start();
    setSlideComplete(false);
  };
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isProcessing,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, buttonWidth - 50));
        panX.setValue(newX);
      },
      onPanResponderRelease: async (_, gestureState) => {
        if (gestureState.dx >= slideThreshold) {
          Animated.spring(panX, {
            toValue: buttonWidth - 50,
            useNativeDriver: false,
            bounciness: 5
          }).start(() => {
            setSlideComplete(true);
            handleOrderStatusUpdate();
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 5
          }).start();
        }
      },
    })
  ).current;

  const buttonOpacity = panX.interpolate({
    inputRange: [0, buttonWidth - 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const progressOpacity = panX.interpolate({
    inputRange: [0, buttonWidth - 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: panX.interpolate({
              inputRange: [0, buttonWidth - 50],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
            opacity: progressOpacity,
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.slideText,
          {
            opacity: buttonOpacity,
          },
        ]}>
        <Text style={styles.buttonText}>
          {isProcessing ? 'Processing...' : 'Slide to Start Delivery'}
        </Text>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slider,
          {
            transform: [{ translateX: panX }],
          },
        ]}>
        <View style={styles.sliderCircle}>
          <Ionicons 
            name={isProcessing ? "hourglass" : (slideComplete ? "checkmark" : "arrow-forward")} 
            size={24} 
            color="white" 
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    height: 56,
    backgroundColor: '#F0F4FF',
    borderRadius: 28,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#4A6DFF',
  },
  slideText: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A6DFF',
  },
  slider: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 50,
    height: 50,
  },
  sliderCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#4A6DFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A6DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default SlideButton;