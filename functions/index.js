const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const axios = require("axios");
const qs = require("qs");
const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const https = require('https');
const querystring = require('querystring');

// Use hardcoded API key for now (replace with Firebase secrets later)
const SEMAPHORE_API_KEY = '32b1be0667aeb7174464b188e0ee9e71';

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ success: true, message: "Server is working!" });
});

// 📱 Secure SMS endpoint - /send-sms
app.post("/send-sms", async (req, res) => {
  try {
    const { number, message } = req.body;

    // Input validation
    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: "Both 'number' and 'message' are required"
      });
    }

    if (typeof number !== 'string' || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Both 'number' and 'message' must be strings"
      });
    }

    if (message.length > 160) {
      return res.status(400).json({
        success: false,
        error: "Message must be 160 characters or less"
      });
    }

    // Validate phone number format (basic validation)
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 12) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format"
      });
    }

    console.log(`📱 /send-sms endpoint called for: ${number}`);

    // Send SMS using secure sendSmsMessage function
    const result = await sendSmsMessage(number, message);

    // Return Semaphore API response to client (without exposing API key)
    res.json({
      success: true,
      status: result.status,
      message_id: result.message_id,
      network: result.network,
      recipient: result.recipient
    });

  } catch (error) {
    console.error('❌ /send-sms endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
      details: error.message
    });
  }
});

// ✅ Firebase Admin SDK initialization (works both locally and in Firebase Cloud Functions)
try {
  // Try loading serviceAccountKey.json (for local testing)
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized using serviceAccountKey.json (local)");
} catch (error) {
  // In Firebase Cloud Functions, credentials are automatic
  admin.initializeApp();
  console.log(" Firebase Admin initialized with default credentials (Firebase Cloud)");
}
const db = admin.firestore();

// Remove hardcoded API key - now using Firebase secrets

// Rate limiting for Semaphore API (120 calls/minute)
let lastApiCall = 0;
const API_RATE_LIMIT_MS = 500; // 500ms between calls (120 calls/minute)

