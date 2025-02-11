import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../api";

const { width } = Dimensions.get('window');

const HorizontalOrdersView = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [dates, setDates] = useState([]);
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to get all available years from the database
  const fetchYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const storePhone = await AsyncStorage.getItem("userId");
      if (!storePhone) {
        throw new Error('User ID not found');
      }

      const response = await api.get(`/Accounts/Stores/${storePhone}/Orders/PreviousOrders.json`);
      
      if (response.data) {
        const availableYears = Object.keys(response.data)
          .filter(key => key.length === 4 && !isNaN(key))
          .sort((a, b) => b - a);
        
        setYears(availableYears);
        if (availableYears.length > 0) {
          setSelectedYear(availableYears[0]);
        } else {
          setSelectedYear(null);
          setMonths([]);
          setDates([]);
          setOrders({});
        }
      } else {
        setYears([]);
        setSelectedYear(null);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
      setError(error.message || 'Failed to fetch years');
    } finally {
      setLoading(false);
    }
  };

  // Function to get months for selected year
  const fetchMonths = async (year) => {
    if (!year) return;
    
    try {
      setError(null);
      const storePhone = await AsyncStorage.getItem("userId");
      if (!storePhone) {
        throw new Error('User ID not found');
      }

      const response = await api.get(`/Accounts/Stores/${storePhone}/Orders/PreviousOrders/${year}.json`);
      
      if (response.data) {
        const availableMonths = Object.keys(response.data)
          .filter(key => key.length === 2 && !isNaN(key))
          .sort((a, b) => a - b)
          .map(month => {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthNames[parseInt(month) - 1];
          });
        
        setMonths(availableMonths);
        if (availableMonths.length > 0) {
          setSelectedMonth(availableMonths[0]);
        } else {
          setSelectedMonth(null);
          setDates([]);
          setOrders({});
        }
      } else {
        setMonths([]);
        setSelectedMonth(null);
      }
    } catch (error) {
      console.error('Error fetching months:', error);
      setError(error.message || 'Failed to fetch months');
    }
  };

  // Function to get dates for selected year and month
  const fetchDates = async (year, month) => {
    if (!year || !month) return;
    
    try {
      setError(null);
      const monthNumber = (months.indexOf(month) + 2).toString().padStart(2, '0');
      const storePhone = await AsyncStorage.getItem("userId");
      if (!storePhone) {
        throw new Error('User ID not found');
      }
      const response = await api.get(
        `/Accounts/Stores/${storePhone}/Orders/PreviousOrders/${year}/${monthNumber}.json`
      );
      
      if (response.data) {
        const availableDates = Object.keys(response.data)
          .filter(key => !isNaN(parseInt(key)))
          .map(date => parseInt(date))
          .sort((a, b) => a - b);
        
        setDates(availableDates);
        if (availableDates.length > 0) {
          setSelectedDate(availableDates[0]);
        } else {
          setSelectedDate(null);
          setOrders({});
        }
      } else {
        setDates([]);
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Error fetching dates:', error);
      setError(error.message || 'Failed to fetch dates');
    }
  };

  // Function to fetch orders for selected date
  const fetchOrders = async (year, month, date) => {
    if (!year || !month || !date) {
      setOrders({});
      return;
    }
    
    try {
      setError(null);
      const monthNumber = (months.indexOf(month) + 2).toString().padStart(2, '0');
      const dateString = date.toString().padStart(2, '0');
      const storePhone = await AsyncStorage.getItem("userId");
      if (!storePhone) {
        throw new Error('User ID not found');
      }

      const response = await api.get(
        `/Accounts/Stores/${storePhone}/Orders/PreviousOrders/${year}/${monthNumber}/${dateString}.json`
      );
      
      if (response.data) {
        setOrders(response.data);
      } else {
        setOrders({});
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to fetch orders');
    }
  };

  const handleRefresh = () => {
    fetchYears();
  };

  // Error display component
  const ErrorDisplay = ({ message }) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDateSelector = () => (
    <View style={styles.selectorContainer}>
      {/* Years Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.yearScroll}
      >
        {years.map(year => (
          <TouchableOpacity
            key={year}
            style={[
              styles.yearButton,
              selectedYear === year && styles.selectedYear
            ]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[
              styles.yearText,
              selectedYear === year && styles.selectedYearText
            ]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Months Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.monthScroll}
      >
        {months.map(month => (
          <TouchableOpacity
            key={month}
            style={[
              styles.monthButton,
              selectedMonth === month && styles.selectedMonth
            ]}
            onPress={() => setSelectedMonth(month)}
          >
            <Text style={[
              styles.monthText,
              selectedMonth === month && styles.selectedMonthText
            ]}>
              {month}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dates Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dateScroll}
      >
        {dates.map(date => (
          <TouchableOpacity
            key={date}
            style={[
              styles.dateButton,
              selectedDate === date && styles.selectedDate
            ]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[
              styles.dateText,
              selectedDate === date && styles.selectedDateText
            ]}>
              {date}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchMonths(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchDates(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedYear && selectedMonth && selectedDate) {
      fetchOrders(selectedYear, selectedMonth, selectedDate);
    }
  }, [selectedYear, selectedMonth, selectedDate]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders History</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Feather name="refresh-cw" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorDisplay message={error} />
      ) : (
        <>
          {/* Date Selector */}
          {renderDateSelector()}
          {/* Orders List */}
          <ScrollView style={styles.ordersContainer}>
            {Object.entries(orders).length > 0 ? (
              Object.entries(orders).map(([orderId, order]) => (
                <View key={orderId} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>#{orderId}</Text>
                      <Text style={styles.orderTime}>
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{order.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.orderDetails}>
                    <Text style={styles.detailsTitle}>Order Details</Text>
                    {order.products && Object.entries(order.products).map(([category, items]) => (
                      <View key={category}>
                        <Text style={styles.categoryText}>{`→ ${category}`}</Text>
                        {Object.entries(items).map(([itemName, itemDetails]) => (
                          <View key={itemName} style={styles.itemRow}>
                            <Text style={styles.itemText}>{`• ${itemName}`}</Text>
                            <Text style={styles.quantityText}>
                              {itemDetails.itemsQuantity}X{itemDetails.quantity}{itemDetails.unit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noOrdersContainer}>
                <Text style={styles.noOrdersText}>No orders found for selected date</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectorContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  yearScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  yearButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedYear: {
    backgroundColor: '#6366F1',
    transform: [{ scale: 1.05 }],
  },
  yearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  selectedYearText: {
    color: '#FFF',
  },
  monthScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedMonth: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedMonthText: {
    color: '#6366F1',
  },
  dateScroll: {
    paddingHorizontal: 16,
  },
  dateButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDate: {
    backgroundColor: '#FFF',
    borderColor: '#6366F1',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  selectedDateText: {
    color: '#6366F1',
  },
  ordersContainer: {
    flex: 1,
    padding: 16,
  },
  noOrdersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  noOrdersText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  orderTime: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  orderDetails: {
    paddingTop: 4,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  categoryText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    marginTop: 6,
  },
  itemText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
});

export default HorizontalOrdersView;