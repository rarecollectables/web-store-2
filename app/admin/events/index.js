import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const EVENT_TYPES = [
  'product_view',
  'add_to_cart',
  'cart_view',
  'cart_quantity_increase',
  'cart_quantity_decrease',
  'remove_from_cart',
];

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerDate, setStartPickerDate] = useState(new Date());
  const [endPickerDate, setEndPickerDate] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('user_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      setError('Failed to fetch events');
      setEvents([]);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }

  function filteredEvents() {
    let filtered = events;
    if (filterType) {
      filtered = filtered.filter(ev => ev.event_type === filterType);
    }
    if (search) {
      filtered = filtered.filter(ev =>
        (ev.product_id && ev.product_id.toString().includes(search)) ||
        (ev.user_id && ev.user_id.toString().includes(search)) ||
        (ev.guest_session_id && ev.guest_session_id.includes(search)) ||
        (ev.location && JSON.stringify(ev.location).toLowerCase().includes(search.toLowerCase())) ||
        (ev.metadata && JSON.stringify(ev.metadata).toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      filtered = filtered.filter(ev => new Date(ev.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      filtered = filtered.filter(ev => new Date(ev.created_at) <= end);
    }
    return filtered;
  }

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const eventsToShow = filteredEvents();

  if (!eventsToShow.length) {
    return (
      <View style={styles.centered}>
        <Text>No events found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>User Events</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/admin')}>
          <Text style={styles.homeBtnText}>Admin Home</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filtersRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by Product, User, Guest, Location, Metadata..."
          value={search}
          onChangeText={setSearch}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ marginRight: 6 }}>From:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              style={{ width: 120, marginRight: 8, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', padding: 6 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          ) : (
            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[styles.input, { width: 120, marginRight: 8, justifyContent: 'center' }]}> 
              <Text>{startDate ? new Date(startDate).toLocaleDateString() : 'Select date'}</Text>
            </TouchableOpacity>
          )}
          {showStartPicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={startDate ? new Date(startDate) : startPickerDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartPicker(false);
                if (selectedDate) {
                  setStartDate(selectedDate.toISOString().slice(0,10));
                  setStartPickerDate(selectedDate);
                }
              }}
            />
          )}

          <Text style={{ marginRight: 6 }}>To:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              style={{ width: 120, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', padding: 6 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          ) : (
            <TouchableOpacity onPress={() => setShowEndPicker(true)} style={[styles.input, { width: 120, justifyContent: 'center' }]}> 
              <Text>{endDate ? new Date(endDate).toLocaleDateString() : 'Select date'}</Text>
            </TouchableOpacity>
          )}
          {showEndPicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={endDate ? new Date(endDate) : endPickerDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndPicker(false);
                if (selectedDate) {
                  setEndDate(selectedDate.toISOString().slice(0,10));
                  setEndPickerDate(selectedDate);
                }
              }}
            />
          )}

        </View>
        <View style={styles.dropdownContainer}>
          <Text style={{marginBottom: 4}}>Event Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.filterBtn, !filterType && styles.selectedBtn]} onPress={() => setFilterType('')}><Text>All</Text></TouchableOpacity>
            {EVENT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.filterBtn, filterType === type && styles.selectedBtn]}
                onPress={() => setFilterType(type)}
              >
                <Text>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      {eventsToShow.map((item) => (
        <View key={item.id} style={styles.eventCard}>
          <Text style={styles.eventType}>{item.event_type}</Text>
          <Text>ID: {item.id}</Text>
          <Text>User: {item.user_id || 'Guest'}</Text>
          <Text>Guest Session: {item.guest_session_id || '-'}</Text>
          <Text>Product: {item.product_id || '-'}</Text>
          <Text>Qty: {item.quantity ?? (item.metadata?.quantity ?? '-')}</Text>
          <Text>Country: {item.location?.country || '-'}</Text>
          <Text>City: {item.location?.city || '-'}</Text>
          <Text>Device: {item.device?.slice(0, 32) || '-'}</Text>
          <Text>Referrer: {item.referrer || '-'}</Text>
          <Text>Date: {new Date(item.created_at).toLocaleString()}</Text>
          {item.metadata && <Text>Metadata: {JSON.stringify(item.metadata)}</Text>}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  homeBtn: {
    backgroundColor: '#BFA054',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  homeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  dropdownContainer: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  filterBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  selectedBtn: {
    backgroundColor: '#BFA054',
  },
  eventCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventType: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2a3b7e',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
});

export default AdminEvents;