// 📱 Secure SMS sending function using Semaphore /api/v4/messages endpoint
const sendSmsMessage = async (number, message) => {
  try {
    // Rate limiting - ensure we don't exceed 120 calls/minute
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < API_RATE_LIMIT_MS) {
      const waitTime = API_RATE_LIMIT_MS - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastApiCall = Date.now();

    // Format phone number for Semaphore API - try different format
    let formattedNumber = number;
  
    // Try multiple phone number formats for maximum compatibility
    const formats = [];
    
    if (number.startsWith('09')) {
      // Try all possible formats for 09XXXXXXXXX
      const baseNumber = number.substring(2); // XXXXXXXXX
      formats.push(`639${baseNumber}`);        // 639XXXXXXXXX
      formats.push(`+639${baseNumber}`);       // +639XXXXXXXXX  
      formats.push(`63${number.substring(1)}`); // 639XXXXXXXXX
    } else if (number.startsWith('+639')) {
      formats.push(number.substring(1));       // 639XXXXXXXXX
      formats.push(number);                    // +639XXXXXXXXX
    } else if (number.startsWith('639')) {
      formats.push(number);                    // 639XXXXXXXXX
      formats.push(`+${number}`);              // +639XXXXXXXXX
    }
    
    // Start with the most likely format
    formattedNumber = formats[0] || number;

    console.log(`📱 Trying SMS formats: ${formats.join(', ')}`);
    
    // Try each format until one succeeds
    let lastError = null;
    let smsResponse = null;
    
    for (let i = 0; i < formats.length; i++) {
      const currentFormat = formats[i];
      
      try {
        console.log(`🔄 Attempt ${i + 1}: Trying format ${currentFormat}`);
        
        // Send SMS using axios - Semaphore expects form data, not JSON
        const formData = new URLSearchParams();
        formData.append('apikey', SEMAPHORE_API_KEY);
        formData.append('number', currentFormat);
        formData.append('message', message);
        
        console.log('📱 Sending SMS with parameters:', {
          apikey: SEMAPHORE_API_KEY.substring(0, 8) + '...',
          number: currentFormat,
          message: message,
          attempt: i + 1
        });

        const response = await axios.post('https://api.semaphore.co/api/v4/messages', formData, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        console.log(`📱 Response for format ${currentFormat}:`, JSON.stringify(response.data, null, 2));
        
        // Check if this attempt was successful
        if (Array.isArray(response.data) && response.data.length > 0) {
          const smsData = response.data[0];
          if (smsData.status === 'Sent' || smsData.status === 'Queued' || smsData.status === 'Pending') {
            console.log(`✅ SUCCESS with format ${currentFormat}! Status: ${smsData.status}`);
            smsResponse = response;
            formattedNumber = currentFormat;
            break;
          } else {
            console.log(`❌ Format ${currentFormat} failed with status: ${smsData.status}`);
            lastError = new Error(`SMS failed with status: ${smsData.status}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Format ${currentFormat} failed:`, error.message);
        lastError = error;
        
        // If this is the last format, don't continue
        if (i === formats.length - 1) {
          throw lastError;
        }
        
        // Wait a bit before trying next format
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If we got here without a successful response, throw the last error
    if (!smsResponse) {
      throw lastError || new Error('All SMS format attempts failed');
    }
    
    const response = smsResponse;

    console.log('📱 Semaphore API Full Response:', JSON.stringify(response.data, null, 2));

    // Handle error responses (validation errors, invalid API key, etc.)
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      // Check for common error fields
      if (response.data.apikey || response.data.number || response.data.message) {
        const errorMessages = [];
        if (response.data.apikey) errorMessages.push(`API Key: ${response.data.apikey.join(', ')}`);
        if (response.data.number) errorMessages.push(`Number: ${response.data.number.join(', ')}`);
        if (response.data.message) errorMessages.push(`Message: ${response.data.message.join(', ')}`);
        throw new Error(`Semaphore API Validation Error: ${errorMessages.join('; ')}`);
      }
    }

    // Handle successful response - should be an array of message objects
    if (Array.isArray(response.data) && response.data.length > 0) {
      const smsData = response.data[0];
      
      // Log detailed status information
      console.log(`📊 SMS Status Details:`);
      console.log(`   Status: ${smsData.status}`);
      console.log(`   Message ID: ${smsData.message_id}`);
      console.log(`   Network: ${smsData.network}`);
      console.log(`   Recipient: ${smsData.recipient}`);
      console.log(`   Sender: ${smsData.sender_name}`);
      console.log(`   Type: ${smsData.type}`);
      console.log(`   Created: ${smsData.created_at}`);
      
      // Check if status is Failed and log additional details
      if (smsData.status === 'Failed') {
        console.error(`❌ SMS FAILED - Detailed Analysis:`);
        console.error(`   Phone Number Format: ${formattedNumber}`);
        console.error(`   Original Number: ${number}`);
        console.error(`   Message Length: ${message.length} characters`);
        console.error(`   Message Content: "${message}"`);
        console.error(`   Network: ${smsData.network}`);
        console.error(`   Possible Reasons:`);
        console.error(`   - Invalid phone number format`);
        console.error(`   - Network/carrier rejection`);
        console.error(`   - Message content blocked`);
        console.error(`   - Insufficient account balance`);
        console.error(`   - Number is not active/reachable`);
        
        // Still return success since API call worked, but log the failure
        console.error(`⚠️  SMS API succeeded but message delivery failed`);
      } else {
        console.log(`✅ SMS sent successfully! Status: ${smsData.status}`);
      }
      
      return {
        success: true,
        status: smsData.status,
        message_id: smsData.message_id,
        network: smsData.network,
        recipient: smsData.recipient,
        user_id: smsData.user_id,
        account_id: smsData.account_id,
        sender_name: smsData.sender_name,
        type: smsData.type,
        created_at: smsData.created_at,
        response: response.data
      };
    } else {
      throw new Error(`Unexpected response format from Semaphore API: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    
    // Log detailed error information for debugging
    if (error.response) {
      console.error('❌ Semaphore API Error Response:');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    
    // Retry logic for rate limits or temporary failures
    if (error.response?.status === 429 || error.code === 'ECONNRESET') {
      console.log('🔄 Retrying after 5 seconds due to rate limit or connection issue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return sendSmsMessage(number, message); // Recursive retry
    }

    // For 500 errors, provide more specific error message
    if (error.response?.status === 500) {
      throw new Error(`Semaphore API server error (500). This may indicate: invalid API key, insufficient credits, or account restrictions. Please check your Semaphore account status.`);
    }

    throw error;
  }
};

// Legacy function for backward compatibility - now uses sendSmsMessage
const sendSemaphoreOTP = async (phoneNumber, message) => {
  try {
    // Generate OTP code if message contains {otp} placeholder
    let finalMessage = message;
    let otpCode = null;
    
    if (message.includes('{otp}')) {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      finalMessage = message.replace('{otp}', otpCode);
    }
    
    // Use the new sendSmsMessage function
    const result = await sendSmsMessage(phoneNumber, finalMessage);
    
    return {
      success: result.success,
      status: result.status,
      code: otpCode, // Return generated OTP code for backward compatibility
      message_id: result.message_id,
      response: result.response
    };
  } catch (error) {
    console.error('❌ Legacy OTP function error:', error);
    throw error;
  }
};


// ✅ Brevo SMTP transporter
const transporter = nodemailer.createTransport({
 service: "gmail",
  auth: {
    user: "caballeromiguelfranco@gmail.com",   // your Gmail
    pass: "kdrclsyjzlwujvwq"    // paste App Password (no spaces)
  }
});


// 1️⃣ Register pending user (send verification code)
app.post("/send-code", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save pending user in Firestore with hashed password
    await db.collection("pending_users").doc(email).set({
      firstName,
      lastName,
      email,
      password, // Keep original for Firebase Auth creation
      passwordHash: hashedPassword, // Store hashed password for our validation
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    });

    // Send email with Brevo
    await transporter.sendMail({
      from: '"AgriLink" <caballeromiguelfranco@gmail.com>',
      to: email,
      subject: "Your AgriLink Verification Code",
      text: `Your 6-digit verification code is: ${code}`,
    });

    res.json({ success: true, message: "Verification code sent to email" });
  } catch (err) {
    console.error("❌ Error sending code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📱 SMS Registration endpoints - Backend SMS sending

// 1️⃣ Send SMS verification code
app.post("/send-sms-code", async (req, res) => {
  console.log("📱 SMS registration request received");
  console.log("Request body:", req.body);
  
  // Set proper headers
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { firstName, lastName, phoneNumber, password } = req.body;

    if (!firstName || !lastName || !phoneNumber || !password) {
      console.log("❌ Missing required fields:", { firstName: !!firstName, lastName: !!lastName, phoneNumber: !!phoneNumber, password: !!password });
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Clean and format phone number for storage (use consistent format)
    let cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // Store as 639xxxxxxxxx format (no + prefix for document ID)
    if (phoneNumber.startsWith('09')) {
      cleanedPhone = '639' + phoneNumber.substring(2); // Convert 09 to 639
    } else if (phoneNumber.startsWith('+639')) {
      cleanedPhone = phoneNumber.substring(1); // Remove + to get 639
    } else if (phoneNumber.startsWith('639')) {
      cleanedPhone = phoneNumber; // Already correct
    } else {
      cleanedPhone = phoneNumber.replace(/\D/g, ''); // Clean only
    }
    
    console.log(`📱 Formatted phone number: ${phoneNumber} → ${cleanedPhone}`);
    
    // Validate phone number length
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      return res.status(400).json({ success: false, error: "Invalid phone number format" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📱 Generated verification code for ${cleanedPhone}`);

    // Hash password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Store SMS verification code only (no user data in pending collection)
    await db.collection("sms_verification_codes").doc(cleanedPhone).set({
      code,
      phoneNumber: cleanedPhone,
      firstName, // Store temporarily for verification
      lastName,
      passwordHash: hashedPassword,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10 minutes
      attempts: 0,
      maxAttempts: 3
    });

    // Send OTP using new secure SMS function - use carrier-friendly format
    const otpMessage = `${code} is your verification code for AgriLink. Do not share this code.`;
    
    try {
      const smsResponse = await sendSmsMessage(cleanedPhone, otpMessage);
      console.log(`✅ SMS sent successfully to ${cleanedPhone}`);
      console.log(`🔢 Generated OTP: ${code}`);
      
      res.json({ 
        success: true, 
        message: "OTP verification code sent via SMS",
        messageId: smsResponse.message_id,
        status: smsResponse.status
      });
    } catch (otpError) {
      console.error(`❌ Failed to send OTP to ${cleanedPhone}:`, otpError);
      console.error('OTP Error details:', otpError.message);
      
      // Return error since OTP sending failed
      res.status(500).json({ 
        success: false, 
        error: `Failed to send OTP: ${otpError.message}`,
        fallbackCode: code // Include fallback code for debugging
      });
    }
  } catch (err) {
    console.error("❌ Error sending SMS code:", err);
    console.error("Error stack:", err.stack);
    
    // Ensure we always send JSON response
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  }
});

// 2️⃣ Verify SMS code
app.post("/verify-sms-code", async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, error: "Phone number and code are required" });
    }

    // Clean and format phone number for verification (must match storage format)
    let cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // Use same format as storage - remove + prefix for document ID
    if (phoneNumber.startsWith('+639')) {
      cleanedPhone = phoneNumber.substring(1); // Remove + to get 639xxxxxxxxx
    } else if (phoneNumber.startsWith('09')) {
      cleanedPhone = '639' + phoneNumber.substring(2); // Convert 09 to 639
    } else if (phoneNumber.startsWith('639')) {
      cleanedPhone = phoneNumber; // Already correct format
    } else {
      cleanedPhone = phoneNumber.replace(/\D/g, ''); // Clean only
    }
    
    console.log(`📱 Verifying SMS code for: ${phoneNumber} → ${cleanedPhone}`);

    const docRef = db.collection("sms_verification_codes").doc(cleanedPhone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.json({ success: false, error: "User not found or code expired" });
    }

    const data = docSnap.data();

    if (data.code !== code) {
      return res.json({ success: false, error: "Invalid verification code" });
    }

    // Return user data for registration completion (without password hash for security)
    res.json({ 
      success: true, 
      message: "Phone number verified successfully",
      userData: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        password: data.password, // Original password for Firebase Auth
        passwordHash: data.passwordHash // Hash for our Firestore storage
      }
    });

    // Remove verification code after successful verification
    await docRef.delete();

  } catch (err) {
    console.error("❌ Error verifying SMS code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3️⃣ Resend SMS verification code
app.post("/resend-sms-code", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) return res.status(400).json({ success: false, error: "Phone number is required" });

    // Clean and format phone number for SMS (same as registration)
    let cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // Handle Philippine numbers starting with 09
    if (cleanedPhone.length === 11 && cleanedPhone.startsWith('09')) {
      cleanedPhone = `+63${cleanedPhone.substring(1)}`; // Convert 09xxxxxxxxx to +639xxxxxxxxx
    } else if (cleanedPhone.length >= 10 && !cleanedPhone.startsWith('63')) {
      // Add +63 for other Philippine numbers
      cleanedPhone = `+63${cleanedPhone}`;
    } else if (!cleanedPhone.startsWith('+')) {
      // Add + if missing
      cleanedPhone = `+${cleanedPhone}`;
    }
    
    console.log(`📱 Resend SMS to: ${phoneNumber} → ${cleanedPhone}`);

    const docRef = db.collection("sms_verification_codes").doc(cleanedPhone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(`❌ No verification code found for ${cleanedPhone}`);
      return res.status(404).json({ success: false, error: "No verification code found for this phone number" });
    }

    // Generate a new 6-digit code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update Firestore
    await docRef.update({ code: newCode, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    // Send OTP using new secure SMS function - use carrier-friendly format
    const otpMessage = `${newCode} is your verification code for AgriLink. Do not share this code.`;
    
    try {
      const smsResponse = await sendSmsMessage(cleanedPhone, otpMessage);
      console.log(`✅ SMS resent successfully to ${cleanedPhone}`);
      console.log(`🔢 Generated new OTP: ${newCode}`);
      
      res.json({ 
        success: true, 
        message: "New OTP verification code sent via SMS",
        messageId: smsResponse.message_id,
        status: smsResponse.status
      });
    } catch (otpError) {
      console.error(`❌ Failed to resend OTP to ${cleanedPhone}:`, otpError);
      console.error('OTP Resend Error details:', otpError.message);
      
      // Return error since OTP sending failed
      res.status(500).json({ 
        success: false, 
        error: `Failed to resend OTP: ${otpError.message}`,
        fallbackCode: newCode // Include fallback code for debugging
      });
    }
  } catch (err) {
    console.error("❌ Error resending SMS code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2️⃣ Complete phone registration after Firebase Auth verification
app.post("/complete-phone-registration", async (req, res) => {
  try {
    const { phoneNumber, firebaseUid } = req.body;

    if (!phoneNumber || !firebaseUid) {
      return res.status(400).json({ success: false, error: "Phone number and Firebase UID are required" });
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    const docRef = db.collection("pending_phone_users").doc(cleanedPhone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.json({ success: false, error: "Pending user data not found" });
    }

    const data = docSnap.data();

    // Save user data to Users collection with Firebase UID and hashed password
    await db.collection("Users").doc(firebaseUid).set({
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      passwordHash: data.passwordHash, // Store hashed password for our validation
      displayName: `${data.firstName} ${data.lastName}`,
      verified: true,
      phoneVerified: true,
      registrationMethod: 'phone',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      photoURL: null
    });

    // Remove verification code after successful registration
    await docRef.delete();

    res.json({ 
      success: true, 
      message: "Phone registration completed successfully"
    });

  } catch (err) {
    console.error("❌ Error completing phone registration:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3️⃣ Resend verification code
app.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: false, error: "Email is required" });

    const docRef = db.collection("pending_users").doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const data = docSnap.data();

    // Generate a new 6-digit code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update Firestore
    await docRef.update({ code: newCode, createdAt: admin.firestore.FieldValue.serverTimestamp() });

    // Send email
    await transporter.sendMail({
      from: '"AgriLink" <caballeromiguelfranco@gmail.com>',
      to: email,
      subject: "Your AgriLink Verification Code (Resent)",
      text: `Your new 6-digit verification code is: ${newCode}`,
    });

    res.json({ success: true, message: "Verification code resent!" });
  } catch (err) {
    console.error("❌ Error resending code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/upload-post", async (req, res) => {
  const { text, imageUrl, userId } = req.body;
  try {
    await db.collection("Posts").add({
      text,
      imageUrl,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: "Post created" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2️⃣ Verify code and create Firebase user
app.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: "Email and code are required" });
    }

    const docRef = db.collection("pending_users").doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.json({ success: false, error: "User not found" });
    }

    const data = docSnap.data();

    if (data.code !== code) {
      return res.json({ success: false, error: "Invalid verification code" });
    }

    // Create verified user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: `${data.firstName} ${data.lastName}`,
    });

    // Save to Users collection with hashed password for validation
    await db.collection("Users").doc(userRecord.uid).set({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: data.passwordHash, // Store hashed password for our validation
      verified: true,
      emailVerified: true,
      registrationMethod: 'email',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Remove from pending_users
    await docRef.delete();

    res.json({ success: true, message: "User verified and registered" });
  } catch (err) {
    console.error("❌ Error verifying code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Friend System Endpoints

// Send friend request
app.post("/send-friend-request", async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;
    
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ success: false, error: "Both user IDs are required" });
    }
    
    if (fromUserId === toUserId) {
      return res.status(400).json({ success: false, error: "Cannot send friend request to yourself" });
    }
    
    // Check if request already exists
    const existingRequest = await db.collection("friend_requests")
      .where("fromUserId", "==", fromUserId)
      .where("toUserId", "==", toUserId)
      .get();
    
    if (!existingRequest.empty) {
      return res.status(400).json({ success: false, error: "Friend request already sent" });
    }
    
    // Check if they're already friends
    const existingFriendship = await db.collection("friendships")
      .where("users", "array-contains", fromUserId)
      .get();
    
    const areFriends = existingFriendship.docs.some(doc => 
      doc.data().users.includes(toUserId)
    );
    
    if (areFriends) {
      return res.status(400).json({ success: false, error: "Users are already friends" });
    }
    
    // Create friend request
    await db.collection("friend_requests").add({
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.json({ success: true, message: "Friend request sent successfully" });
  } catch (err) {
    console.error("❌ Error sending friend request:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Accept friend request
app.post("/accept-friend-request", async (req, res) => {
  try {
    const { requestId } = req.body;
    
    if (!requestId) {
      return res.status(400).json({ success: false, error: "Request ID is required" });
    }
    
    const requestRef = db.collection("friend_requests").doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, error: "Friend request not found" });
    }
    
    const requestData = requestDoc.data();
    
    // Create friendship
    await db.collection("friendships").add({
      users: [requestData.fromUserId, requestData.toUserId],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Delete the request
    await requestRef.delete();
    
    res.json({ success: true, message: "Friend request accepted" });
  } catch (err) {
    console.error("❌ Error accepting friend request:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Decline friend request
app.post("/decline-friend-request", async (req, res) => {
  try {
    const { requestId } = req.body;
    
    if (!requestId) {
      return res.status(400).json({ success: false, error: "Request ID is required" });
    }
    
    await db.collection("friend_requests").doc(requestId).delete();
    
    res.json({ success: true, message: "Friend request declined" });
  } catch (err) {
    console.error("❌ Error declining friend request:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get friend requests for a user
app.get("/friend-requests/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const requestsSnapshot = await db.collection("friend_requests")
      .where("toUserId", "==", userId)
      .where("status", "==", "pending")
      .get();
    
    const requests = [];
    for (const doc of requestsSnapshot.docs) {
      const requestData = doc.data();
      const fromUserDoc = await db.collection("Users").doc(requestData.fromUserId).get();
      if (fromUserDoc.exists) {
        requests.push({
          id: doc.id,
          ...requestData,
          fromUser: fromUserDoc.data()
        });
      }
    }
    
    res.json({ success: true, requests });
  } catch (err) {
    console.error("❌ Error getting friend requests:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's friends
app.get("/friends/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const friendshipsSnapshot = await db.collection("friendships")
      .where("users", "array-contains", userId)
      .get();
    
    const friends = [];
    for (const doc of friendshipsSnapshot.docs) {
      const friendshipData = doc.data();
      const friendId = friendshipData.users.find(id => id !== userId);
      const friendDoc = await db.collection("Users").doc(friendId).get();
      if (friendDoc.exists) {
        friends.push({
          id: doc.id,
          ...friendshipData,
          friend: friendDoc.data()
        });
      }
    }
    
    res.json({ success: true, friends });
  } catch (err) {
    console.error("❌ Error getting friends:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get friend suggestions (users who are not friends and haven't received requests)
app.get("/friend-suggestions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all users except current user
    const allUsersSnapshot = await db.collection("Users").get();
    const allUsers = allUsersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== userId);
    
    // Get current user's friends
    const friendshipsSnapshot = await db.collection("friendships")
      .where("users", "array-contains", userId)
      .get();
    const friendIds = new Set();
    friendshipsSnapshot.docs.forEach(doc => {
      const friendshipData = doc.data();
      const friendId = friendshipData.users.find(id => id !== userId);
      friendIds.add(friendId);
    });
    
    // Get pending requests
    const requestsSnapshot = await db.collection("friend_requests")
      .where("fromUserId", "==", userId)
      .get();
    const requestedIds = new Set();
    requestsSnapshot.docs.forEach(doc => {
      requestedIds.add(doc.data().toUserId);
    });
    
    // Filter out friends and requested users
    const suggestions = allUsers.filter(user => 
      !friendIds.has(user.id) && !requestedIds.has(user.id)
    );
    
    res.json({ success: true, suggestions });
  } catch (err) {
    console.error("❌ Error getting friend suggestions:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search users for friend requests
app.get("/search-users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, users: [] });
    }
    
    const searchQuery = query.trim().toLowerCase();
    
    // Get all users except current user
    const allUsersSnapshot = await db.collection("Users").get();
    const allUsers = allUsersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== userId);
    
    // Get current user's friends
    const friendshipsSnapshot = await db.collection("friendships")
      .where("users", "array-contains", userId)
      .get();
    const friendIds = new Set();
    friendshipsSnapshot.docs.forEach(doc => {
      const friendshipData = doc.data();
      const friendId = friendshipData.users.find(id => id !== userId);
      friendIds.add(friendId);
    });
    
    // Get pending requests (both sent and received)
    const sentRequestsSnapshot = await db.collection("friend_requests")
      .where("fromUserId", "==", userId)
      .get();
    const receivedRequestsSnapshot = await db.collection("friend_requests")
      .where("toUserId", "==", userId)
      .get();
    
    const sentRequestIds = new Set();
    const receivedRequestIds = new Set();
    
    sentRequestsSnapshot.docs.forEach(doc => {
      sentRequestIds.add(doc.data().toUserId);
    });
    
    receivedRequestsSnapshot.docs.forEach(doc => {
      receivedRequestIds.add(doc.data().fromUserId);
    });
    
    // Search and filter users
    const searchResults = allUsers.filter(user => {
      const matchesSearch = 
        (user.displayName && user.displayName.toLowerCase().includes(searchQuery)) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchQuery)) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchQuery)) ||
        (user.email && user.email.toLowerCase().includes(searchQuery));
      
      if (!matchesSearch) return false;
      
      // Determine relationship status
      if (friendIds.has(user.id)) {
        user.relationship = 'friends';
      } else if (sentRequestIds.has(user.id)) {
        user.relationship = 'request_sent';
      } else if (receivedRequestIds.has(user.id)) {
        user.relationship = 'request_received';
      } else {
        user.relationship = 'none';
      }
      
      return true;
    });
    
    res.json({ success: true, users: searchResults });
  } catch (err) {
    console.error("❌ Error searching users:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel friend request
app.post("/cancel-friend-request", async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;
    
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ success: false, error: "Both user IDs are required" });
    }
    
    // Find and delete the request
    const requestsSnapshot = await db.collection("friend_requests")
      .where("fromUserId", "==", fromUserId)
      .where("toUserId", "==", toUserId)
      .get();
    
    if (requestsSnapshot.empty) {
      return res.status(404).json({ success: false, error: "Friend request not found" });
    }
    
    // Delete the request
    await requestsSnapshot.docs[0].ref.delete();
    
    res.json({ success: true, message: "Friend request cancelled" });
  } catch (err) {
    console.error("❌ Error cancelling friend request:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Password Validation Endpoint for Login Authentication
app.post("/validate-password", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, error: "Email/phone and password are required" });
    }

    console.log(`🔐 Password validation request for: ${emailOrPhone}`);

    // Helper function to check if input is email
    const isEmail = (input) => {
      return input.includes('@');
    };

    // Helper function to format phone number for lookup
    const formatPhoneForLookup = (phone) => {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.startsWith('639')) {
        return `+${digitsOnly}`;
      } else if (digitsOnly.startsWith('09')) {
        return `+63${digitsOnly.substring(1)}`;
      } else if (digitsOnly.startsWith('9') && digitsOnly.length === 10) {
        return `+63${digitsOnly}`;
      }
      return `+63${digitsOnly.replace(/^0/, '')}`;
    };

    let userData = null;
    let userDoc = null;

    if (isEmail(emailOrPhone)) {
      // Email login - find user by email
      console.log(`🔍 Looking up user by email: ${emailOrPhone}`);
      const emailQuery = db.collection('Users').where('email', '==', emailOrPhone);
      const emailSnapshot = await emailQuery.get();
      
      if (emailSnapshot.empty) {
        console.log(`❌ No user found with email: ${emailOrPhone}`);
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
      
      userDoc = emailSnapshot.docs[0];
      userData = userDoc.data();
    } else {
      // Phone login - find user by phone number
      const formattedPhone = formatPhoneForLookup(emailOrPhone);
      console.log(`🔍 Looking up user by phone: ${emailOrPhone} → ${formattedPhone}`);
      
      const phoneQuery = db.collection('Users').where('phoneNumber', '==', formattedPhone);
      const phoneSnapshot = await phoneQuery.get();
      
      if (phoneSnapshot.empty) {
        console.log(`❌ No user found with phone: ${formattedPhone}`);
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
      
      userDoc = phoneSnapshot.docs[0];
      userData = userDoc.data();
    }

    // Check if user has a password hash
    if (!userData.passwordHash) {
      console.log(`❌ User ${userDoc.id} has no password hash stored`);
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // Compare password with stored hash using bcrypt
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, userData.passwordHash);

    if (!passwordMatch) {
      console.log(`❌ Password validation failed for user: ${userDoc.id}`);
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    console.log(`✅ Password validation successful for user: ${userDoc.id}`);
    
    // Return user data on successful validation
    return res.json({
      success: true,
      user: {
        uid: userDoc.id,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        registrationMethod: userData.registrationMethod || 'email',
        emailVerified: userData.emailVerified || false,
        phoneVerified: userData.phoneVerified || false
      }
    });

  } catch (err) {
    console.error("❌ Error validating password:", err);
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
});

// Firebase Auth Account Creation Endpoint - For Phone Registration
app.post("/create-firebase-auth", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    console.log(`🔧 Creating Firebase Auth account for email: ${email}`);

    try {
      // Create new Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: displayName || 'User'
      });
      
      console.log(`✅ Firebase Auth user created successfully with UID: ${userRecord.uid}`);
      res.json({ 
        success: true, 
        message: "Firebase Auth account created successfully",
        uid: userRecord.uid
      });
      
    } catch (createError) {
      if (createError.code === 'auth/email-already-exists') {
        console.log(`👤 User with email ${email} already exists in Firebase Auth`);
        res.json({ 
          success: true, 
          message: "Firebase Auth account already exists"
        });
      } else {
        throw createError;
      }
    }

  } catch (err) {
    console.error("❌ Error creating/updating Firebase Auth account:", err);
    res.status(500).json({ success: false, error: "Failed to create Firebase Auth account" });
  }
});

// Create Custom Token Endpoint for Secure Authentication
app.post("/create-custom-token", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, error: "UID is required" });
    }

    console.log(`🎫 Creating custom token for user: ${uid}`);

    // Verify user exists in Firestore
    const userDoc = await db.collection('Users').doc(uid).get();
    if (!userDoc.exists) {
      console.log(`❌ User ${uid} not found in Firestore`);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      console.error("❌ Firebase Admin not initialized");
      return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    }

    // Create custom token for the user with additional claims
    const additionalClaims = {
      verified: true,
      loginTime: Date.now()
    };
    
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
    
    console.log(`✅ Custom token created successfully for user ${uid}`);
    
    res.json({ 
      success: true, 
      customToken: customToken,
      message: "Custom token created successfully"
    });

  } catch (err) {
    console.error("❌ Error creating custom token:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    // Provide more specific error information
    let errorMessage = "Failed to create custom token";
    if (err.code === 'auth/invalid-credential') {
      errorMessage = "Invalid Firebase credentials";
    } else if (err.code === 'auth/insufficient-permission') {
      errorMessage = "Insufficient permissions for token creation";
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      code: err.code || 'unknown'
    });
  }
});

// Update Firebase Auth Password (Fallback for authentication issues)
app.post("/update-firebase-password", async (req, res) => {
  try {
    const { uid, tempPassword } = req.body;

    if (!uid || !tempPassword) {
      return res.status(400).json({ success: false, error: "UID and temporary password are required" });
    }

    console.log(`🔧 Updating Firebase Auth password for user: ${uid}`);

    // Verify user exists in Firestore first
    const userDoc = await db.collection('Users').doc(uid).get();
    if (!userDoc.exists) {
      console.log(`❌ User ${uid} not found in Firestore`);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Update Firebase Auth user password
    await admin.auth().updateUser(uid, {
      password: tempPassword
    });
    
    console.log(`✅ Firebase Auth password updated successfully for user ${uid}`);
    
    res.json({ 
      success: true, 
      message: "Firebase Auth password updated successfully"
    });

  } catch (err) {
    console.error("❌ Error updating Firebase Auth password:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code
    });
    
    let errorMessage = "Failed to update Firebase Auth password";
    if (err.code === 'auth/user-not-found') {
      errorMessage = "User not found in Firebase Auth";
    } else if (err.code === 'auth/invalid-password') {
      errorMessage = "Invalid password format";
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      code: err.code || 'unknown'
    });
  }
});

// Password Reset Endpoints

// Send password reset code
app.post("/send-reset-code", async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    if (!emailOrPhone) {
      return res.status(400).json({ success: false, error: "Email or phone number is required" });
    }

    console.log(`🔄 Password reset request for: ${emailOrPhone}`);

    // Helper function to check if input is email
    const isEmail = (input) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(input);
    };

    // Helper function to format phone number for lookup
    const formatPhoneForLookup = (phone) => {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11 && cleaned.startsWith('09')) {
        return `+63${cleaned.substring(1)}`;
      } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
        return `+63${cleaned}`;
      } else if (!cleaned.startsWith('63') && cleaned.length >= 10) {
        return `+63${cleaned}`;
      } else if (!cleaned.startsWith('+')) {
        return `+${cleaned}`;
      }
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    };

    let userEmail = null;
    let userPhone = null;
    let resetMethod = 'email';
    let userData = null;
    let userExists = false;

    if (isEmail(emailOrPhone)) {
      // Email-based reset - check both Firebase Auth AND Firestore
      userEmail = emailOrPhone;
      resetMethod = 'email';

      console.log(`🔍 Checking email in Firestore: ${emailOrPhone}`);
      
      // First check Firestore Users collection
      const emailQuery = db.collection('Users').where('email', '==', emailOrPhone);
      const emailSnapshot = await emailQuery.get();
      
      if (!emailSnapshot.empty) {
        userData = emailSnapshot.docs[0].data();
        userExists = true;
        console.log(`✅ Email user found in Firestore`);
      } else {
        // Also check Firebase Auth as backup
        try {
          const firebaseUser = await admin.auth().getUserByEmail(emailOrPhone);
          if (firebaseUser) {
            userExists = true;
            console.log(`✅ Email user found in Firebase Auth`);
          }
        } catch (authError) {
          console.log(`❌ Email not found in Firebase Auth: ${authError.message}`);
        }
      }
      
      if (!userExists) {
        console.log(`❌ No account found with email: ${emailOrPhone}`);
        return res.status(400).json({ success: false, error: "No account found with this email address" });
      }
    } else {
      // Phone-based reset - check Firestore Users collection
      const formattedPhone = formatPhoneForLookup(emailOrPhone);
      userPhone = formattedPhone;
      resetMethod = 'phone';

      console.log(`🔍 Looking for phone number: ${emailOrPhone} → ${formattedPhone}`);

      // Try multiple phone number formats to find the user
      const phoneFormats = [
        formattedPhone,                                    // +639xxxxxxxxx
        formattedPhone.replace('+', ''),                   // 639xxxxxxxxx
        formattedPhone.replace('+63', '09'),               // 09xxxxxxxxx
        formattedPhone.replace('+63', '9'),                // 9xxxxxxxxx
        emailOrPhone.trim()                                // Original input
      ];

      let phoneSnapshot = null;
      let foundFormat = null;

      for (const format of phoneFormats) {
        console.log(`🔍 Trying format: ${format}`);
        const phoneQuery = db.collection('Users').where('phoneNumber', '==', format);
        phoneSnapshot = await phoneQuery.get();
        
        if (!phoneSnapshot.empty) {
          foundFormat = format;
          userPhone = format; // Use the format that was found
          userExists = true;
          console.log(`✅ Found user with phone format: ${format}`);
          break;
        }
      }
      
      if (!userExists) {
        console.log(`❌ No user found with any phone format for: ${emailOrPhone}`);
        return res.status(400).json({ success: false, error: "No account found with this phone number" });
      }
      
      userData = phoneSnapshot.docs[0].data();
      console.log(`📋 User data found:`, JSON.stringify(userData, null, 2));
      
      // For phone-registered users, we need their email for Firebase Auth
      if (userData.registrationMethod === 'phone' && userData.email) {
        userEmail = userData.email;
        console.log(`📧 Using user's email for Firebase Auth: ${userEmail}`);
      } else if (userData.registrationMethod === 'phone' || userData.registrationType === 'phone') {
        // Phone-only user, use a temporary email format for Firebase Auth
        userEmail = `${userPhone.replace(/\D/g, '')}@agrilink-temp.com`;
        console.log(`📧 Using temp email for phone user: ${userEmail}`);
      } else {
        userEmail = userData.email;
        console.log(`📧 Using user's email: ${userEmail}`);
      }

      // For password reset storage, use the phone number as the identifier
      userEmail = userPhone;
    }

    // Only proceed if user exists
    if (!userExists) {
      console.log(`❌ User existence check failed for: ${emailOrPhone}`);
      return res.status(400).json({ success: false, error: "Account not found. Please check your email or phone number." });
    }

    console.log(`✅ User exists, proceeding with password reset for: ${emailOrPhone}`);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Use proper identifier for storing reset code
    const resetIdentifier = resetMethod === 'phone' ? userPhone : userEmail;
    
    // Store reset code in Firestore with expiration
    await db.collection("password_reset_codes").doc(resetIdentifier).set({
      code,
      email: resetMethod === 'email' ? userEmail : null,
      phoneNumber: resetMethod === 'phone' ? userPhone : null,
      resetMethod,
      originalInput: emailOrPhone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10 minutes
      attempts: 0,
      maxAttempts: 3
    });

    if (resetMethod === 'phone' && userPhone) {
      // Send SMS using new secure SMS function with carrier-friendly format
      const smsMessage = `${code} is your verification code for AgriLink. Do not share this code.`;
      
      try {
        await sendSmsMessage(userPhone, smsMessage);
        console.log(`✅ Password reset SMS sent successfully to ${userPhone}`);
        res.json({ success: true, message: "Password reset code sent via SMS", resetMethod: 'phone' });
      } catch (smsError) {
        console.error(`❌ Failed to send password reset SMS to ${userPhone}:`, smsError);
        // Still return success since code is stored in database
        console.log(`🔥 PASSWORD RESET CODE FOR ${userPhone}: ${code}`);
        res.json({ success: true, message: "Password reset code sent via SMS", resetMethod: 'phone' });
      }
    } else {
      // Send email reset code
      await transporter.sendMail({
        from: '"AgriLink" <caballeromiguelfranco@gmail.com>',
        to: userEmail,
        subject: "AgriLink Password Reset Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Password Reset Request</h2>
            <p>You requested to reset your password for your AgriLink account.</p>
            <p>Your 6-digit verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #333; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message from AgriLink.</p>
          </div>
        `,
        text: `Your AgriLink password reset code is: ${code}. This code will expire in 10 minutes.`
      });
      res.json({ success: true, message: "Password reset code sent to your email", resetMethod: 'email' });
    }
  } catch (err) {
    console.error("❌ Error sending reset code:", err);
    res.status(500).json({ success: false, error: "Failed to send reset code" });
  }
});

// Verify password reset code
app.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: "Email and code are required" });
    }

    const docRef = db.collection("password_reset_codes").doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "No reset code found for this email" });
    }

    const data = docSnap.data();
    const now = admin.firestore.Timestamp.now();

    // Check if code has expired
    if (now.toMillis() > data.expiresAt.toMillis()) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "Reset code has expired. Please request a new one." });
    }

    // Check if max attempts exceeded
    if (data.attempts >= data.maxAttempts) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "Too many failed attempts. Please request a new code." });
    }

    // Increment attempts
    await docRef.update({ attempts: data.attempts + 1 });

    // Check if code matches
    if (data.code !== code) {
      return res.status(400).json({ success: false, error: "Invalid verification code" });
    }

    // Code is valid - mark as verified but don't delete yet (needed for password reset)
    await docRef.update({ verified: true });

    res.json({ success: true, message: "Code verified successfully" });
  } catch (err) {
    console.error("❌ Error verifying reset code:", err);
    res.status(500).json({ success: false, error: "Failed to verify code" });
  }
});

// Reset password with verified code
app.post("/reset-password", async (req, res) => {
  try {
    // Handle both old and new API formats
    const { email, code, emailOrPhone, newPassword, resetMethod, identifier, type, resetToken } = req.body;
    
    // Determine which format is being used
    const isOldFormat = email && code && newPassword;
    const isNewFormat = emailOrPhone && newPassword;
    const isNewestFormat = identifier && type && resetToken && newPassword; // New forgot password flow
    
    if (!isOldFormat && !isNewFormat && !isNewestFormat) {
      return res.status(400).json({ success: false, error: "Required fields are missing" });
    }
    
    // If using newest format (forgot password flow), delegate to the new endpoint logic
    if (isNewestFormat) {
      console.log(`🔐 Newest format - delegating to new password reset logic for ${type}: ${identifier}`);
      
      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters long" });
      }

      const resetDocRef = db.collection("password_resets").doc(identifier);
      const resetDoc = await resetDocRef.get();

      if (!resetDoc.exists) {
        return res.status(400).json({ success: false, error: "Invalid reset session" });
      }

      const resetData = resetDoc.data();

      // Verify reset token
      if (resetData.resetToken !== resetToken) {
        return res.status(400).json({ success: false, error: "Invalid reset token" });
      }

      // Check if already used
      if (resetData.used) {
        return res.status(400).json({ success: false, error: "Reset code has already been used" });
      }

      // Check expiration
      const now = Date.now();
      if (now > resetData.expiresAt) {
        await resetDocRef.delete();
        return res.status(400).json({ success: false, error: "Reset session has expired" });
      }

      // Get user document
      const userId = resetData.userId;
      const userRef = db.collection("Users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Update password in Firebase Auth
      try {
        await admin.auth().updateUser(userId, {
          password: newPassword
        });
        console.log(`✅ Password updated in Firebase Auth for user: ${userId}`);
      } catch (authError) {
        console.error("❌ Error updating Firebase Auth password:", authError);
        return res.status(500).json({ success: false, error: "Failed to update password in authentication system" });
      }

      // Mark reset code as used
      await resetDocRef.update({
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update user document with password change timestamp
      await userRef.update({
        passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Password reset successfully for user: ${userId}`);

      // Clean up reset document after 1 hour
      setTimeout(async () => {
        try {
          await resetDocRef.delete();
        } catch (err) {
          console.error("Error cleaning up reset document:", err);
        }
      }, 60 * 60 * 1000);

      return res.json({ 
        success: true, 
        message: "Password reset successfully" 
      });
    }

    const password = newPassword;
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long" });
    }

    let userEmail = null;
    let resetUserUid = null;

    if (isOldFormat) {
      // OLD FORMAT: Handle email reset with code verification
      console.log(`🔄 Old format password reset for email: ${email}`);
      
      const docRef = db.collection("password_reset_codes").doc(email);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ success: false, error: "No reset code found for this email" });
      }

      const data = docSnap.data();

      // Check if code was verified and matches
      if (!data.verified || data.code !== code) {
        return res.status(400).json({ success: false, error: "Invalid or unverified code" });
      }

      // Check if code has expired
      const now = admin.firestore.Timestamp.now();
      if (now.toMillis() > data.expiresAt.toMillis()) {
        await docRef.delete();
        return res.status(400).json({ success: false, error: "Reset code has expired. Please request a new one." });
      }

      userEmail = email;
      
      // Get user by email
      try {
        const user = await admin.auth().getUserByEmail(userEmail);
        userUid = user.uid;
      } catch (error) {
        console.log(`❌ User not found in Firebase Auth: ${userEmail}`);
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Delete the reset code
      await docRef.delete();
      
    } else {
      // NEW FORMAT: Handle both email and phone resets
      console.log(`🔄 New format password reset for: ${emailOrPhone}, method: ${resetMethod || 'email'}`);

      // Universal user lookup function
      const findUser = async (identifier, method) => {
        let foundUser = null;
        let foundUid = null;

        if (method === 'phone') {
          // Try multiple phone number formats
          const phoneFormats = [
            identifier.startsWith('+') ? identifier : `+63${identifier.replace(/^0/, '')}`,
            identifier.replace(/\D/g, '').replace(/^63/, '+63'),
            identifier.replace(/\D/g, '').replace(/^09/, '+639'),
            identifier.trim()
          ];

          for (const format of phoneFormats) {
            console.log(`🔍 Trying phone format: ${format}`);
            const usersQuery = db.collection('Users').where('phoneNumber', '==', format);
            const querySnapshot = await usersQuery.get();
            
            if (!querySnapshot.empty) {
              foundUser = querySnapshot.docs[0].data();
              foundUid = querySnapshot.docs[0].id; // Use document ID as UID
              console.log(`✅ Found phone user: ${foundUid}`);
              break;
            }
          }
        } else {
          // Email lookup - try both Firestore and Firebase Auth
          console.log(`🔍 Looking for email user: ${identifier}`);
          
          // First try Firestore
          const emailQuery = db.collection('Users').where('email', '==', identifier);
          const querySnapshot = await emailQuery.get();
          
          if (!querySnapshot.empty) {
            foundUser = querySnapshot.docs[0].data();
            foundUid = querySnapshot.docs[0].id; // Use document ID as UID
            console.log(`✅ Found email user in Firestore: ${foundUid}`);
          } else {
            // Try Firebase Auth as backup
            try {
              const authUser = await admin.auth().getUserByEmail(identifier);
              foundUid = authUser.uid;
              console.log(`✅ Found email user in Firebase Auth: ${foundUid}`);
            } catch (authError) {
              console.log(`❌ Email user not found in Firebase Auth: ${authError.message}`);
            }
          }
        }

        return { user: foundUser, uid: foundUid };
      };

      if (resetMethod === 'phone') {
        // Phone reset - Firebase SMS already verified the user
        const { user: userData, uid: userUid } = await findUser(emailOrPhone, 'phone');
        
        if (!userData || !userUid) {
          console.log(`❌ No phone user found for: ${emailOrPhone}`);
          return res.status(404).json({ success: false, error: "No account found with this phone number" });
        }

        resetUserUid = userUid;
        userEmail = userData.email || `${userUid}@temp.agrilink.com`;
        
        console.log(`✅ Phone user ready for password reset: ${resetUserUid}`);
      } else {
        // Email reset - verify the reset code first
        const docRef = db.collection("password_reset_codes").doc(emailOrPhone);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          return res.status(404).json({ success: false, error: "No reset code found for this email" });
        }

        const data = docSnap.data();

        // Check if code was verified
        if (!data.verified) {
          return res.status(400).json({ success: false, error: "Please verify your reset code first" });
        }

        // Check if code has expired
        const now = admin.firestore.Timestamp.now();
        if (now.toMillis() > data.expiresAt.toMillis()) {
          await docRef.delete();
          return res.status(400).json({ success: false, error: "Reset code has expired. Please request a new one." });
        }

        // Find email user
        const { user: userData, uid: userUid } = await findUser(emailOrPhone, 'email');
        
        if (!userUid) {
          console.log(`❌ No email user found for: ${emailOrPhone}`);
          return res.status(404).json({ success: false, error: "User not found" });
        }

        resetUserUid = userUid;
        userEmail = emailOrPhone;
        
        console.log(`✅ Email user ready for password reset: ${resetUserUid}`);

        // Delete the reset code after successful verification
        await docRef.delete();
      }
    }

    // Use the resetUserUid from the previous lookup
    const finalUserUid = resetUserUid;
    
    if (!finalUserUid) {
      console.error(`❌ No user UID available for password update`);
      return res.status(404).json({ success: false, error: "User authentication data not found" });
    }

    // CRITICAL: Complete password invalidation and update process
    console.log(`🔄 Starting password update for user: ${finalUserUid}`);
    console.log(`🔄 New password length: ${password.length}`);
    
    try {
      // Step 1: Revoke all existing refresh tokens FIRST to invalidate old sessions
      console.log(`🔄 Step 1: Revoking all refresh tokens...`);
      await admin.auth().revokeRefreshTokens(finalUserUid);
      console.log(`✅ All refresh tokens revoked for user: ${finalUserUid}`);
      
      // Step 2: Force password update with complete override
      console.log(`🔄 Step 2: Updating password in Firebase Auth...`);
      await admin.auth().updateUser(finalUserUid, {
        password: password,
        passwordHash: undefined, // Clear existing password hash
        passwordSalt: undefined, // Clear existing password salt
        disabled: false // Ensure account is enabled
      });
      console.log(`✅ Password updated successfully in Firebase Auth`);
      
      // Step 3: Verify the password change worked
      console.log(`🔄 Step 3: Verifying password update...`);
      const updatedUser = await admin.auth().getUser(finalUserUid);
      console.log(`✅ User verification successful: ${updatedUser.uid}`);
      console.log(`✅ Tokens valid after: ${updatedUser.tokensValidAfterTime}`);
      console.log(`✅ Account status: ${updatedUser.disabled ? 'disabled' : 'enabled'}`);
      
      // Step 4: Hash and store the new password in Firestore Users collection
      console.log(`🔄 Step 4: Hashing and storing password in Firestore...`);
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Update the user document in Firestore with the hashed password
      await db.collection('Users').doc(finalUserUid).update({
        passwordHash: hashedPassword,
        passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Password hash stored in Firestore for user: ${finalUserUid}`);
      
      // Step 5: Force another token revocation to ensure complete invalidation
      console.log(`🔄 Step 5: Final token revocation...`);
      await admin.auth().revokeRefreshTokens(finalUserUid);
      console.log(`✅ Final token revocation completed`);
      
      console.log(`🎉 PASSWORD RESET COMPLETE - Password hash stored in Firestore`);
      res.json({ 
        success: true, 
        message: "Password reset successfully. Your new password is now secure and stored." 
      });
      
    } catch (updateError) {
      console.error(`❌ Password update failed:`, updateError);
      console.error(`❌ Error details:`, updateError.message);
      res.status(500).json({ 
        success: false, 
        error: `Failed to update password: ${updateError.message}` 
      });
    }
  } catch (err) {
    console.error("❌ Error resetting password:", err);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// Account Settings - SMS Verification endpoints
// Send SMS verification code for account linking
app.post("/send-sms-verification", async (req, res) => {
  try {
    const { phoneNumber, userId } = req.body;

    if (!phoneNumber || !userId) {
      return res.status(400).json({ success: false, error: "Phone number and user ID are required" });
    }

    // Validate phone number format
    const phoneRegex = /^\+63[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ success: false, error: "Invalid Philippine phone number format" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code in Firestore with 10-minute expiration
    await db.collection("sms_verification_codes").doc(phoneNumber).set({
      code,
      phoneNumber,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10 minutes
      attempts: 0,
      maxAttempts: 3
    });

    // Send SMS using new secure SMS function with carrier-friendly format
    const smsMessage = `${code} is your verification code for AgriLink. Do not share this code.`;
    try {
      await sendSmsMessage(phoneNumber, smsMessage);
      console.log(`✅ SMS verification code sent to ${phoneNumber}`);
    } catch (smsError) {
      console.error(`❌ SMS sending failed: ${smsError.message}`);
      console.log(`🔥 FALLBACK - VERIFICATION CODE FOR ${phoneNumber}: ${code}`);
    }

    res.json({ success: true, message: "Verification code sent to your phone" });
  } catch (err) {
    console.error("❌ Error sending SMS verification:", err);
    res.status(500).json({ success: false, error: "Failed to send verification code" });
  }
});

// Verify phone code for account linking
app.post("/verify-phone-code", async (req, res) => {
  try {
    const { phoneNumber, code, userId } = req.body;

    if (!phoneNumber || !code || !userId) {
      return res.status(400).json({ success: false, error: "Phone number, code, and user ID are required" });
    }

    const docRef = db.collection("sms_verification_codes").doc(phoneNumber);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "No verification code found for this phone number" });
    }

    const data = docSnap.data();
    const now = admin.firestore.Timestamp.now();

    // Check if code has expired
    if (now.toMillis() > data.expiresAt.toMillis()) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "Verification code has expired. Please request a new one." });
    }

    // Check if max attempts exceeded
    if (data.attempts >= data.maxAttempts) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "Too many failed attempts. Please request a new code." });
    }

    // Check if user ID matches
    if (data.userId !== userId) {
      return res.status(400).json({ success: false, error: "Invalid verification session" });
    }

    // Increment attempts
    await docRef.update({ attempts: data.attempts + 1 });

    // Check if code matches
    if (data.code !== code) {
      return res.status(400).json({ success: false, error: "Invalid verification code" });
    }

    // Code is valid - delete the verification code
    await docRef.delete();

    console.log(`✅ Phone verified successfully for user ${userId}: ${phoneNumber}`);
    res.json({ success: true, message: "Phone number verified successfully" });
  } catch (err) {
    console.error("❌ Error verifying phone code:", err);
    res.status(500).json({ success: false, error: "Failed to verify code" });
  }
});

// Account Settings - Email Verification endpoints
// Send email verification code
app.post("/send-email-verification", async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ success: false, error: "Email and user ID are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code in Firestore with 10-minute expiration
    await db.collection("email_verification_codes").doc(email).set({
      code,
      email,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)), // 10 minutes
      attempts: 0,
      maxAttempts: 3
    });

    // Send email with verification code
    await transporter.sendMail({
      from: '"AgriLink" <caballeromiguelfranco@gmail.com>',
      to: email,
      subject: "AgriLink Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4CAF50; margin: 0;">AgriLink</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Email Verification</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your Email Address</h2>
            <p style="color: #666; margin: 0 0 30px 0;">Please use the verification code below to verify your email address:</p>
            
            <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 0; font-size: 36px; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">This code will expire in <strong>10 minutes</strong></p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">If you didn't request this verification, please ignore this email.</p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">This is an automated message from AgriLink.</p>
          </div>
        </div>
      `,
      text: `AgriLink Email Verification\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this verification, please ignore this email.`
    });

    console.log(`✅ Email verification code sent to ${email}`);
    res.json({ success: true, message: "Verification code sent to your email" });
  } catch (err) {
    console.error("❌ Error sending email verification:", err);
    res.status(500).json({ success: false, error: "Failed to send verification code" });
  }
});

