import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../api";

// Move EmptyOrdersMessage outside of OrdersScreen
const EmptyOrdersMessage = ({
  isOnline,
  phoneNumber,
  notifiedOrdersRef,
  setNewOrders,
  playSound,
}) => {
  useEffect(() => {
    const fetchNewOrders = async () => {
      try {
        if (!phoneNumber) {
          console.error("Phone number is not available.");
          return;
        }

        const response = await api.get(
          `/Accounts/DeliveryPartner/${phoneNumber}/Orders/NewOrders.json`
        );

        if (response.data) {
          const orders = Object.entries(response.data || {}).map(
            ([key, value]) => ({
              id: key,
              items: value.items || [],
              ...value,
            })
          );

          // Check for new orders that haven't been notified
          const newUnnotifiedOrders = orders.filter(
            (order) => !notifiedOrdersRef.current.has(order.id)
          );

          // If there are truly new orders, play sound once
          if (newUnnotifiedOrders.length > 0) {
            playSound();

            // Add new orders to the notified set
            newUnnotifiedOrders.forEach((order) => {
              notifiedOrdersRef.current.add(order.id);
            });
          }

          setNewOrders(orders);
        } else {
          setNewOrders([]);
        }
      } catch (error) {
        console.error("Error fetching new orders:", error);
      }
    };

    if (isOnline) {
      fetchNewOrders(); // Initial fetch
      const interval = setInterval(fetchNewOrders, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOnline, phoneNumber, notifiedOrdersRef, setNewOrders, playSound]);

  if (!isOnline) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateTitle}>You're Currently Offline</Text>
        <Text style={styles.emptyStateText}>
          Toggle the switch above to go online and start receiving orders
        </Text>
        <View style={styles.switchIndicator}>
          <Text style={styles.switchIndicatorText}>↑</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.emptyStateContainer}>
      <ActivityIndicator size="large" color="#00A67E" style={styles.loader} />
      <Text style={styles.emptyStateTitle}>Searching for Orders</Text>
      <Text style={styles.emptyStateText}>
        Stay online and you'll be notified when new orders arrive
      </Text>
    </View>
  );
};

