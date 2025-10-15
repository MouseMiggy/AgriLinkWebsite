# AgriLink AI-Powered Report Validation System

## 🎯 Overview

This system provides an automated AI-powered content moderation solution for AgriLink. When users report posts, the system uses GPT-4o to analyze the reports and determine their validity, then takes appropriate actions automatically.

## 🏗️ System Architecture

```
User Reports Post → Frontend Modal → Firebase Storage → n8n Webhook → GPT-4o Analysis → Decision Routing → Actions & Notifications
```

## 📋 Components

### 1. Frontend Components

#### Report Modal (`pages/dashboard.js`)
- **Location**: Lines 3292-3399
- **Features**:
  - Dropdown for report types (Spam, Fraud, Misinformation, etc.)
  - Optional description textarea
  - Evidence upload (images/videos)
  - Post preview showing what's being reported
  - Form validation

#### Reports Screen (`pages/reports.js`)
- **Purpose**: Displays user's submitted reports with real-time status updates
- **Features**:
  - Filter by status (All, Processing, Valid, Invalid)
  - Shows report details, evidence, and AI decisions
  - Real-time updates via Firebase listeners
  - Responsive design

#### Navigation Integration
- Added "My Reports" menu item in left sidebar
- Uses warning triangle icon for consistency

### 2. Backend Components

#### Firebase Functions (`firebase-functions/index.js`)
- **updateReportStatus**: Updates report status after AI analysis
- **sendNotification**: Sends notifications to users
- **handlePostAction**: Takes action on posts (remove, warn, restrict)
- **getUserReports**: API endpoint for reports page
- **createReport**: Creates initial report record
- **healthCheck**: System health monitoring

#### n8n Workflow (`n8n-workflow/report-validation-workflow.json`)
- **Webhook Trigger**: Receives reports from frontend
- **GPT-4o Integration**: AI content analysis
- **Decision Router**: Routes based on AI decision
- **Status Updates**: Updates Firebase with results
- **Notification System**: Sends notifications to users
- **Post Actions**: Takes moderation actions

## 🔄 System Flow

### 1. Report Submission
```javascript
User clicks "Report" → Modal opens → User fills form → Submit → Firebase + n8n webhook
```

### 2. AI Processing
```javascript
n8n receives webhook → GPT-4o analyzes content → Returns decision (VALID/INVALID)
```

### 3. Decision Handling
```javascript
If VALID: Notify reported user + Take action on post
If INVALID: Notify reporter + No action taken
```

### 4. Status Updates
```javascript
Update Firebase → Real-time updates in Reports screen → User sees result
```

## 🛠️ Setup Instructions

### 1. Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/report-validation
FIREBASE_FUNCTION_URL=https://your-region-your-project.cloudfunctions.net
OPENAI_API_KEY=your-openai-api-key
```

### 2. Firebase Setup

#### Firestore Collections:
```javascript
// Reports collection
reports: {
  reportId: string,
  reporterId: string,
  reportedUserId: string,
  postId: string,
  reportType: string,
  description: string,
  status: 'processing' | 'valid' | 'invalid',
  aiDecision: object,
  createdAt: timestamp,
  processedAt: timestamp
}

// Notifications collection
notifications: {
  userId: string,
  type: string,
  title: string,
  message: string,
  read: boolean,
  createdAt: timestamp,
  reportId: string
}

// Audit collections
report_audit: { ... }
notification_audit: { ... }
moderation_audit: { ... }
```

#### Security Rules:
```javascript
// Allow users to read their own reports
match /reports/{reportId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.reporterId;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.reporterId;
}