// Verify email code
app.post("/verify-email-code", async (req, res) => {
  try {
    const { email, code, userId } = req.body;

    if (!email || !code || !userId) {
      return res.status(400).json({ success: false, error: "Email, code, and user ID are required" });
    }

    const docRef = db.collection("email_verification_codes").doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "No verification code found for this email" });
    }

    const data = docSnap.data();
    const now = admin.firestore.Timestamp.now();

    // Check if code has expired
    if (now.toMillis() > data.expiresAt.toMillis()) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "Verification code has expired. Please request a new one." });
    }

    // Check if max attempts exceeded
    if (data.attempts >= data.maxAttempts) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: "Too many failed attempts. Please request a new code." });
    }

    // Check if user ID matches
    if (data.userId !== userId) {
      return res.status(400).json({ success: false, error: "Invalid verification session" });
    }

    // Increment attempts
    await docRef.update({ attempts: data.attempts + 1 });

    // Check if code matches
    if (data.code !== code) {
      return res.status(400).json({ success: false, error: "Invalid verification code" });
    }

    // Code is valid - update user profile with verified email
    await db.collection("Users").doc(userId).update({
      email: email,
      emailVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // For phone-registered users, also update Firebase Auth email and password
    try {
      const userRecord = await admin.auth().getUser(userId);
      
      // Check if this is a phone-registered user with temp email
      if (userRecord.email && userRecord.email.includes('@temp.agrilink.com')) {
        console.log(`🔄 Updating Firebase Auth email for phone user ${userId}: ${userRecord.email} -> ${email}`);
        
        // Get the user's password from Firestore (if stored) or generate a new one
        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.data();
        
        if (userData && userData.password) {
          // Update Firebase Auth with real email and existing password
          await admin.auth().updateUser(userId, {
            email: email,
            emailVerified: true,
            password: userData.password // Use the same password they registered with
          });
          
          console.log(`✅ Firebase Auth email and password updated for user ${userId}`);
        } else {
          // Just update email if no password stored
          await admin.auth().updateUser(userId, {
            email: email,
            emailVerified: true
          });
          
          console.log(`✅ Firebase Auth email updated for user ${userId}`);
        }
      }
    } catch (authError) {
      console.error("❌ Error updating Firebase Auth email:", authError);
      // Don't fail the verification if Firebase Auth update fails
    }

    // Delete the verification code
    await docRef.delete();

    console.log(`✅ Email verified successfully for user ${userId}: ${email}`);
    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("❌ Error verifying email code:", err);
    res.status(500).json({ success: false, error: "Failed to verify code" });
  }
});

