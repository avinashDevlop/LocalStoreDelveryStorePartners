import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../../../api';

const { width } = Dimensions.get('window');

const DeliveryStatusScreen = ({ route }) => {
  const { status } = route.params || { status: 'completed' }; // Default to completed
  const navigation = useNavigation();
  
  // Animation values
  const iconScale = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(width)).current;
  const buttonsSlide = useRef(new Animated.Value(50)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(1)).current;

  // Confetti animations only for completed status
  const confettiAnimations = status === 'completed' ? [...Array(12)].map(() => ({
    position: useRef(new Animated.Value(0)).current,
    rotation: useRef(new Animated.Value(0)).current,
    opacity: useRef(new Animated.Value(1)).current,
  })) : [];

  useEffect(() => {
    // Icon animation
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1.2,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Card slide animation
    Animated.spring(cardSlide, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Buttons animation
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(buttonsSlide, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Confetti animation for completed status only
    if (status === 'completed') {
      confettiAnimations.forEach((confetti, index) => {
        const angle = (index / confettiAnimations.length) * Math.PI * 2;
        Animated.parallel([
          Animated.timing(confetti.position, {
            toValue: 1,
            duration: 1000 + Math.random() * 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(confetti.rotation, {
            toValue: 1,
            duration: 1000 + Math.random() * 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(800),
            Animated.timing(confetti.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, []);

  const renderConfetti = () => {
    if (status !== 'completed') return null;

    return confettiAnimations.map((confetti, index) => {
      const angle = (index / confettiAnimations.length) * Math.PI * 2;
      const translateX = confetti.position.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.cos(angle) * 100],
      });
      const translateY = confetti.position.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(angle) * 100],
      });
      const rotate = confetti.rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${360 * (Math.random() > 0.5 ? 1 : -1)}deg`],
      });

      return (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              transform: [{ translateX }, { translateY }, { rotate }],
              opacity: confetti.opacity,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'][index % 5],
            },
          ]}
        />
      );
    });
  };

  const getStatusConfig = () => {
    if (status === 'completed') {
      return {
        icon: "checkmark-circle",
        iconColor: "#22C55E",
        title: "Delivery Completed!",
        subtitle: "You have successfully delivered the order",
        statusText: "Delivered",
        statusColor: "#22C55E",
        primaryButton: {
          text: "Go for Next Order",
          icon: "bicycle",
          onPress: handleGoforNextOrder
        },
        secondaryButton: {
          text: "Go Offline",
          icon: "power",
          onPress: handleGoOffline
        }
      };
    } else {
      return {
        icon: "close-circle",
        iconColor: "#DC2626",
        title: "Delivery Canceled",
        subtitle: "This delivery has been canceled",
        statusText: "Canceled",
        statusColor: "#DC2626",
        primaryButton: {
          text: "Find New Order",
          icon: "search",
          onPress: handleGoforNextOrder
        },
        secondaryButton: {
          text: "Go Offline",
          icon: "power",
          onPress: handleGoOffline
        }
      };
    }
  };

  const handleGoforNextOrder = async () => {
    try {
      const phoneNumber = await AsyncStorage.getItem("userId");
      await api.delete(`/Accounts/DeliveryPartner/OnlineDeliveryPartner/OrderDelivering/${phoneNumber}.json`);
      await api.put(`/Accounts/DeliveryPartner/OnlineDeliveryPartner/WaitingForOrders/${phoneNumber}.json`, {
        phoneNumber,
        timestamp: new Date().toISOString(),
        status: "waiting for another order",
      });
      navigation.navigate('DeliveryPartnerTabs');
    } catch (error) {
      console.error("Error setting 'waiting' status:", error);
    }
  };

  const handleGoOffline = async () => {
    try {
      const phoneNumber = await AsyncStorage.getItem("userId");
      await api.delete(`/Accounts/DeliveryPartner/OnlineDeliveryPartner/OrderDelivering/${phoneNumber}.json`);
      await api.patch(`/Accounts/DeliveryPartner/${phoneNumber}/profile.json`, {
        status: "offline",
        timestamp: new Date().toISOString(),
      });
      navigation.navigate('DeliveryPartnerTabs');
    } catch (error) {
      console.error("Error setting offline status:", error);
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti */}
      <View style={styles.confettiContainer}>
        {renderConfetti()}
      </View>

      {/* Success/Cancel Icon and Text */}
      <View style={styles.successContainer}>
        <Animated.View style={[
          styles.iconContainer,
          { transform: [{ scale: iconScale }] }
        ]}>
          <Ionicons 
            name={statusConfig.icon}
            size={100} 
            color={statusConfig.iconColor}
          />
        </Animated.View>
        <Text style={styles.title}>{statusConfig.title}</Text>
        <Text style={styles.subtitle}>{statusConfig.subtitle}</Text>
      </View>

      {/* Status Card */}
      <Animated.View style={[
        styles.card,
        { transform: [{ translateX: cardSlide }] }
      ]}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Order Status</Text>
          <View style={[styles.statusValue, { backgroundColor: `${statusConfig.statusColor}15` }]}>
            <Ionicons name={statusConfig.icon} size={20} color={statusConfig.statusColor} />
            <Text style={[styles.statusText, { color: statusConfig.statusColor }]}>
              {statusConfig.statusText}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Payment Status</Text>
          <View style={[styles.statusValue, { backgroundColor: `${statusConfig.statusColor}15` }]}>
            <Ionicons name={statusConfig.icon} size={20} color={statusConfig.statusColor} />
            <Text style={[styles.statusText, { color: statusConfig.statusColor }]}>
              {status === 'completed' ? 'Completed' : 'Canceled'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View style={[
        styles.buttonContainer,
        {
          transform: [{ translateY: buttonsSlide }],
          opacity: buttonsOpacity
        }
      ]}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={statusConfig.primaryButton.onPress}
          activeOpacity={0.8}
        >
          <Ionicons name={statusConfig.primaryButton.icon} size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{statusConfig.primaryButton.text}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={statusConfig.secondaryButton.onPress}
          activeOpacity={0.8}
        >
          <Ionicons name={statusConfig.secondaryButton.icon} size={20} color="#374151" />
          <Text style={styles.secondaryButtonText}>{statusConfig.secondaryButton.text}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderRadius: 50,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4A6DFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4A6DFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeliveryStatusScreen;