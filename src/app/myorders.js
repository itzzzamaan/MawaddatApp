import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MyOrders = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);

  // Sample data for orders
  const sampleOrders = {
    upcoming: [
      {
        id: '1',
        orderId: 'PP2024102801',
        title: 'Ganesh Puja at Home',
        date: '2024-10-30',
        time: '10:00 AM - 12:00 PM',
        panditName: 'Pandit Ramesh Shastri',
        panditImage: 'https://randomuser.me/api/portraits/men/32.jpg',
        amount: 1999,
        status: 'confirmed',
        address: '123, Main Street, Bangalore',
        items: ['Ganesh Idol', 'Modak', 'Flowers', 'Incense'],
      },
      {
        id: '2',
        orderId: 'PP2024102802',
        title: 'Satyanarayan Puja',
        date: '2024-11-02',
        time: '9:00 AM - 11:00 AM',
        panditName: 'Pandit Suresh Mishra',
        panditImage: 'https://randomuser.me/api/portraits/men/45.jpg',
        amount: 2499,
        status: 'scheduled',
        address: '456, MG Road, Mumbai',
        items: ['Satyanarayan Kit', 'Fruits', 'Sweets'],
      },
      {
        id: '3',
        orderId: 'PP2024102803',
        title: 'Griha Pravesh Puja',
        date: '2024-11-05',
        time: '8:00 AM - 10:00 AM',
        panditName: 'Pandit Ajay Sharma',
        panditImage: 'https://randomuser.me/api/portraits/men/22.jpg',
        amount: 2999,
        status: 'pending',
        address: '789, Electronic City, Bangalore',
        items: ['Kalash', 'Coconut', 'Rice', 'Flowers'],
      },
    ],
    completed: [
      {
        id: '4',
        orderId: 'PP2024101501',
        title: 'Ganpati Havan',
        date: '2024-10-15',
        time: '11:00 AM - 1:00 PM',
        panditName: 'Pandit Nitesh Joshi',
        panditImage: 'https://randomuser.me/api/portraits/men/28.jpg',
        amount: 1799,
        status: 'completed',
        rating: 4.5,
        address: '321, Koramangala, Bangalore',
        items: ['Havan Samagri', 'Ghee', 'Wood', 'Sacred Thread'],
      },
      {
        id: '5',
        orderId: 'PP2024101001',
        title: 'Laxmi Puja',
        date: '2024-10-10',
        time: '6:00 PM - 7:30 PM',
        panditName: 'Pandit Priya Devi',
        panditImage: 'https://randomuser.me/api/portraits/women/35.jpg',
        amount: 1599,
        status: 'completed',
        rating: 5.0,
        address: '654, Indiranagar, Bangalore',
        items: ['Laxmi Idol', 'Gold Coins', 'Lotus', 'Sweets'],
      },
      {
        id: '6',
        orderId: 'PP2024100501',
        title: 'Rudra Abhishek',
        date: '2024-10-05',
        time: '7:00 AM - 9:00 AM',
        panditName: 'Pandit Ramesh Shastri',
        panditImage: 'https://randomuser.me/api/portraits/men/32.jpg',
        amount: 3499,
        status: 'completed',
        rating: 4.0,
        address: '123, Main Street, Bangalore',
        items: ['Rudraksha Mala', 'Bilva Leaves', 'Milk', 'Honey'],
      },
    ],
    cancelled: [
      {
        id: '7',
        orderId: 'PP2024092801',
        title: 'Navagraha Shanti',
        date: '2024-09-30',
        time: '3:00 PM - 5:00 PM',
        panditName: 'Pandit Suresh Mishra',
        panditImage: 'https://randomuser.me/api/portraits/men/45.jpg',
        amount: 3999,
        status: 'cancelled',
        cancelledDate: '2024-09-29',
        cancellationReason: 'Rescheduled by customer',
        address: '456, MG Road, Mumbai',
        items: ['Navagraha Yantra', '9 Types of Grains', 'Flowers'],
      },
      {
        id: '8',
        orderId: 'PP2024091501',
        title: 'Mundan Ceremony',
        date: '2024-09-20',
        time: '10:00 AM - 12:00 PM',
        panditName: 'Pandit Ajay Sharma',
        panditImage: 'https://randomuser.me/api/portraits/men/22.jpg',
        amount: 1999,
        status: 'cancelled',
        cancelledDate: '2024-09-18',
        cancellationReason: 'Pandit unavailable',
        address: '789, Electronic City, Bangalore',
        items: ['Scissors', 'Turmeric', 'Kumkum', 'Cloth'],
      },
    ],
  };

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = () => {
    setOrders(sampleOrders[activeTab] || []);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadOrders();
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return '#10B981'; // Green
      case 'pending':
        return '#F59E0B'; // Yellow
      case 'completed':
        return '#3B82F6'; // Blue
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'scheduled':
        return 'Scheduled';
      case 'pending':
        return 'Pending';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleOrderPress = (order) => {
    router.push({
      pathname: '/order-details',
      params: {
        orderId: order.orderId,
        title: order.title,
        status: order.status,
      },
    });
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
      activeOpacity={0.8}
    >
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order ID: {item.orderId}</Text>
          <Text style={styles.orderTitle}>{item.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {/* Pandit Info */}
      <View style={styles.panditInfo}>
        <Image
          source={{ uri: item.panditImage }}
          style={styles.panditImage}
        />
        <View style={styles.panditDetails}>
          <Text style={styles.panditName}>{item.panditName}</Text>
          <View style={styles.dateTime}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.dateText}>{item.date}</Text>
            <Ionicons name="time-outline" size={14} color="#666" style={styles.timeIcon} />
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="wallet-outline" size={16} color="#666" />
            <Text style={styles.detailText}>₹{item.amount.toLocaleString()}</Text>
          </View>
          
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsContainer}>
        <Text style={styles.itemsLabel}>Items: </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {item.items.map((itemName, index) => (
            <View key={index} style={styles.itemTag}>
              <Text style={styles.itemText}>{itemName}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      {activeTab === 'upcoming' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="call-outline" size={16} color="#706D75" />
            <Text style={styles.secondaryButtonText}>Contact Pandit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>View Details</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'completed' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Book Again</Text>
            <Ionicons name="repeat" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="star-outline" size={16} color="#706D75" />
            <Text style={styles.secondaryButtonText}>Rate Service</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'cancelled' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Re-book</Text>
            <Ionicons name="refresh" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View Reason</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2C1810" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={22} color="#706D75" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['upcoming', 'completed', 'cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#706D75']}
            tintColor="#706D75"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'You have no upcoming pujas'
                : activeTab === 'completed'
                ? 'No completed orders yet'
                : 'No cancelled orders'}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/poets')}
            >
              <Text style={styles.emptyButtonText}>Book a Puja</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 69, 19, 0.1)',
  },
  backButton: {
    padding: wp(1),
  },
  headerTitle: {
    fontSize: wp(4.8),
    fontWeight: '700',
    color: '#2C1810',
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  filterButton: {
    padding: wp(1),
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 69, 19, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: hp(1.8),
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Active tab styling is handled by indicator
  },
  tabText: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  activeTabText: {
    color: '#706D75',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 3,
    width: '60%',
    backgroundColor: '#706D75',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  listContainer: {
    padding: wp(4),
    paddingBottom: hp(0.5),
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(228, 112, 18, 0.15)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1.5),
  },
  orderId: {
    fontSize: wp(3),
    color: '#666',
    fontWeight: '500',
    marginBottom: hp(0.3),
  },
  orderTitle: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: '#1a1a1a',
    maxWidth: wp(60),
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(2),
    borderWidth: 1,
  },
  statusText: {
    fontSize: wp(2.8),
    fontWeight: '600',
  },
  panditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  panditImage: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    marginRight: wp(3),
    borderWidth: 2,
    borderColor: '#706D75',
  },
  panditDetails: {
    flex: 1,
  },
  panditName: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: hp(0.5),
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: wp(3),
    color: '#666',
    marginLeft: wp(1),
  },
  timeIcon: {
    marginLeft: wp(3),
  },
  timeText: {
    fontSize: wp(3),
    color: '#666',
    marginLeft: wp(1),
  },
  orderDetails: {
    marginBottom: hp(1.5),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: wp(3.2),
    color: '#666',
    marginLeft: wp(1.5),
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(2),
  },
  ratingText: {
    fontSize: wp(3),
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: wp(0.5),
  },
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  itemsLabel: {
    fontSize: wp(3.2),
    color: '#666',
    fontWeight: '500',
  },
  itemTag: {
    backgroundColor: 'rgba(228, 112, 18, 0.1)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(2),
    marginRight: wp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(228, 112, 18, 0.2)',
  },
  itemText: {
    fontSize: wp(2.8),
    color: '#706D75',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: wp(2),
    justifyContent: 'space-between',
    marginTop: hp(1),
  },
  primaryButton: {
    flexDirection: 'row',
    
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#706D75',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    
    borderRadius: wp(2.5),
    flex: 1,
    marginRight: wp(2),
    shadowColor: '#706D75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: wp(3.5),
    fontWeight: '600',
    marginRight: wp(1),
  },
  secondaryButton: {
    flexDirection: 'row',
    
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 112, 18, 0.1)',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: wp(2.5),
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(228, 112, 18, 0.3)',
  },
  secondaryButtonText: {
    color: '#706D75',
    fontSize: wp(3.5),
    fontWeight: '600',
    marginLeft: wp(1),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10),
    paddingHorizontal: wp(10),
  },
  emptyTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#2C1810',
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  emptyText: {
    fontSize: wp(3.5),
    color: '#64748B',
    textAlign: 'center',
    marginBottom: hp(3),
  },
  emptyButton: {
    backgroundColor: '#706D75',
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(2.5),
    shadowColor: '#706D75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: wp(3.8),
    fontWeight: '600',
  },
});

export default MyOrders;