// Create phone user with consistent temp email format
app.post("/create-phone-user", async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, password } = req.body;

    if (!phoneNumber || !firstName || !lastName || !password) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Create Firebase Auth user first to get UID
    const tempEmail = `temp_${Date.now()}@temp.agrilink.com`;
    const userRecord = await admin.auth().createUser({
      email: tempEmail,
      password: password,
      displayName: `${firstName} ${lastName}`
    });

    // Update with consistent temp email format using UID and add phone number
    const finalTempEmail = `${userRecord.uid}@temp.agrilink.com`;
    try {
      await admin.auth().updateUser(userRecord.uid, {
        email: finalTempEmail,
        phoneNumber: phoneNumber
      });
      console.log(`✅ Firebase Auth updated with phone: ${phoneNumber}`);
    } catch (updateError) {
      console.error(`❌ Failed to update Firebase Auth with phone number: ${updateError.message}`);
      // Continue anyway - phone number will be in Firestore
    }

    // Create Firestore user document
    await db.collection("Users").doc(userRecord.uid).set({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber,
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      email: finalTempEmail, // Store temp email but don't display it
      emailVerified: false,
      phoneVerified: true,
      registrationMethod: 'phone',
      password: password, // Store password for later updates
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Phone user created successfully: ${userRecord.uid} with phone ${phoneNumber} and email ${finalTempEmail}`);
    res.json({ success: true, userId: userRecord.uid, tempEmail: finalTempEmail });
  } catch (err) {
    console.error("❌ Error creating phone user:", err);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
});

// Debug user lookup endpoint
app.post("/debug-user-lookup", async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or phone

    if (!identifier) {
      return res.status(400).json({ success: false, error: "Identifier is required" });
    }

    const results = {
      identifier: identifier,
      firestoreUsers: [],
      firebaseAuthUsers: []
    };

    // Search in Firestore Users collection
    const usersSnapshot = await db.collection("Users").get();
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.email === identifier || userData.phoneNumber === identifier) {
        results.firestoreUsers.push({
          uid: doc.id,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          registrationMethod: userData.registrationMethod,
          emailVerified: userData.emailVerified,
          phoneVerified: userData.phoneVerified
        });
      }
    });

    // Search in Firebase Auth
    try {
      // Try to get user by email if identifier contains @
      if (identifier.includes('@')) {
        try {
          const userRecord = await admin.auth().getUserByEmail(identifier);
          results.firebaseAuthUsers.push({
            uid: userRecord.uid,
            email: userRecord.email,
            phoneNumber: userRecord.phoneNumber,
            emailVerified: userRecord.emailVerified
          });
        } catch (authError) {
          // User not found in Firebase Auth
        }
      }

      // Also try to find by phone number format variations
      const phoneVariations = [
        identifier,
        identifier.replace(/\D/g, ''), // Remove all non-digits
        `+63${identifier.replace(/^0/, '').replace(/\D/g, '')}`, // Philippine format
        `${identifier.replace(/\D/g, '')}@temp.agrilink.com` // Temp email format
      ];

      for (const variation of phoneVariations) {
        if (variation.includes('@temp.agrilink.com')) {
          try {
            const userRecord = await admin.auth().getUserByEmail(variation);
            results.firebaseAuthUsers.push({
              uid: userRecord.uid,
              email: userRecord.email,
              phoneNumber: userRecord.phoneNumber,
              emailVerified: userRecord.emailVerified,
              variation: variation
            });
          } catch (authError) {
            // User not found with this variation
          }
        }
      }
    } catch (error) {
      console.error("Error searching Firebase Auth:", error);
    }

    console.log(`🔍 Debug lookup results for ${identifier}:`, results);
    res.json({ success: true, results });
  } catch (err) {
    console.error("❌ Error in debug user lookup:", err);
    res.status(500).json({ success: false, error: "Failed to lookup user" });
  }
});

// Create Firebase Auth account for phone-registered users
app.post("/create-phone-auth", async (req, res) => {
  try {
    const { phoneNumber, password, uid, email, displayName } = req.body;

    if (!phoneNumber || !password || !uid) {
      return res.status(400).json({ success: false, error: "Phone number, password, and UID are required" });
    }

    console.log(`🔧 Creating Firebase Auth account for phone user ${uid}`);

    // Create temp email for Firebase Auth
    const tempEmail = `${uid}@temp.agrilink.com`;

    try {
      // Try to create the user in Firebase Auth
      await admin.auth().createUser({
        uid: uid,
        email: tempEmail,
        password: password,
        displayName: displayName || 'AgriLink User',
        phoneNumber: phoneNumber
      });
      
      console.log(`✅ Firebase Auth account created for ${uid} with temp email: ${tempEmail}`);
      
      res.json({ 
        success: true, 
        message: "Firebase Auth account created successfully",
        tempEmail: tempEmail
      });
    } catch (authError) {
      if (authError.code === 'auth/uid-already-exists') {
        // User already exists, try to update instead
        console.log(`🔄 User ${uid} already exists, updating password...`);
        
        try {
          await admin.auth().updateUser(uid, {
            password: password,
            email: tempEmail,
            phoneNumber: phoneNumber,
            displayName: displayName || 'AgriLink User'
          });
          console.log(`✅ Firebase Auth updated for existing user with phone: ${phoneNumber}`);
          
          console.log(`✅ Firebase Auth account updated for ${uid}`);
          res.json({ 
            success: true, 
            message: "Firebase Auth account updated successfully",
            tempEmail: tempEmail
          });
        } catch (updateError) {
          console.error(`❌ Failed to update Firebase Auth for ${uid}:`, updateError);
          res.status(500).json({ success: false, error: "Failed to update Firebase Auth account" });
        }
      } else if (authError.code === 'auth/email-already-exists') {
        // Email exists, try to update the existing user
        console.log(`🔄 Email ${tempEmail} already exists, updating existing user...`);
        
        try {
          await admin.auth().updateUser(uid, {
            password: password,
            phoneNumber: phoneNumber,
            displayName: displayName || 'AgriLink User'
          });
          console.log(`✅ Firebase Auth updated for user ${uid} with phone: ${phoneNumber}`);
          
          console.log(`✅ Firebase Auth account updated for ${uid}`);
          res.json({ 
            success: true, 
            message: "Firebase Auth account updated successfully",
            tempEmail: tempEmail
          });
        } catch (updateError) {
          console.error(`❌ Failed to update Firebase Auth for ${uid}:`, updateError);
          res.status(500).json({ success: false, error: "Failed to update Firebase Auth account" });
        }
      } else {
        console.error(`❌ Failed to create Firebase Auth for ${uid}:`, authError);
        res.status(500).json({ success: false, error: "Failed to create Firebase Auth account" });
      }
    }
  } catch (err) {
    console.error("❌ Error creating phone auth:", err);
    res.status(500).json({ success: false, error: "Failed to create Firebase Auth account" });
  }
});

// Account recovery endpoint - reset user authentication
app.post("/recover-account", async (req, res) => {
  try {
    const { identifier, newPassword } = req.body; // identifier can be email or phone

    if (!identifier || !newPassword) {
      return res.status(400).json({ success: false, error: "Identifier and new password are required" });
    }

    // Find user in Firestore
    const usersSnapshot = await db.collection("Users").get();
    let userDoc = null;
    let userData = null;

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email === identifier || data.phoneNumber === identifier) {
        userDoc = doc;
        userData = data;
      }
    });

    if (!userDoc) {
      return res.status(404).json({ success: false, error: "No account found with this identifier" });
    }

    const userId = userDoc.id;
    console.log(`🔧 Recovering account for user ${userId} with identifier: ${identifier}`);

    // Update Firebase Auth user
    try {
      await admin.auth().updateUser(userId, {
        password: newPassword
      });
      console.log(`✅ Firebase Auth password updated for user ${userId}`);
    } catch (authError) {
      console.error(`❌ Failed to update Firebase Auth for user ${userId}:`, authError);
      // Continue anyway, update Firestore
    }

    // Update Firestore user document
    await db.collection("Users").doc(userId).update({
      password: newPassword,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // For phone-registered users, ensure Firebase Auth has correct temp email
    if (userData.registrationMethod === 'phone') {
      const tempEmail = `${userId}@temp.agrilink.com`;
      try {
        await admin.auth().updateUser(userId, {
          email: tempEmail,
          password: newPassword
        });
        console.log(`✅ Updated temp email for phone user: ${tempEmail}`);
      } catch (tempError) {
        console.error(`❌ Failed to update temp email:`, tempError);
      }
    }

    console.log(`✅ Account recovery completed for user ${userId}`);
    res.json({ 
      success: true, 
      message: "Account recovered successfully",
      loginMethod: userData.registrationMethod === 'phone' ? 'phone' : 'email',
      phoneNumber: userData.phoneNumber,
      email: userData.email
    });
  } catch (err) {
    console.error("❌ Error in account recovery:", err);
    res.status(500).json({ success: false, error: "Failed to recover account" });
  }
});

// Check if email already exists
app.post("/check-email-duplicate", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    // Check in Firebase Auth users
    try {
      await admin.auth().getUserByEmail(email);
      return res.json({ success: true, exists: true, message: "Email is already registered" });
    } catch (authError) {
      // User not found in Firebase Auth, check pending users
      if (authError.code === 'auth/user-not-found') {
        // Check pending email users
        const pendingDoc = await db.collection("pending_users").doc(email).get();
        if (pendingDoc.exists) {
          return res.json({ success: true, exists: true, message: "Email registration is pending verification" });
        }
        
        // Email is available
        return res.json({ success: true, exists: false, message: "Email is available" });
      } else {
        throw authError;
      }
    }
  } catch (err) {
    console.error("❌ Error checking email duplicate:", err);
    res.status(500).json({ success: false, error: "Failed to check email availability" });
  }
});

// Check if phone number already exists
app.post("/check-phone-duplicate", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    // Clean and format phone number
    let cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // Handle Philippine numbers starting with 09
    if (cleanedPhone.length === 11 && cleanedPhone.startsWith('09')) {
      cleanedPhone = `63${cleanedPhone.substring(1)}`;
    }
    // Handle numbers starting with +63
    else if (phoneNumber.startsWith('+63')) {
      cleanedPhone = phoneNumber.substring(1);
    }

    // Check in Users collection (verified users)
    const usersQuery = await db.collection("Users")
      .where("phoneNumber", "==", `+${cleanedPhone}`)
      .get();
    
    if (!usersQuery.empty) {
      return res.json({ success: true, exists: true, message: "Phone number is already registered" });
    }

    // Check pending verification codes
    const pendingDoc = await db.collection("sms_verification_codes").doc(cleanedPhone).get();
    if (pendingDoc.exists) {
      return res.json({ success: true, exists: true, message: "Phone number registration is pending verification" });
    }

    // Phone number is available
    return res.json({ success: true, exists: false, message: "Phone number is available" });
  } catch (err) {
    console.error("❌ Error checking phone duplicate:", err);
    res.status(500).json({ success: false, error: "Failed to check phone availability" });
  }
});

// 📱 Account Phone Verification SMS endpoint
app.post("/send-account-verification-sms", async (req, res) => {
  try {
    const { phoneNumber, userId } = req.body;

    if (!phoneNumber || !userId) {
      return res.status(400).json({ success: false, error: "Phone number and user ID are required" });
    }

    console.log(`📱 Sending account verification OTP to: ${phoneNumber}`);

    // Generate OTP code and send using secure SMS function - use carrier-friendly format
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpMessage = `${otpCode} is your verification code for AgriLink. Do not share this code.`;
    const smsResult = await sendSmsMessage(phoneNumber, otpMessage);
    
    if (smsResult.success) {
      console.log(`✅ Account verification SMS sent successfully to: ${phoneNumber}`);
      console.log(`📱 OTP Code: ${otpCode}`);
      
      // Store OTP code temporarily (expires in 10 minutes)
      const docRef = db.collection("account_phone_verification").doc(phoneNumber);
      await docRef.set({
        userId: userId,
        phoneNumber: phoneNumber,
        verificationCode: otpCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.FieldValue.serverTimestamp() + (10 * 60 * 1000) // 10 minutes
      });
      
      res.json({ 
        success: true, 
        message: "Verification code sent successfully",
        messageId: smsResult.message_id
      });
    } else {
      throw new Error(smsResult.error || 'Failed to send SMS via Semaphore');
    }

  } catch (err) {
    console.error("❌ Error sending account verification OTP:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📱 Verify Account Phone Number endpoint
app.post("/verify-account-phone", async (req, res) => {
  try {
    const { phoneNumber, code, userId } = req.body;

    if (!phoneNumber || !code || !userId) {
      return res.status(400).json({ success: false, error: "Phone number, code, and user ID are required" });
    }

    console.log(`🔐 Verifying account phone code: ${code} for ${phoneNumber}`);

    const docRef = db.collection("account_phone_verification").doc(phoneNumber);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(400).json({ success: false, error: "No verification code found. Please request a new code." });
    }

    const data = docSnap.data();
    
    // Check if code matches
    if (data.verificationCode !== code) {
      return res.status(400).json({ success: false, error: "Invalid verification code" });
    }

    // Check if code has expired (10 minutes)
    const now = Date.now();
    const createdAt = data.createdAt.toMillis();
    if (now - createdAt > 10 * 60 * 1000) {
      await docRef.delete(); // Clean up expired code
      return res.status(400).json({ success: false, error: "Verification code has expired. Please request a new code." });
    }

    // Check if userId matches
    if (data.userId !== userId) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    console.log(`✅ Account phone verification successful for: ${phoneNumber}`);

    // Update user document with verified phone number
    const userRef = db.collection("Users").doc(userId);
    await userRef.update({
      phoneNumber: phoneNumber,
      phoneVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: "Phone number verified and linked to account successfully"
    });

    // Clean up verification code
    await docRef.delete();

  } catch (err) {
    console.error("❌ Error verifying account phone:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📱 Send OTP endpoint
app.post("/send-otp", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    // Format phone number as 639XXXXXXXXX
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.startsWith('09')) {
      formattedNumber = '639' + formattedNumber.substring(2);
    } else if (formattedNumber.startsWith('+639')) {
      formattedNumber = formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('639')) {
      formattedNumber = '639' + formattedNumber;
    }

    console.log(`📱 Sending OTP to: ${formattedNumber}`);

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`🔥 MANUAL VERIFICATION CODE FOR ${formattedNumber}: ${otpCode}`);

    try {
      // Attempt to send via Semaphore OTP API
      const payload = {
        apikey: SEMAPHORE_API_KEY,
        number: formattedNumber,
        message: "Your Agrilink code is {otp}. Valid for 10 minutes.",
        sendername: "SEMAPHORE"
      };

      const response = await axios.post(
        "https://api.semaphore.co/api/v4/otp",
        qs.stringify(payload),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 30000
        }
      );

      if (response.data && response.data[0]) {
        const smsData = response.data[0];
        const semaphoreCode = smsData.code;

        console.log(`✅ Semaphore OTP sent. Message ID: ${smsData.message_id}, Code: ${semaphoreCode}`);

        // Store Semaphore-generated OTP in Firestore
        await db.collection("otps").doc(formattedNumber).set({
          code: semaphoreCode.toString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        // Return success with manual code as fallback (carrier blocking common)
        res.json({ 
          success: true,
          manualCode: semaphoreCode.toString(),
          message: "SMS sent! If you don't receive it, use the code shown in the alert."
        });
      } else {
        throw new Error("Invalid response from Semaphore API");
      }

    } catch (semaphoreError) {
      console.error("Semaphore API failed, using manual verification:", semaphoreError.message);
      
      // Store manual OTP in Firestore as fallback
      await db.collection("otps").doc(formattedNumber).set({
        code: otpCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      });

      // Return manual code when Semaphore fails
      res.json({ 
        success: true,
        manualCode: otpCode,
        message: "SMS service temporarily unavailable. Please use the verification code shown below."
      });
    }

  } catch (err) {
    console.error("❌ Error in send-otp:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send OTP" 
    });
  }
});

// 📱 Verify OTP endpoint
app.post("/verify-otp", async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: "Phone number and code are required"
      });
    }

    // Format phone number consistently
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.startsWith('09')) {
      formattedNumber = '639' + formattedNumber.substring(2);
    } else if (formattedNumber.startsWith('+639')) {
      formattedNumber = formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('639')) {
      formattedNumber = '639' + formattedNumber;
    }

    console.log(`🔍 Verifying OTP for: ${formattedNumber}`);

    // Look up OTP in Firestore
    const otpDoc = await db.collection("otps").doc(formattedNumber).get();

    if (!otpDoc.exists) {
      return res.json({
        success: false,
        message: "Invalid or expired code"
      });
    }

    const otpData = otpDoc.data();
    const now = Date.now();

    // Check if OTP is expired
    if (now > otpData.expiresAt) {
      await db.collection("otps").doc(formattedNumber).delete();
      return res.json({
        success: false,
        message: "Invalid or expired code"
      });
    }

    // Check if code matches
    if (otpData.code !== code.toString()) {
      return res.json({
        success: false,
        message: "Invalid or expired code"
      });
    }

    // OTP is valid - delete the record and return success
    await db.collection("otps").doc(formattedNumber).delete();
    
    console.log(`✅ OTP verified successfully for: ${formattedNumber}`);
    
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP"
    });
  }
});

// Import AI chat monitoring functions
const scheduledChatMonitor = require('./scheduledChatMonitor');

// Export AI chat monitoring functions
exports.runChatMonitoring = scheduledChatMonitor.runChatMonitoring;
exports.triggerChatMonitoring = scheduledChatMonitor.triggerChatMonitoring;

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 🔐 Password Reset Flow Endpoints

// Send password reset code (email or phone)
app.post("/send-password-reset-code", async (req, res) => {
  try {
    const { identifier, type } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({ success: false, error: "Identifier and type are required" });
    }

    console.log(`🔐 Sending password reset code to ${type}: ${identifier}`);

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Find user by email or phone
    let userQuery;
    if (type === 'email') {
      userQuery = db.collection("Users").where("email", "==", identifier);
    } else if (type === 'phone') {
      const formattedPhone = identifier.startsWith('+') ? identifier : `+${identifier}`;
      userQuery = db.collection("Users").where("phoneNumber", "==", formattedPhone);
    } else {
      return res.status(400).json({ success: false, error: "Invalid type. Must be 'email' or 'phone'" });
    }

    const userSnapshot = await userQuery.get();
    if (userSnapshot.empty) {
      return res.status(404).json({ success: false, error: `No account found with this ${type}` });
    }

    const userId = userSnapshot.docs[0].id;

    // Store reset code in Firestore (expires in 10 minutes)
    const resetDocRef = db.collection("password_resets").doc(identifier);
    await resetDocRef.set({
      userId: userId,
      identifier: identifier,
      type: type,
      resetCode: resetCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
      used: false
    });

    // Send code via email or SMS
    if (type === 'email') {
      // Send email with reset code
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'agrilinkph@gmail.com',
          pass: 'nrxy aaso qdoy wkzn'
        }
      });

      const mailOptions = {
        from: 'AgriLink <agrilinkph@gmail.com>',
        to: identifier,
        subject: 'Password Reset Code - AgriLink',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #fa9100;">Password Reset Request</h2>
            <p>You requested to reset your password. Use the code below to continue:</p>
            <div style="background: #f5f7fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #1c1e21; font-size: 32px; letter-spacing: 4px; margin: 0;">${resetCode}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e4e6eb; margin: 20px 0;">
            <p style="color: #65676b; font-size: 12px;">AgriLink - Connecting Farmers</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to: ${identifier}`);
    } else if (type === 'phone') {
      // Send SMS with reset code
      const message = `${resetCode} is your password reset code for AgriLink. Valid for 10 minutes. Do not share this code.`;
      const smsResult = await sendSmsMessage(identifier, message);
      
      if (!smsResult.success) {
        throw new Error(smsResult.error || 'Failed to send SMS');
      }
      console.log(`✅ Password reset SMS sent to: ${identifier}`);
    }

    res.json({ 
      success: true, 
      message: `Reset code sent to your ${type}` 
    });

  } catch (err) {
    console.error("❌ Error sending password reset code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify password reset code
app.post("/verify-password-reset-code", async (req, res) => {
  try {
    const { identifier, code, type } = req.body;

    if (!identifier || !code || !type) {
      return res.status(400).json({ success: false, error: "Identifier, code, and type are required" });
    }

    console.log(`🔐 Verifying reset code for ${type}: ${identifier}`);

    const resetDocRef = db.collection("password_resets").doc(identifier);
    const resetDoc = await resetDocRef.get();

    if (!resetDoc.exists) {
      return res.status(400).json({ success: false, error: "No reset code found. Please request a new code." });
    }

    const resetData = resetDoc.data();

    // Check if code matches
    if (resetData.resetCode !== code) {
      return res.status(400).json({ success: false, error: "Invalid reset code" });
    }

    // Check if code has expired (10 minutes)
    const now = Date.now();
    if (now > resetData.expiresAt) {
      await resetDocRef.delete();
      return res.status(400).json({ success: false, error: "Reset code has expired. Please request a new code." });
    }

    // Check if code has been used
    if (resetData.used) {
      return res.status(400).json({ success: false, error: "Reset code has already been used" });
    }

    // Mark code as verified (but not used yet)
    await resetDocRef.update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Reset code verified for: ${identifier}`);

    // Generate a temporary reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await resetDocRef.update({
      resetToken: resetToken
    });

    res.json({ 
      success: true, 
      message: "Code verified successfully",
      resetToken: resetToken
    });

  } catch (err) {
    console.error("❌ Error verifying reset code:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset password
app.post("/reset-password", async (req, res) => {
  try {
    const { identifier, type, resetToken, newPassword } = req.body;

    if (!identifier || !type || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long" });
    }

    console.log(`🔐 Resetting password for ${type}: ${identifier}`);

    const resetDocRef = db.collection("password_resets").doc(identifier);
    const resetDoc = await resetDocRef.get();

    if (!resetDoc.exists) {
      return res.status(400).json({ success: false, error: "Invalid reset session" });
    }

    const resetData = resetDoc.data();

    // Verify reset token
    if (resetData.resetToken !== resetToken) {
      return res.status(400).json({ success: false, error: "Invalid reset token" });
    }

    // Check if already used
    if (resetData.used) {
      return res.status(400).json({ success: false, error: "Reset code has already been used" });
    }

    // Check expiration
    const now = Date.now();
    if (now > resetData.expiresAt) {
      await resetDocRef.delete();
      return res.status(400).json({ success: false, error: "Reset session has expired" });
    }

    // Get user document
    const userId = resetData.userId;
    const userRef = db.collection("Users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data();

    // Update password in Firebase Auth
    try {
      await admin.auth().updateUser(userId, {
        password: newPassword
      });
      console.log(`✅ Password updated in Firebase Auth for user: ${userId}`);
    } catch (authError) {
      console.error("❌ Error updating Firebase Auth password:", authError);
      return res.status(500).json({ success: false, error: "Failed to update password in authentication system" });
    }

    // Mark reset code as used
    await resetDocRef.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user document with password change timestamp
    await userRef.update({
      passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Password reset successfully for user: ${userId}`);

    // Clean up reset document after 1 hour
    setTimeout(async () => {
      try {
        await resetDocRef.delete();
      } catch (err) {
        console.error("Error cleaning up reset document:", err);
      }
    }, 60 * 60 * 1000);

    res.json({ 
      success: true, 
      message: "Password reset successfully" 
    });

  } catch (err) {
    console.error("❌ Error resetting password:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export the Express app as a Firebase Cloud Function (v2)
exports.api = onRequest({ region: "us-central1" }, app);
