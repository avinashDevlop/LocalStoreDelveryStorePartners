import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Linking,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SlideButton from "./SlideButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../api";
import { useNavigation } from "@react-navigation/native";

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
            <Text style={styles.itemText}>{item.name}</Text>
            <Text style={styles.quantityText}>
            {item.itemsQuantity} X {item.quantity} {item.unit}
            </Text>
          </View>
        ))}
    </View>
  );
};

const StoreCard = ({ storeId, storeData, items, orderId }) => {
  const navigation = useNavigation();
  const [storeInfo, setStoreInfo] = useState(null);
  const [isPickupCompleted, setIsPickupCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
   // Group items by category for this store
   const groupItemsByCategory = () => {
    const groupedItems = {};

    // Filter items that belong to this store's categories
    Object.entries(items).forEach(([itemName, itemData]) => {
      if (storeData.categories.includes(itemData.category)) {
        if (!groupedItems[itemData.category]) {
          groupedItems[itemData.category] = [];
        }
        groupedItems[itemData.category].push({
          name: itemName,
          quantity: itemData.quantity,
          itemsQuantity: itemData.itemsQuantity,
          unit: itemData.unit,
        });
      }
    });

    return Object.entries(groupedItems).map(([category, items]) => ({
      name: category,
      items: items,
    }));
  };
  
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        // Fetch store profile info
        const storeResponse = await api.get(`/Accounts/Stores/${storeId}/profile.json`);
        setStoreInfo(storeResponse.data);
        
        // Fetch pickup status
        const phoneNumber = await AsyncStorage.getItem("userId");
        if (phoneNumber) {
          const pickupStatusResponse = await api.get(
            `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder/${orderId}/storesWithProducts/${storeResponse.data.account.userId}.json`
          );
          
          // Update local state based on database pickup status
          if (pickupStatusResponse.data) {
            setIsPickupCompleted(pickupStatusResponse.data.pickUp || false);
          }
        }
      } catch (error) {
        console.error("Error fetching store data:", error);
      }
    };

    fetchStoreData();
  }, [storeId, orderId]);

  const handlePickupComplete = async (storeId) => {
    try {
      setIsLoading(true);
      const phoneNumber = await AsyncStorage.getItem("userId");
      
      if (!phoneNumber || !storeInfo?.account?.userId) {
        throw new Error("Required information missing");
      }

      // Make API call to update pickup status
      await api.patch(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder/${orderId}/storesWithProducts/${storeInfo.account.userId}.json`,
        {
          pickUp: true,
          pickupTimestamp: new Date().toISOString()
        }
      );

       // 2. Fetch order details to get userId and orderAddress
       const orderResponse = await api.get(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder/${orderId}.json`
      );

      // 3. Update order status to "Order Packed" if required info exists
      if (orderResponse.data?.userId && orderResponse.data?.orderAddress) {
        await api.patch(
          `/Accounts/Users/${orderResponse.data.userId}/Orders/${orderResponse.data.orderAddress}.json`,
          {
            status: "Order Packed"
          }
        );
      }
      
        await api.patch(
          `/Orders/AcceptedOrders/${orderId}.json`,
          {
            status: "Order Packed"
          }
        );

        //store partner new order to perivous orders
        const newStoreOrderResponse = await api.get(
          `/Accounts/Stores/${storeId}/Orders/NewOrder/${orderId}.json`
        );
        const newStoreOrderData = newStoreOrderResponse.data;
        console.log(newStoreOrderData);
        newStoreOrderData.status = "Completed";
        // Get the current date details
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Ensure 2-digit format
        const date = String(currentDate.getDate()).padStart(2, '0');

        // Move the new order to the previous orders
        await api.put(
          `/Accounts/Stores/${storeId}/Orders/PreviousOrders/${year}/${month}/${date}/${orderId}.json`,
          newStoreOrderData
        );

        // Delete the data in the new order
        await api.delete(
          `/Accounts/Stores/${storeId}/Orders/NewOrder/${orderId}.json`
        );
        
      setIsPickupCompleted(true);
    } catch (error) {
      console.error("Error updating pickup status:", error);
      Alert.alert(
        "Error",
        "Failed to mark pickup as completed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCall = async () => {
    const phoneNumber = storeInfo?.account?.userId;
    if (phoneNumber) {
      try {
        await Linking.openURL(`tel:${phoneNumber}`);
      } catch (error) {
        console.error("Error making phone call:", error);
      }
    }
  };

  useEffect(() => {
    fetchStoreInfo();
  }, [storeId]);

  const fetchStoreInfo = async () => {
    try {
      const response = await api.get(
        `/Accounts/Stores/${storeId}/profile.json`
      );
      setStoreInfo(response.data);
    } catch (error) {
      console.error("Error fetching store info:", error);
    }
  };

  const categories = groupItemsByCategory();

  return (
    <View style={styles.card}>
      <View style={styles.storeHeader}>
        <View style={styles.storeInfo}>
          <Image
            style={styles.storeImage}
            source={{
              uri:
                storeInfo?.documents?.storeImage ||
                "https://via.placeholder.com/40",
            }}
          />
          <View style={styles.storeTextContainer}>
            <Text style={styles.storeName}>
              {storeInfo?.storeInfo?.name || "Loading..."}
            </Text>
            <Text style={styles.storeAddress}>
              {storeInfo?.storeInfo?.ownerName || "Loading..."}
            </Text>
          </View>
        </View>
        <View style={styles.storeActions}>
          <TouchableOpacity onPress={handleCall} style={styles.iconButton}>
            <Ionicons name="call" size={18} color="#4A6DFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(storeInfo?.address?.googleMapUrl || "")
            }
            style={styles.iconButton}
          >
            <Ionicons name="location" size={18} color="#4A6DFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.productsList}>
        <Text style={styles.productsTitle}>Order Items</Text>
        {categories.map((category, index) => (
          <CategoryItem
            key={index}
            name={category.name}
            items={category.items}
          />
        ))}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={() => navigation.navigate("ShopInfo", { storeInfo })}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#4A6DFF"
          />
          <Text style={styles.infoButtonText}>Shop Info</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.completedButton,
            isPickupCompleted && styles.completedButtonActive,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={() => handlePickupComplete(storeInfo.storeInfo.phoneNumber)}
          disabled={isPickupCompleted || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons
                name={
                  isPickupCompleted
                    ? "checkmark-circle"
                    : "checkmark-circle-outline"
                }
                size={16}
                color="white"
              />
              <Text style={styles.completedButtonText}>
                {isPickupCompleted ? "Pickup Completed" : "Mark as Completed"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
const PickupScreen = ({ route }) => {
  const { orderId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      const phoneNumber = await AsyncStorage.getItem("userId");
      if (!phoneNumber) {
        throw new Error("Phone number not found");
      }
      const response = await api.get(
        `/Accounts/DeliveryPartner/${phoneNumber}/Orders/AcceptedOrder/${orderId}.json`
      );
      const orderData = response.data;
      setOrderDetails(orderData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.orderInfo}>
          <View style={styles.orderInfoCard}>
            <Text style={styles.orderId}>Order #{orderDetails?.orderId}</Text>
            <Text style={styles.estimatedTime}>
              Est. delivery: {orderDetails?.delivery?.estimatedTime}
            </Text>
          </View>
        </View>

        {orderDetails?.storesWithProducts &&
          Object.entries(orderDetails.storesWithProducts).map(
            ([storeId, storeData]) => (
              <StoreCard
                key={storeId}
                storeId={storeId}
                storeData={storeData}
                items={orderDetails.items}
                orderId={orderDetails.orderId}
              />
            )
          )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <SlideButton />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bottomPadding: {
    height: 80,
  },
  orderInfo: {
    padding: 12,
  },
  orderInfoCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  estimatedTime: {
    fontSize: 13,
    color: "#4A6DFF",
    fontWeight: "500",
  },
  card: {
    margin: 12,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  storeImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  storeTextContainer: {
    marginLeft: 10,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  storeAddress: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  storeActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    padding: 6,
    backgroundColor: "#F0F4FF",
    borderRadius: 6,
  },
  productsList: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 16,
    marginBottom: 16,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  categoryText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    justifyContent: "space-between",
  },
  itemText: {
    fontSize: 13,
    color: "#666",
  },
  quantityText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  infoButton: {
    backgroundColor: "#F0F4FF",
  },

  infoButtonText: {
    color: "#4A6DFF",
    fontSize: 13,
    fontWeight: "600",
  },
  completedButton: {
    backgroundColor: "#4A6DFF",
  },
  completedButtonActive: {
    backgroundColor: "#45BD63",
  },
  completedButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default PickupScreen;
