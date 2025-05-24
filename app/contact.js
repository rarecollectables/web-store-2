import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { colors, fontFamily, spacing } from '../theme';
import { trackEvent } from '../lib/trackEvent';

export default function Contact() {
  useEffect(() => {
    trackEvent({ eventType: 'view_contact_form' });
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    // You can implement actual submission logic here (e.g., API call)
    Alert.alert('Thank you!', 'Your message has been sent.');
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityLabel="Contact Page">
      <Text style={styles.title}>Contact Us</Text>
      <Text style={styles.text}>Have a question or need help? Fill out the form below and we’ll get back to you soon.</Text>
      <TextInput
        style={styles.input}
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        accessibilityLabel="Name Input"
      />
      <TextInput
        style={styles.input}
        placeholder="Your Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Email Input"
      />
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Your Message"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
        accessibilityLabel="Message Input"
      />
      <Button title="Send" onPress={handleSubmit} color={colors.gold} accessibilityLabel="Send Message" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.sans,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: fontFamily.sans,
    color: colors.dark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  input: {
    fontSize: 16,
    fontFamily: fontFamily.sans,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: '#fafafa',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