const OrdersScreen = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [sound, setSound] = useState();
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [newOrders, setNewOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const notifiedOrdersRef = useRef(new Set());

  // Function to play alert sound in a loop
  async function playSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("./Alert/alert.wav")
      );
      setSound(sound);
      await sound.setIsLoopingAsync(true); // Loop the sound
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  // Function to stop the sound
  async function stopSound() {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null); // Clear the sound instance
      }
    } catch (error) {
      console.error("Error stopping sound:", error);
    }
  }

  // Initialize delivery partner status
  useEffect(() => {
    const initializeStatus = async () => {
      try {
        const userPhone = await AsyncStorage.getItem("userId");
        setPhoneNumber(userPhone);

        if (userPhone) {
          // Fetch the status from the database
          const profileResponse = await api.get(
            `/Accounts/DeliveryPartner/${userPhone}/profile.json`
          );
          if (profileResponse.data && profileResponse.data.status) {
            setIsOnline(profileResponse.data.status === "online");
          }
        }
      } catch (error) {
        console.error("Error fetching initial status:", error);
        Alert.alert(
          "Error",
          "Failed to fetch delivery partner status. Please try again later."
        );
      }
    };

    initializeStatus();
  }, []);

  const handleStatusToggle = async (newStatus) => {
    if (!phoneNumber) {
      Alert.alert("Error", "User ID not found. Please log in again.");
      return;
    }

    try {
      // Update the profile status in the database
      await api.patch(`/Accounts/DeliveryPartner/${phoneNumber}/profile.json`, {
        status: newStatus ? "online" : "offline",
        timestamp: new Date().toISOString(),
      });

      // Handle online/offline status in WaitingForOrders
      if (newStatus) {
        // Add to WaitingForOrders when going online
        await api.put(
          `/Accounts/DeliveryPartner/OnlineDeliveryPartner/WaitingForOrders/${phoneNumber}.json`,
          {
            phoneNumber,
            timestamp: new Date().toISOString(),
            status: "waiting",
          }
        );
      } else {
        // Remove from WaitingForOrders when going offline
        await api.delete(
          `/Accounts/DeliveryPartner/OnlineDeliveryPartner/WaitingForOrders/${phoneNumber}.json`
        );
      }

      // Update local state
      setIsOnline(newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status. Please try again.");
      // Revert switch if update fails
      setIsOnline(!newStatus);
    }
  };

  const ShopWithProducts = async (orderId, items, stores, deliveryDetails) => {
    try {
      // Transform stores structure
      const transformedStores = Object.entries(stores).reduce(
        (acc, [phoneNumber, data]) => {
          if (data.profile) {
            acc[phoneNumber] = {
              categories: data.profile.categories,
              userId: phoneNumber,
              products: {}, // Initialize empty products object for each category
              pickUp:false,
            };

            // Initialize products object with empty objects for each category
            data.profile.categories.forEach((category) => {
              acc[phoneNumber].products[category] = {};
            });
          }
          return acc;
        },
        {}
      );

      // Assign products to appropriate stores based on category
      Object.entries(items).forEach(([itemName, itemData]) => {
        const { category, ...productDetails } = itemData;

        // Find stores that have this category and assign the product
        Object.keys(transformedStores).forEach((storeId) => {
          if (transformedStores[storeId].categories.includes(category)) {
            // Ensure category object exists
            if (!transformedStores[storeId].products[category]) {
              transformedStores[storeId].products[category] = {};
            }
            // Add product to the appropriate category
            transformedStores[storeId].products[category][itemName] =
              productDetails;
          }
        });
      });

      // Send products to respective stores
      const apiCalls = Object.entries(transformedStores).map(
        async ([storeId, storeData]) => {
          // Only send if store has products
          const hasProducts = Object.values(storeData.products).some(
            (category) => Object.keys(category).length > 0
          );

          if (hasProducts) {
            try {
              // Send order to store
              await api.put(
                `/Accounts/Stores/${storeId}/Orders/NewOrder/${orderId}.json`,
                {
                  orderId: orderId,
                  timestamp: new Date().toISOString(),
                  products: storeData.products,
                  status: "New Order",
                  deliveryPartnerNumber: phoneNumber,
                  deliveryInfo: deliveryDetails,
                }
              );
            } catch (error) {
              console.error(`Error sending order to store ${storeId}:`, error);
              throw error; // Propagate error to be handled by caller
            }
          }
        }
      );

      // Wait for all API calls to complete
      await Promise.all(apiCalls);

      return transformedStores;
    } catch (error) {
      console.error("Error in ShopWithProducts:", error);
      throw error; // Propagate error to be handled by caller
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      if (!phoneNumber) {
        console.error("Phone number is not available");
        return;
      }
      setLoading(true);
      stopSound(); // Stop sound when an order is accepted

      // Access the store data for linking the products together
      const storesResponse = await api.get(`/Accounts/Stores.json`);

      // First, get the specific order data from NewOrders
      const orderResponse = await api.get(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/NewOrders/${orderId}.json`
      );

      if (!orderResponse.data) {
        console.error("Order not found");
        return;
      } else if (!storesResponse.data) {
        console.error("stores not found");
        return;
      }

      const StoresFilteredProducts = await ShopWithProducts(
        orderId,
        orderResponse.data.items,
        storesResponse.data,
        orderResponse.data.delivery,
      );
      // Store the filtered products data along with original order data
      const combinedOrderData = {
        ...orderResponse.data,
        storesWithProducts: StoresFilteredProducts,
        deliveryPartnerId : `${phoneNumber}`,
        status: "Accepted",
      };

      // Update AcceptedOrder with the combined data
      await api.put(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder/${orderId}.json`,
        combinedOrderData
      );

      // Update the main orders
      await api.put(
        `/Orders/AcceptedOrders/${orderId}.json`,
        combinedOrderData
      );

      // Update delivery partner status in OrderDelivering
      await api.put(
        `/Accounts/DeliveryPartner/OnlineDeliveryPartner/OrderDelivering/${phoneNumber}.json`,
        {
          phoneNumber: phoneNumber,
          status: "Accepted",
          timestamp: new Date().toISOString(),
        }
      );

      // Update status in user's account
      if (orderResponse.data.userId && orderResponse.data.orderAddress) {
        await api.patch(
          `/Accounts/Users/${orderResponse.data.userId}/Orders/${orderResponse.data.orderAddress}.json`,
          {
            status: "Order Confirmed",
          }
        );
      }

      // Delete the order from NewOrders
      await api.delete(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/NewOrders/${orderId}.json`
      );

      // Delete the order from NewOrders in the main
      await api.delete(`/Orders/NewOrders/${orderId}.json`);

      // Update local state
      setNewOrders((prev) => prev.filter((order) => order.id !== orderId));
      notifiedOrdersRef.current.delete(orderId); // Remove from notified set
      navigation.navigate("PickUpProducts", { orderId });
    } catch (error) {
      stopSound();
      console.error("Error handling order acceptance:", error);
      Alert.alert("Error", "Failed to accept the order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      if (!phoneNumber) {
        console.error("Phone number is not available");
        return;
      }

      // First, get the order details before deleting
      const orderResponse = await api.get(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/NewOrders/${orderId}.json`
      );

      if (!orderResponse.data) {
        console.error("Order not found");
        return;
      }
      const rejectedOrderData = {
        ...orderResponse.data,
        status: "Rejected",
        timestamp: new Date().toISOString(),
        rejectionId: `${orderId}-${Date.now()}`,
      };

      // Move the order to RejectedOrders
      await api.put(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/RejectedOrders/${orderId}.json`,
        rejectedOrderData
      );

      // Put the order back into the main NewOrders queue
      await api.put(`/Orders/NewOrders/${orderId}.json`, orderResponse.data);

      // Get the delivery partner's current status from OrderDelivering
      const deliveringStatusResponse = await api.get(
        `/Accounts/DeliveryPartner/OnlineDeliveryPartner/OrderDelivering/${phoneNumber}.json`
      );

      if (deliveringStatusResponse.data) {
        // Move the delivery partner to WaitingForOrders
        await api.put(
          `/Accounts/DeliveryPartner/OnlineDeliveryPartner/WaitingForOrders/${phoneNumber}.json`,
          {
            phoneNumber,
            timestamp: new Date().toISOString(),
            status: "waiting",
          }
        );

        // Delete the entry from OrderDelivering
        await api.delete(
          `/Accounts/DeliveryPartner/OnlineDeliveryPartner/OrderDelivering/${phoneNumber}.json`
        );
      }

      // Delete the order from delivery partner's queue
      await api.delete(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/NewOrders/${orderId}.json`
      );

      // Update local state
      setNewOrders((prev) => prev.filter((order) => order.id !== orderId));
      notifiedOrdersRef.current.delete(orderId); // Remove from notified set
      stopSound(); // Stop sound when an order is rejected
      fetchRecentOrders();
    } catch (error) {
      console.error("Error handling order rejection:", error);
      Alert.alert("Error", "Failed to reject the order. Please try again.");
      stopSound();
    }
  };

  // Add function to fetch recent orders
  const fetchRecentOrders = async () => {
    if (!phoneNumber) return;

    try {
      // Fetch both accepted and rejected orders
      const [acceptedResponse, rejectedResponse] = await Promise.all([
        api.get(
          `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder.json`
        ),
        api.get(
          `/Accounts/DeliveryPartner/${phoneNumber}/Orders/RejectedOrders.json`
        ),
      ]);

      const acceptedOrders = acceptedResponse.data
        ? Object.entries(acceptedResponse.data).map(([key, value]) => ({
            id: key,
            ...value,
            status: "Accepted",
            timestamp: new Date(value.timestamp || Date.now()),
            uniqueKey: `accepted-${key}`,
          }))
        : [];

      const rejectedOrders = rejectedResponse.data
        ? Object.entries(rejectedResponse.data).map(([key, value]) => ({
            id: key,
            ...value,
            status: "Rejected",
            timestamp: new Date(value.timestamp || Date.now()),
            uniqueKey: `rejected-${value.rejectionId || key}`, 
          }))
        : [];

      // Combine and sort by timestamp
      const allRecentOrders = [...acceptedOrders, ...rejectedOrders]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Show only last 10 orders

      setRecentOrders(allRecentOrders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
    }
  };

  // Add useEffect to fetch recent orders
  useEffect(() => {
    if (phoneNumber) {
      fetchRecentOrders();
      const interval = setInterval(fetchRecentOrders, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [phoneNumber]);

  const handleRecentOrderPress = (order) => {
    if (order.status === "Accepted") {
      navigation.navigate("PickUpProducts", { orderId: order.id });
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Online/Offline Switch */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Delivery Partner</Text>
        <View style={styles.switchContainer}>
          <Text
            style={[
              styles.statusText,
              { color: isOnline ? "#4CAF50" : "#757575" },
            ]}
          >
            {isOnline ? "Online" : "Offline"}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleStatusToggle}
            trackColor={{ false: "#757575", true: "#4CAF50" }}
            thumbColor={isOnline ? "#fff" : "#f4f3f4"}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* New Orders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Orders</Text>
            {newOrders.length === 0 ? (
              <EmptyOrdersMessage
                isOnline={isOnline}
                phoneNumber={phoneNumber}
                notifiedOrdersRef={notifiedOrdersRef}
                setNewOrders={setNewOrders}
                playSound={playSound}
              />
            ) : (
              newOrders.map((order, index) => {
                const uniqueKey = `${order.id}-${index}`; // Combine id and index for uniqueness

                // Extract items and format them
                const items = order.items
                  ? Object.entries(order.items)
                      .map(
                        ([key, value]) =>
                          `${value.name} (${value.quantity} ${value.unit})`
                      )
                      .join(", ")
                  : "No items available";

                // Extract delivery address
                const deliveryAddress = order.address
                  ? `${order.address.doorNo}, ${order.address.street}, ${order.address.area}, ${order.address.city}, ${order.address.district}, ${order.address.state}`
                  : "Address not available";

                return (
                  <View key={uniqueKey} style={styles.orderCard}>
                    {/* Order Header */}
                    <View style={styles.orderHeader}>
                      <Text style={styles.OrderId}>#{order.orderId}</Text>
                      <Text style={styles.method}>{order.delivery.method}</Text>
                    </View>

                    {/* Order Details */}
                    <View style={styles.orderDetails}>
                      <Text style={styles.items}>
                        <Text style={styles.label}>Items: </Text>
                        {items}
                      </Text>
                      <Text style={styles.address}>
                        <Text style={styles.label}>Delivery to: </Text>
                        {deliveryAddress}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.rejectButton]}
                        onPress={() => handleRejectOrder(order.id)}
                      >
                        <Text style={styles.buttonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.acceptButton]}
                        onPress={() => handleAcceptOrder(order.id)}
                      >
                        <Text style={styles.buttonText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Recent Orders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {recentOrders.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>No Recent Orders</Text>
                <Text style={styles.emptyStateText}>
                  Your completed and rejected orders will appear here
                </Text>
              </View>
            ) : (
              recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.uniqueKey}
                  style={[
                    styles.recentOrderCard,
                    order.status === "Accepted" && styles.acceptedOrderCard
                  ]}
                  onPress={() => handleRecentOrderPress(order)}
                  activeOpacity={order.status === "Accepted" ? 0.7 : 1}
                >
                  <View style={styles.recentOrderHeader}>
                    <Text style={styles.OrderId}>#{order.orderId}</Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            order.status === "Accepted" ? "#E6F4F1" : "#FFE5E7",
                          color:
                            order.status === "Accepted" ? "#00A67E" : "#FF4757",
                        },
                      ]}
                    >
                      {order.status}
                    </Text>
                  </View>

                  <View style={styles.orderDetails}>
                    <Text style={styles.items}>
                      <Text style={styles.label}>Items: </Text>
                      {Object.entries(order.items || {})
                        .map(
                          ([_, item]) =>
                            `${item.name} (${item.itemsQuantity} X ${item.quantity} ${item.unit})`
                        )
                        .join(", ")}
                    </Text>

                    <Text style={styles.address}>
                      <Text style={styles.label}>Delivery to: </Text>
                      {order.address
                        ? `${order.address.doorNo}, ${order.address.street}, ` +
                          `${order.address.area}, ${order.address.city}, ` +
                          `${order.address.district}, ${order.address.state}`
                        : "Address not available"}
                    </Text>
                  </View>

                  <View style={styles.recentOrderFooter}>
                    <Text style={styles.timestamp}>
                      {order.timestamp.toLocaleString()}
                    </Text>
                    <Text style={styles.method}>
                      {order.delivery?.method || "N/A"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF", // Lighter, modern background
  },
  headerContainer: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    marginRight: 8,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    elevation: 5,
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#F0F2F8",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F8",
  },
  OrderId: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    letterSpacing: 0.5,
  },
  method: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00A67E",
    backgroundColor: "#E6F4F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  orderDetails: {
    marginBottom: 5,
    backgroundColor: "#F8F9FF",
    padding: 12,
    borderRadius: 12,
  },
  items: {
    fontSize: 15,
    color: "#4A5568",
    marginBottom: 8,
    lineHeight: 22,
  },
  address: {
    fontSize: 15,
    color: "#4A5568",
    marginBottom: 8,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rejectButton: {
    backgroundColor: "#FF4757", // Modern red
  },
  acceptButton: {
    backgroundColor: "#00A67E", // Modern green
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  // Adding styles for bold labels in order details
  label: {
    fontWeight: "700",
    color: "#2C3E50",
  },
  recentOrderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#F0F2F8",
  },
  recentOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentOrderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FF",
    padding: 10,
    borderRadius: 10,
  },
  timestamp: {
    fontSize: 14,
    color: "#718096",
    fontWeight: "500",
  },
  emptyStateContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    elevation: 2,
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F0F2F8",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#718096",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  loader: {
    marginBottom: 16,
  },
  switchIndicator: {
    marginTop: 16,
  },
  switchIndicatorText: {
    fontSize: 24,
    color: "#718096",
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  recentOrderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F8",
    paddingLeft: 1,
  },
});

export default OrdersScreen;
