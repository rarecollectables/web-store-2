import React from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar, Card, Button, Title, Paragraph } from 'react-native-paper';

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Admin Dashboard" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card} onPress={() => router.push('/admin/products')}>
          <Card.Title title="Manage Products" />
          <Card.Content>
            <Paragraph>Add, edit, or remove products from your store.</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.card} onPress={() => router.push('/admin/orders')}>
          <Card.Title title="Manage Orders" />
          <Card.Content>
            <Paragraph>View and update customer orders.</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.card} onPress={() => router.push('/admin/customers')}>
          <Card.Title title="Manage Customers" />
          <Card.Content>
            <Paragraph>View customer information and activity.</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.card} onPress={() => router.push('/admin/events')}>
          <Card.Title title="View Events" />
          <Card.Content>
            <Paragraph>See user/product/cart activity logs.</Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 18,
  },
  card: {
    marginBottom: 18,
    elevation: 3,
  },
});