// Allow users to read their own notifications
match /notifications/{notificationId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

### 3. n8n Configuration

#### Required Credentials:
- **OpenAI API**: For GPT-4o integration
- **HTTP Basic Auth**: For Firebase Functions (if needed)

#### Environment Variables in n8n:
```
FIREBASE_FUNCTION_URL=https://your-region-your-project.cloudfunctions.net
```

#### Workflow Import:
1. Copy `n8n-workflow/report-validation-workflow.json`
2. Import into your n8n instance
3. Configure credentials
4. Activate workflow

### 4. Firebase Functions Deployment

```bash
cd firebase-functions
npm install
firebase deploy --only functions
```

## 📊 Report Types

| Type | Description | AI Analysis Focus |
|------|-------------|-------------------|
| **Spam** | Repetitive, promotional content | Pattern recognition, promotional language |
| **Fraud** | Fake products, scams | Misleading claims, suspicious offers |
| **Misinformation** | False agricultural advice | Scientific accuracy, source credibility |
| **Inappropriate** | Offensive content | Language analysis, content appropriateness |
| **Harassment** | Personal attacks, bullying | Tone analysis, personal targeting |
| **Violence** | Threats, dangerous content | Threat detection, safety assessment |
| **Copyright** | Stolen content | Content originality (limited AI capability) |
| **Other** | Miscellaneous issues | General content analysis |

## 🤖 AI Decision Making

### GPT-4o Prompt Structure:
```
System: You are an AI content moderator for AgriLink...
User: Analyze this report: [report details]
Response: JSON with decision, confidence, reasoning, severity, recommendedAction
```

### Decision Criteria:
- **VALID**: Report has merit, content violates guidelines
- **INVALID**: Report is unfounded, content is acceptable
- **Confidence**: 0.0-1.0 scale
- **Severity**: LOW, MEDIUM, HIGH
- **Actions**: NONE, WARN, REMOVE, RESTRICT

## 🔔 Notification System

### Notification Types:
- **report_valid**: Sent to reported user when report is valid
- **report_invalid**: Sent to reporter when report is invalid
- **report_processing**: Initial confirmation to reporter

### Notification Flow:
1. AI makes decision
2. Firebase Function sends notification
3. Real-time update in user's notification center
4. Email notification (optional, can be added)

## 📈 Monitoring & Analytics

### Audit Trails:
- **report_audit**: All report lifecycle events
- **notification_audit**: All notifications sent
- **moderation_audit**: All moderation actions taken

### Key Metrics:
- Report volume by type
- AI accuracy (valid vs invalid)
- Response times
- User satisfaction
- False positive/negative rates

## 🔒 Security Considerations

### Data Privacy:
- Reports contain sensitive user data
- Evidence files need secure storage
- User anonymity in certain cases

### Rate Limiting:
- Prevent spam reporting
- Limit reports per user per day
- Implement cooldown periods

### Content Security:
- Validate file uploads
- Scan for malicious content
- Limit file sizes and types

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Firebase project setup
- [ ] Firestore security rules deployed
- [ ] Firebase Functions deployed
- [ ] n8n workflow imported and activated
- [ ] OpenAI API key configured
- [ ] Frontend components integrated
- [ ] Testing completed
- [ ] Monitoring setup

## 🧪 Testing

### Test Cases:
1. **Valid Reports**: Submit reports that should be flagged
2. **Invalid Reports**: Submit false reports
3. **Edge Cases**: Empty descriptions, large files, etc.
4. **Error Handling**: Network failures, API errors
5. **Performance**: High volume testing

### Test Data:
```javascript
// Valid spam report
{
  reportType: "spam",
  postContent: "BUY NOW! AMAZING FERTILIZER! CLICK HERE!",
  description: "This is clearly spam advertising"
}

// Invalid harassment report
{
  reportType: "harassment",
  postContent: "I disagree with your farming method",
  description: "This person disagreed with me"
}
```

## 📞 Support & Maintenance

### Common Issues:
1. **n8n webhook timeouts**: Check network connectivity
2. **GPT-4o rate limits**: Implement retry logic
3. **Firebase quota exceeded**: Monitor usage
4. **False positives**: Adjust AI prompts

### Maintenance Tasks:
- Monitor AI accuracy
- Update GPT-4o prompts
- Clean up old reports
- Analyze user feedback
- Update security rules

## 🔄 Future Enhancements

### Planned Features:
- [ ] Appeal system for disputed decisions
- [ ] Bulk moderation tools
- [ ] Advanced analytics dashboard
- [ ] Machine learning model training
- [ ] Multi-language support
- [ ] Integration with external moderation services

### Scalability Considerations:
- Implement caching for frequent queries
- Use Firebase Functions v2 for better performance
- Consider moving to dedicated servers for high volume
- Implement CDN for evidence file storage

---

## 📝 API Reference

### Report Submission Endpoint
```javascript
POST /webhook/report-validation
{
  "reportId": "report_123456789_abc123",
  "reporterId": "user123",
  "reportedUserId": "user456",
  "postId": "post789",
  "reportType": "spam",
  "description": "This post is spam",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "postContent": "Content being reported",
  "imageUrl": "optional_evidence_url",
  "videoUrl": "optional_evidence_url"
}
```

### Response Format
```javascript
{
  "success": true,
  "reportId": "report_123456789_abc123",
  "status": "processed",
  "decision": "VALID"
}
```

This documentation provides a complete guide for understanding, deploying, and maintaining the AgriLink AI-Powered Report Validation System.
