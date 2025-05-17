import React, { useEffect, useState } from 'react';

import { BarChart, LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { supabase } from '../../../lib/supabase/client';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TextInput, Modal, Pressable, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import EventMap from './EventMap';

const EVENT_TYPES = [
  'product_view',
  'add_to_cart',
  'cart_view',
  'cart_quantity_increase',
  'cart_quantity_decrease',
  'remove_from_cart',
];


const AdminEvents = () => {
  // All useState hooks first!
  const [showTotalEventsModal, setShowTotalEventsModal] = useState(false);
  const [showEventsTodayModal, setShowEventsTodayModal] = useState(false);
  const [showEventsLast7DaysModal, setShowEventsLast7DaysModal] = useState(false);
  const [kpiModal, setKpiModal] = useState(null); // null | 'total' | 'today' | 'last7'
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'dashboard'
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
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessionSort, setSessionSort] = useState('date_desc');

  // Extracted variables to avoid code duplication
  const eventsWithLocation = events.filter(ev => ev.location && ev.location.lat && ev.location.lng);
  const firstEventWithLocation = eventsWithLocation[0];

  
  // Compute dashboardEvents and KPIs first
  const dashboardEvents = events.filter(ev => {
    let pass = true;
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      pass = pass && new Date(ev.created_at) >= start;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      pass = pass && new Date(ev.created_at) <= end;
    }
    return pass;
  });
  const totalEvents = dashboardEvents.length;
  const uniqueSessions = new Set(dashboardEvents.map(ev => ev.guest_session_id)).size;
  const eventTypeCounts = dashboardEvents.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, {});

  // Memoized sorted session data for table
  const sortedSessions = React.useMemo(() => {
    const sessions = Array.from(
      new Map(
        dashboardEvents.map(ev => [ev.guest_session_id, ev])
      ).values()
    );
    const key = sessionSort.replace('_desc', '');
    const desc = sessionSort.endsWith('_desc');
    return sessions.slice().sort((a, b) => {
      let aVal, bVal;
      if (key === 'session') {
        aVal = a.guest_session_id || '';
        bVal = b.guest_session_id || '';
      } else if (key === 'event') {
        aVal = a.event_type || '';
        bVal = b.event_type || '';
      } else if (key === 'date') {
        aVal = a.created_at || '';
        bVal = b.created_at || '';
      } else if (key === 'city') {
        aVal = a.location?.city || '';
        bVal = b.location?.city || '';
      } else if (key === 'country') {
        aVal = a.location?.country || '';
        bVal = b.location?.country || '';
      } else if (key === 'referrer') {
        aVal = a.referrer || '';
        bVal = b.referrer || '';
      } else {
        aVal = '';
        bVal = '';
      }
      if (key === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (aVal < bVal) return desc ? 1 : -1;
      if (aVal > bVal) return desc ? -1 : 1;
      return 0;
    });
  }, [dashboardEvents, sessionSort]);

  
  
  
  
  
  
  
  
  
  
  
  
  
  

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('user_events')
      .select('*')
      .order('created_at', { ascending: false });
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
      <>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </>
    );
  }

  const eventsToShow = filteredEvents();

  // Tab bar UI
  return (
    <>
      {/* Render EventMap only on web */}
      {typeof window !== 'undefined' && <EventMap events={events} />}
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Admin Events</Text>
          <Pressable style={styles.homeBtn} onPress={() => router.push('/admin')}>
            <Text style={styles.homeBtnText}>Admin Home</Text>
          </Pressable>
        </View>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'events' && styles.activeTabBtn]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'dashboard' && styles.activeTabBtn]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
          </Pressable>
        </View>
      </View>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'events' && styles.activeTabBtn]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'dashboard' && styles.activeTabBtn]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'events' ? (
        eventsToShow.length ? (
          <ScrollView>
            <View>
              <View style={styles.filtersRow}>
                {/* ...existing filters UI (search, date, event type)... */}
                {/* Copied from original code, unchanged */}
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
                    <Pressable onPress={() => setShowStartPicker(true)} style={[styles.input, { width: 120, marginRight: 8, justifyContent: 'center' }]}> 
                      <Text>{startDate ? new Date(startDate).toLocaleDateString() : 'Select date'}</Text>
                    </Pressable>
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
                    <Pressable onPress={() => setShowEndPicker(true)} style={[styles.input, { width: 120, justifyContent: 'center' }]}> 
                      <Text>{endDate ? new Date(endDate).toLocaleDateString() : 'Select date'}</Text>
                    </Pressable>
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
                    <Pressable onPress={() => setShowStartPicker(true)} style={[styles.input, { width: 120, marginRight: 8, justifyContent: 'center' }]}> 
                      <Text>{startDate ? new Date(startDate).toLocaleDateString() : 'Select date'}</Text>
                    </Pressable>
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
                    <Pressable onPress={() => setShowEndPicker(true)} style={[styles.input, { width: 120, justifyContent: 'center' }]}> 
                      <Text>{endDate ? new Date(endDate).toLocaleDateString() : 'Select date'}</Text>
                    </Pressable>
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
                    <Pressable style={[styles.filterBtn, !filterType && styles.selectedBtn]} onPress={() => setFilterType('')}><Text>All</Text></Pressable>
                    {EVENT_TYPES.map(type => (
                      <Pressable
                        key={type}
                        style={[styles.filterBtn, filterType === type && styles.selectedBtn]}
                        onPress={() => setFilterType(type)}
                      >
                        <Text>{type}</Text>
                      </Pressable>
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
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.dashboardPanel}>
           {/* TEST PRESSABLE FOR DEBUGGING */}
           <Pressable onPress={() => {console.log('Test Pressable at top pressed');}} style={{backgroundColor: '#ffeb3b', padding: 14, marginBottom: 12, borderRadius: 8, alignItems: 'center'}}>
             <Text style={{fontWeight: 'bold'}}>[TEST] Press me! (Should log to console)</Text>
           </Pressable>
            {/* Date Filter UI for Dashboard */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ marginRight: 6 }}>From:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={{ width: 120, marginRight: 8, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', padding: 6 }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              ) : (
                <Pressable onPress={() => setShowStartPicker(true)} style={[styles.input, { width: 120, marginRight: 8, justifyContent: 'center' }]}> 
                  <Text>{startDate ? new Date(startDate).toLocaleDateString() : 'Select date'}</Text>
                </Pressable>
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
                <Pressable onPress={() => setShowEndPicker(true)} style={[styles.input, { width: 120, justifyContent: 'center' }]}> 
                  <Text>{endDate ? new Date(endDate).toLocaleDateString() : 'Select date'}</Text>
                </Pressable>
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
              <Pressable
                style={[
                  styles.kpiBox,
                  {
                    backgroundColor: '#E5E9F9',
                    borderRadius: 14,
                    borderWidth: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                    marginRight: 12,
                    marginBottom: 12,
                  }
                ]}
                onPress={() => setKpiModal('total')}
              >
                <Text style={styles.kpiLabel}>Total Events</Text>
                <Text style={styles.kpiValue}>{events.length}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.kpiBox,
                  {
                    backgroundColor: '#E5E9F9',
                    borderRadius: 14,
                    borderWidth: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                    marginRight: 12,
                    marginBottom: 12,
                  }
                ]}
                onPress={() => setShowSessionsModal(true)}
              >
                <Text style={styles.kpiLabel}>Unique Sessions</Text>
                <Text style={styles.kpiValue}>{uniqueSessions}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.kpiBox,
                  {
                    backgroundColor: '#E5F7F9',
                    borderRadius: 14,
                    borderWidth: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                    marginRight: 12,
                    marginBottom: 12,
                  }
                ]}
                onPress={() => setKpiModal('today')}
              >
                <Text style={styles.kpiLabel}>Events Today</Text>
                <Text style={styles.kpiValue}>{events.filter(ev => (new Date(ev.created_at)).toDateString() === (new Date()).toDateString()).length}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.kpiBox,
                  {
                    backgroundColor: '#F9E5E5',
                    borderRadius: 14,
                    borderWidth: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                    marginRight: 12,
                    marginBottom: 12,
                  }
                ]}
                onPress={() => setKpiModal('last7')}
              >
                <Text style={styles.kpiLabel}>Events Last 7 Days</Text>
                <Text style={styles.kpiValue}>{events.filter(ev => (new Date(ev.created_at)) >= new Date(Date.now() - 7*24*60*60*1000)).length}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              <View style={[
                styles.kpiBox,
                {
                  backgroundColor: '#E5F7F9',
                  borderRadius: 14,
                  borderWidth: 0,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                  marginRight: 12,
                  marginBottom: 12,
                }
              ]}>
                <Text style={styles.kpiLabel}>Most Active Session</Text>
                <Text style={styles.kpiValue}>{(() => {
                  const sessionCounts = events.reduce((acc, ev) => {
                    acc[ev.guest_session_id] = (acc[ev.guest_session_id] || 0) + 1;
                    return acc;
                  }, {});
                  let maxSession = null, maxCount = 0;
                  for (let sid in sessionCounts) {
                    if (sessionCounts[sid] > maxCount) {
                      maxCount = sessionCounts[sid];
                      maxSession = sid;
                    }
                  }
                  return maxSession ? `${maxSession.slice(0, 6)}... (${maxCount})` : 'N/A';
                })()}</Text>
              </View>
              <View style={[
                styles.kpiBox,
                {
                  backgroundColor: '#F9F7E5',
                  borderRadius: 14,
                  borderWidth: 0,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                  marginRight: 12,
                  marginBottom: 12,
                }
              ]}>
                <Text style={styles.kpiLabel}>Most Viewed Product</Text>
                <Text style={styles.kpiValue}>{(() => {
                  const productCounts = events.filter(ev => ev.product_id).reduce((acc, ev) => {
                    acc[ev.product_id] = (acc[ev.product_id] || 0) + 1;
                    return acc;
                  }, {});
                  let maxProduct = null, maxCount = 0;
                  for (let pid in productCounts) {
                    if (productCounts[pid] > maxCount) {
                      maxCount = productCounts[pid];
                      maxProduct = pid;
                    }
                  }
                  return maxProduct ? `${maxProduct.slice(0, 8)}... (${maxCount})` : 'N/A';
                })()}</Text>
              </View>
              <View style={[styles.kpiBox, {backgroundColor: '#E5F9E8'}]}>
                <Text style={styles.kpiLabel}>Conversion Rate</Text>
                <Text style={styles.kpiValue}>{eventTypeCounts['product_view'] ? ((eventTypeCounts['add_to_cart'] || 0) / eventTypeCounts['product_view'] * 100).toFixed(1) + '%' : 'N/A'}</Text>
              </View>
            </View>

            {/* DEBUG: Show test border using React Native primitives */}


            <Text style={[styles.kpiLabel, {marginTop: 16, marginBottom: 6}]}>Event Type Distribution</Text>
            <BarChart
              data={{
                labels: Object.keys(eventTypeCounts),
                datasets: [{ data: Object.values(eventTypeCounts) }],
              }}
              width={Dimensions.get('window').width - 48}
              height={220}
              fromZero
              showValuesOnTopOfBars
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: { borderRadius: 8 },
                propsForBackgroundLines: { stroke: '#eee' },
              }}
              style={{ borderRadius: 8, marginBottom: 24 }}
            />
            <Text style={[styles.kpiLabel, {marginTop: 16, marginBottom: 6}]}>Events per Day (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: Array.from({length: 7}, (_, i) => {
                  const d = new Date(Date.now() - (6-i)*24*60*60*1000);
                  return `${d.getMonth()+1}/${d.getDate()}`;
                }),
                datasets: [{
                  data: Array.from({length: 7}, (_, i) => {
                    const day = new Date(Date.now() - (6-i)*24*60*60*1000);
                    const dayStr = day.toISOString().slice(0,10);
                    return events.filter(ev => ev.created_at.slice(0,10) === dayStr).length;
                  })
                }]
              }}
              width={Dimensions.get('window').width - 48}
              height={220}
              fromZero
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: { borderRadius: 8 },
                propsForBackgroundLines: { stroke: '#eee' },
              }}
              style={{ borderRadius: 8, marginBottom: 24 }}
            />
          </ScrollView>
        )
      ) : (
        <ScrollView style={styles.dashboardPanel}>
          {/* Date Filter UI for Dashboard */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ marginRight: 6 }}>From:</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                style={{ width: 120, marginRight: 8, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', padding: 6 }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            ) : (
              <Pressable onPress={() => setShowStartPicker(true)} style={[styles.input, { width: 120, marginRight: 8, justifyContent: 'center' }]}> 
                <Text>{startDate ? new Date(startDate).toLocaleDateString() : 'Select date'}</Text>
              </Pressable>
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
              <Pressable onPress={() => setShowEndPicker(true)} style={[styles.input, { width: 120, justifyContent: 'center' }]}> 
                <Text>{endDate ? new Date(endDate).toLocaleDateString() : 'Select date'}</Text>
              </Pressable>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            <Pressable
              style={[
                styles.kpiBox,
                {
                  backgroundColor: '#FFF9E5',
                }
              ]}
              onPress={() => {console.log('Total Events card pressed'); setShowTotalEventsModal(true);}}
            >
              <Text style={styles.kpiLabel}>Total Events</Text>
              <Text style={styles.kpiValue}>{totalEvents}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.kpiBox,
                {
                  backgroundColor: '#ffeb3b',
                }
              ]}
              onPress={() => {console.log('Unique Sessions card pressed'); setShowSessionsModal(true);}}
            >
              <Text style={styles.kpiLabel}>Unique Sessions</Text>
              <Text style={styles.kpiValue}>{uniqueSessions}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.kpiBox,
                {
                  backgroundColor: '#E5E9F9',
                }
              ]}
              onPress={() => {console.log('Events Today card pressed'); setShowEventsTodayModal(true);}}
            >
              <Text style={styles.kpiLabel}>Events Today</Text>
              <Text style={styles.kpiValue}>{events.filter(ev => (new Date(ev.created_at)).toDateString() === (new Date()).toDateString()).length}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.kpiBox,
                {
                  backgroundColor: '#F9E5E5',
                }
              ]}
              onPress={() => {console.log('Events Last 7 Days card pressed'); setShowEventsLast7DaysModal(true);}}
            >
              <Text style={styles.kpiLabel}>Events Last 7 Days</Text>
              <Text style={styles.kpiValue}>{events.filter(ev => (new Date(ev.created_at)) >= new Date(Date.now() - 7*24*60*60*1000)).length}</Text>
            </Pressable>
          </View>

          {/* Modals for KPI cards */}
          <Modal
            visible={showTotalEventsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTotalEventsModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '95%', backgroundColor: '#fff', borderRadius: 12, padding: 18, maxHeight: '85%' }}>
                <Pressable onPress={() => setShowTotalEventsModal(false)} style={{ position: 'absolute', top: 10, right: 16, zIndex: 10 }}>
                  <Text style={{ fontSize: 20, color: '#888' }}>×</Text>
                </Pressable>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>All Events</Text>
                <View style={{ height: 400 }}>
                  <ScrollView horizontal>
                    <View style={{ minWidth: 900 }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                        {['ID','Event Type','Date','User','Guest Session','Product','City','Country','Referrer'].map((label, i) => (
                          <Text key={label} style={{ fontWeight: 'bold', padding: 8, minWidth: [80,80,120,80,120,80,80,80,120][i], flex: 1 }}>{label}</Text>
                        ))}
                      </View>
                      <ScrollView style={{ maxHeight: 360 }}>
                        {events.length === 0 ? (
                          <View style={{ padding: 24 }}><Text>No events found.</Text></View>
                        ) : (
                          events.map(ev => (
                            <View key={ev.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }}>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">{ev.id}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.event_type || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.user_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.guest_session_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.product_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.city || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.country || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{ev.referrer || '-'}</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            visible={showSessionsModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowSessionsModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '95%', backgroundColor: '#fff', borderRadius: 12, padding: 18, maxHeight: '85%' }}>
                <Pressable onPress={() => setShowSessionsModal(false)} style={{ position: 'absolute', top: 10, right: 16, zIndex: 10 }}>
                  <Text style={{ fontSize: 20, color: '#888' }}>×</Text>
                </Pressable>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Unique Sessions</Text>
                <View style={{ height: 400 }}>
                  <ScrollView horizontal>
                    <View style={{ minWidth: 900 }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                        {['ID','Event Type','Date','User','Guest Session','Product','City','Country','Referrer'].map((label, i) => (
                          <Text key={label} style={{ fontWeight: 'bold', padding: 8, minWidth: [80,80,120,80,120,80,80,80,120][i], flex: 1 }}>{label}</Text>
                        ))}
                      </View>
                      <ScrollView style={{ maxHeight: 360 }}>
                        {(() => {
                          const sessionIds = Array.from(new Set(events.map(ev => ev.guest_session_id)));
                          if (sessionIds.length === 0) return (<View style={{ padding: 24 }}><Text>No sessions found.</Text></View>);
                          return sessionIds.map(sessionId => {
                            const sessionEvents = events.filter(ev => ev.guest_session_id === sessionId);
                            return sessionEvents.map(ev => (
                              <View key={ev.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }}>
                                <Text style={{ padding: 8, minWidth: 80, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">{ev.id}</Text>
                                <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.event_type || '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.user_id || '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.guest_session_id || '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.product_id || '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.city || '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.country || '-'}</Text>
                                <Text style={{ padding: 8, minWidth: 120, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{ev.referrer || '-'}</Text>
                              </View>
                            ));
                          });
                        })()}
                      </ScrollView>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            visible={showEventsTodayModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowEventsTodayModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '95%', backgroundColor: '#fff', borderRadius: 12, padding: 18, maxHeight: '85%' }}>
                <Pressable onPress={() => setShowEventsTodayModal(false)} style={{ position: 'absolute', top: 10, right: 16, zIndex: 10 }}>
                  <Text style={{ fontSize: 20, color: '#888' }}>×</Text>
                </Pressable>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Events Today</Text>
                <View style={{ height: 400 }}>
                  <ScrollView horizontal>
                    <View style={{ minWidth: 900 }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                        {['ID','Event Type','Date','User','Guest Session','Product','City','Country','Referrer'].map((label, i) => (
                          <Text key={label} style={{ fontWeight: 'bold', padding: 8, minWidth: [80,80,120,80,120,80,80,80,120][i], flex: 1 }}>{label}</Text>
                        ))}
                      </View>
                      <ScrollView style={{ maxHeight: 360 }}>
                        {events.filter(ev => (new Date(ev.created_at)).toDateString() === (new Date()).toDateString()).length === 0 ? (
                          <View style={{ padding: 24 }}><Text>No events found for today.</Text></View>
                        ) : (
                          events.filter(ev => (new Date(ev.created_at)).toDateString() === (new Date()).toDateString()).map(ev => (
                            <View key={ev.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }}>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">{ev.id}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.event_type || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.user_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.guest_session_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.product_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.city || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.country || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{ev.referrer || '-'}</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            visible={showEventsLast7DaysModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowEventsLast7DaysModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '95%', backgroundColor: '#fff', borderRadius: 12, padding: 18, maxHeight: '85%' }}>
                <Pressable onPress={() => setShowEventsLast7DaysModal(false)} style={{ position: 'absolute', top: 10, right: 16, zIndex: 10 }}>
                  <Text style={{ fontSize: 20, color: '#888' }}>×</Text>
                </Pressable>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Events Last 7 Days</Text>
                <View style={{ height: 400 }}>
                  <ScrollView horizontal>
                    <View style={{ minWidth: 900 }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                        {['ID','Event Type','Date','User','Guest Session','Product','City','Country','Referrer'].map((label, i) => (
                          <Text key={label} style={{ fontWeight: 'bold', padding: 8, minWidth: [80,80,120,80,120,80,80,80,120][i], flex: 1 }}>{label}</Text>
                        ))}
                      </View>
                      <ScrollView style={{ maxHeight: 360 }}>
                        {events.filter(ev => (new Date(ev.created_at)) >= new Date(Date.now() - 7*24*60*60*1000)).length === 0 ? (
                          <View style={{ padding: 24 }}><Text>No events found for last 7 days.</Text></View>
                        ) : (
                          events.filter(ev => (new Date(ev.created_at)) >= new Date(Date.now() - 7*24*60*60*1000)).map(ev => (
                            <View key={ev.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }}>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }} numberOfLines={1} ellipsizeMode="middle">{ev.id}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.event_type || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.user_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }}>{ev.guest_session_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.product_id || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.city || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 80, flex: 1 }}>{ev.location?.country || '-'}</Text>
                              <Text style={{ padding: 8, minWidth: 120, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{ev.referrer || '-'}</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </Modal>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            <View style={[styles.kpiBox, {backgroundColor: '#E5F7F9'}]}>
              <Text style={styles.kpiLabel}>Most Active Session</Text>
              <Text style={styles.kpiValue}>{(() => {
                const sessionCounts = events.reduce((acc, ev) => {
                  acc[ev.guest_session_id] = (acc[ev.guest_session_id] || 0) + 1;
                  return acc;
                }, {});
                let maxSession = null, maxCount = 0;
                for (let sid in sessionCounts) {
                  if (sessionCounts[sid] > maxCount) {
                    maxCount = sessionCounts[sid];
                    maxSession = sid;
                  }
                }
                return maxSession ? `${maxSession.slice(0, 6)}... (${maxCount})` : 'N/A';
              })()}</Text>
            </View>
            <View style={[styles.kpiBox, {backgroundColor: '#F9F7E5'}]}>
              <Text style={styles.kpiLabel}>Most Viewed Product</Text>
              <Text style={styles.kpiValue}>{(() => {
                const productCounts = events.filter(ev => ev.product_id).reduce((acc, ev) => {
                  acc[ev.product_id] = (acc[ev.product_id] || 0) + 1;
                  return acc;
                }, {});
                let maxProduct = null, maxCount = 0;
                for (let pid in productCounts) {
                  if (productCounts[pid] > maxCount) {
                    maxCount = productCounts[pid];
                    maxProduct = pid;
                  }
                }
                return maxProduct ? `${maxProduct.slice(0, 8)}... (${maxCount})` : 'N/A';
              })()}</Text>
            </View>
            <View style={[styles.kpiBox, {backgroundColor: '#E5F9E8'}]}>
              <Text style={styles.kpiLabel}>Conversion Rate</Text>
              <Text style={styles.kpiValue}>{eventTypeCounts['product_view'] ? ((eventTypeCounts['add_to_cart'] || 0) / eventTypeCounts['product_view'] * 100).toFixed(1) + '%' : 'N/A'}</Text>
            </View>
          </View>
          <Text style={[styles.kpiLabel, {marginTop: 16, marginBottom: 6}]}>Event Type Distribution</Text>
          <BarChart
            data={{
              labels: Object.keys(eventTypeCounts),
              datasets: [{ data: Object.values(eventTypeCounts) }],
            }}
            width={Dimensions.get('window').width - 48}
            height={220}
            fromZero
            showValuesOnTopOfBars
            chartConfig={{
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              style: { borderRadius: 8 },
              propsForBackgroundLines: { stroke: '#eee' },
            }}
            style={{ borderRadius: 8, marginBottom: 24 }}
          />
          <Text style={[styles.kpiLabel, {marginTop: 16, marginBottom: 6}]}>Events per Day (Last 7 Days)</Text>
          <LineChart
            data={{
              labels: Array.from({length: 7}, (_, i) => {
                const d = new Date(Date.now() - (6-i)*24*60*60*1000);
                return `${d.getMonth()+1}/${d.getDate()}`;
              }),
              datasets: [{
                data: Array.from({length: 7}, (_, i) => {
                  const day = new Date(Date.now() - (6-i)*24*60*60*1000);
                  const dayStr = day.toISOString().slice(0,10);
                  return events.filter(ev => ev.created_at.slice(0,10) === dayStr).length;
                })
              }]
            }}
            width={Dimensions.get('window').width - 48}
            height={220}
            fromZero
            chartConfig={{
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
              style: { borderRadius: 8 },
              propsForBackgroundLines: { stroke: '#eee' },
            }}
            style={{ borderRadius: 8, marginBottom: 24 }}
          />
        </ScrollView>
      )}
    </>
  );
};

const styles = StyleSheet.create({

  tabBar: {
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    backgroundColor: '#fff',
    borderBottomColor: '#BFA054',
  },
  tabText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#BFA054',
  },
  dashboardPanel: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2a3b7e',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  kpiLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#BFA054',
  },
  kpiEventType: {
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
    marginLeft: 8,
  },
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
    backgroundColor: '#f7f7fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownContainer: {
    flexDirection: 'column',
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
  },
  filterBtn: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedBtn: {
    backgroundColor: '#BFA054',
    borderColor: '#BFA054',
    shadowColor: '#BFA054',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  
  //   borderColor: '#ccc',
  //   borderWidth: 1,
  //   borderRadius: 8,
  //   padding: 8,
  //   marginBottom: 8,
  //   fontSize: 16,
  // },
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
