import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontFamily, spacing } from '../theme';
import { trackEvent } from '../lib/trackEvent';
import { contactFormService } from '../lib/supabase/services';

export default function Contact() {
  const router = useRouter();
  useEffect(() => {
    trackEvent({ eventType: 'view_contact_form' });
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');


  const handleSubmit = async () => {
    // Store the email, name, and message in the database and send email
    await contactFormService.logSubmission({ name, email, message });
    await trackEvent({
      eventType: 'contact_form_submit',
      metadata: {
        name,
        email,
        message
      }
    });
    Alert.alert('Thank you!', 'Your message has been sent.');
    setName('');
    setEmail('');
    setMessage('');
  };

  const handleEmailChange = (newEmail) => {
    setEmail(newEmail);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityLabel="Contact Page">
      <Pressable
        onPress={() => {
          if (router.canGoBack && router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/shop');
          }
        }}
        style={styles.backButton}
        accessibilityLabel="Go Back"
      >
        <View style={styles.backButtonContent}>
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonText}>Back</Text>
        </View>
      </Pressable>
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
        value={email}
        onChangeText={handleEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoCorrect={false}
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
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    marginLeft: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(191, 160, 84, 0.08)', // subtle gold background
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonIcon: {
    fontSize: 18,
    color: colors.gold,
    marginRight: 6,
    fontWeight: 'bold',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.gold,
    fontFamily: fontFamily.sans,
    fontWeight: '600',
  },
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
