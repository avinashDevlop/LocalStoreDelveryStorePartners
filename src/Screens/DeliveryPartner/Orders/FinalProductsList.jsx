import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome,
} from "@expo/vector-icons";
import api from "../../../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DeliveryCompletionScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetchOrderData();
  }, []);

  const formatOrderData = (rawData) => {
    // Since the data comes in an object with order ID as key, get the first order
    const orderKey = Object.keys(rawData)[0];
    const orderDetails = rawData[orderKey];

    // Transform items object into array format
    const itemsArray = Object.entries(orderDetails.items || {}).map(
      ([name, details]) => ({
        name: name,
        quantity: `${details.quantity} ${details.unit}`,
        itemsQuantity:details.itemsQuantity,
        price: details.price || 0,
      })
    );

    // Construct full address from address object
    const addressParts = [
      orderDetails.address?.doorNo,
      orderDetails.address?.street,
      orderDetails.address?.area,
      orderDetails.address?.landmark,
      orderDetails.address?.city,
      orderDetails.address?.district,
      orderDetails.address?.state,
    ]
      .filter(Boolean)
      .join(", ");

    // Format customer name
    const customerName = [
      orderDetails.address?.firstName,
      orderDetails.address?.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      orderId: orderDetails.orderId,
      orderDate: orderDetails.orderDate,
      status: orderDetails.status,
      customer: {
        name: customerName || "N/A",
        phone: orderDetails.userId || "N/A",
        address: addressParts || "N/A",
      },
      items: itemsArray,
      payment: {
        subtotal: orderDetails.pricing?.subtotal || 0,
        deliveryFee: orderDetails.pricing?.deliveryCharge || 0,
        total: orderDetails.pricing?.total || 0,
        method:
          orderDetails.payment?.method === "cod"
            ? "Cash on Delivery"
            : orderDetails.payment?.method || "N/A",
      },
    };
  };

  const fetchOrderData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const phoneNumber = await AsyncStorage.getItem("userId");
      if (!phoneNumber) {
        throw new Error("User ID not found");
      }

      const response = await api.get(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/OutForDelivery.json`
      );
      const formattedData = formatOrderData(response.data);
      setOrderData(formattedData);
    } catch (error) {
      console.error("Error fetching order data:", error);
      setFetchError(error.message || "Failed to fetch order data");
    } finally {
      setLoading(false);
    }
  };

  const handlePhonePress = () => {
    if (orderData?.customer?.phone) {
      Linking.openURL(`tel:${orderData.customer.phone}`);
    }
  };

  const handleCancelDelivery = () => {
    Alert.alert(
      "Cancel Delivery",
      "Are you sure you want to cancel this delivery?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const phoneNumber = await AsyncStorage.getItem("userId");
              // First, get the specific order data from OutForDelivery
              const response = await api.get(
                `/Accounts/DeliveryPartner/${phoneNumber}/Orders/OutForDelivery.json`
              );
              const orderKey = Object.keys(response.data)[0];
              const orderData = response.data[orderKey];

              orderData.status = "Canceled";

              // Store the fetched data in the "OrderDelivered" path
              await api.put(
                `/Accounts/DeliveryPartner/${phoneNumber}/Orders/CanceledOrders/${orderData.orderId}.json`,
                orderData
              );

              //and also update in main
              await api.put(
                `/Orders/CanceledOrders/${orderData.orderId}.json`,
                orderData
              );

              await api.patch(
                `/Accounts/Users/${orderData.userId}/Orders/${orderData.orderAddress}.json`,
                { status: "Canceled" }
              );

              await api.patch(
                `/Accounts/Users/${orderData.userId}/Orders/${orderData.orderAddress}/payment.json`,
                { status: "Canceled" }
              );

              await api.delete(
                `/Accounts/DeliveryPartner/${phoneNumber}/Orders/OutForDelivery/${orderData.orderId}.json`
              );
              await api.delete(
                `/Orders/OutForDelivery/${orderData.orderId}.json`
              );

              navigation.navigate("DeliveryCompleteScreen", {
                status: "Canceled",
              });
            } catch (error) {
              Alert.alert("Error", "Failed to cancel delivery");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteDelivery = () => {
    Alert.alert(
      "Complete Delivery",
      "Confirm that you have delivered the order to the customer?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            setLoading(true);
            try {
              const phoneNumber = await AsyncStorage.getItem("userId");
              // First, get the specific order data from OutForDelivery
              const response = await api.get(
                `/Accounts/DeliveryPartner/${phoneNumber}/Orders/OutForDelivery.json`
              );
              const orderKey = Object.keys(response.data)[0];
              const orderData = response.data[orderKey];

              orderData.status = "Delivered";

              // Store the fetched data in the "OrderDelivered" path
              await api.put(
                `/Accounts/DeliveryPartner/${phoneNumber}/Orders/DeliveredOrders/${orderData.orderId}.json`,
                orderData
              );

              //and also update in main
              await api.put(
                `/Orders/DeliveredOrders/${orderData.orderId}.json`,
                orderData
              );

              await api.patch(
                `/Accounts/Users/${orderData.userId}/Orders/${orderData.orderAddress}.json`,
                { status: "Delivered" }
              );

              await api.patch(
                `/Accounts/Users/${orderData.userId}/Orders/${orderData.orderAddress}/payment.json`,
                { status: "completed" }
              );

              

              await api.delete(
                `/Accounts/DeliveryPartner/${phoneNumber}/Orders/OutForDelivery/${orderData.orderId}.json`
              );
              await api.delete(
                `/Orders/OutForDelivery/${orderData.orderId}.json`
              );

              navigation.navigate("DeliveryCompleteScreen", {
                status: "completed",
              });
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to complete delivery");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError || !orderData || !orderData.customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {fetchError || "Order data not found"}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} bounces={false}>
        {/* Customer Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="package-variant"
              size={24}
              color="#1a73e8"
            />
            <Text style={styles.cardTitle}>Order #{orderData.orderId}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{orderData.customer.name}</Text>
            <TouchableOpacity
              style={styles.phoneContainer}
              onPress={handlePhonePress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <FontAwesome name="phone" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#1a73e8" />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.addressText}>{orderData.customer.address}</Text>
        </View>

        {/* Order Items */}
        {orderData.items && orderData.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Items</Text>
            <View style={styles.divider} />
            {orderData.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>
                    Quantity: {item.itemsQuantity} x {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment Details */}
        {orderData.payment && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="credit-card"
                size={24}
                color="#1a73e8"
              />
              <Text style={styles.cardTitle}>Payment Details</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Subtotal</Text>
                <Text style={styles.paymentValue}>
                  ₹{orderData.payment.subtotal}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Delivery Fee</Text>
                <Text style={styles.paymentValue}>
                  ₹{orderData.payment.deliveryFee}
                </Text>
              </View>
              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>
                  ₹{orderData.payment.total}
                </Text>
              </View>
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethod}>
                  Payment Method: {orderData.payment.method}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, loading && styles.disabledButton]}
          onPress={handleCancelDelivery}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.completeButton, loading && styles.disabledButton]}
          onPress={handleCompleteDelivery}
          disabled={loading}
        >
          <Text style={styles.completeButtonText}>Complete Delivery</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },

  // Card styles
  card: {
    backgroundColor: "white",
    margin: 12,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#2c3e50",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },

  customerInfo: {
    flexDirection: "row", // Align items in a row
    alignItems: "center", // Vertically align items
    justifyContent: "space-between", // Distribute space between items
    paddingVertical: 8, // Add vertical padding
  },
  customerName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1, // Take up available space
    marginRight: 12, // Add spacing between name and icon
  },
  phoneContainer: {
    padding: 4, // Add padding for touchable area
  },
  iconContainer: {
    backgroundColor: "#1a73e8", // Icon background color
    width: 32, // Width of the circle
    height: 32, // Height of the circle
    borderRadius: 16, // Half of width/height for a perfect circle
    justifyContent: "center", // Center the icon vertically
    alignItems: "center", // Center the icon horizontally
  },

  addressText: {
    fontSize: 15,
    color: "#34495e",
    lineHeight: 22,
  },

  // Item styles
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },

  // Payment styles
  paymentDetails: {
    marginTop: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  paymentLabel: {
    color: "#7f8c8d",
    fontSize: 15,
  },
  paymentValue: {
    fontWeight: "600",
    fontSize: 15,
    color: "#2c3e50",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2c3e50",
  },
  totalValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2c3e50",
  },
  paymentMethodContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  paymentMethod: {
    fontSize: 15,
    color: "#34495e",
  },

  // Button styles
  buttonContainer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#fee2e2",
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  completeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#2c3e50",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  backButton: {
    padding: 12,
    backgroundColor: "#1a73e8",
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default DeliveryCompletionScreen;
