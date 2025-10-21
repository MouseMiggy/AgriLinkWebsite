# 🚀 AgriLink Report System - Quick Start Guide

## ✅ Pre-Setup Checklist

Before starting, ensure you have:
- [ ] Firebase project with Firestore enabled
- [ ] n8n instance (cloud or self-hosted)
- [ ] OpenAI API key with GPT-4o access
- [ ] Node.js and npm installed

## 🔧 Step-by-Step Setup

### 1. Environment Configuration

Create `.env.local` file in your project root:
```bash
# Copy from .env.example and fill in your values
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/report-validation
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### 2. Firebase Setup

#### A. Firestore Security Rules
```javascript
// Add to firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reports collection
    match /reports/{reportId} {
      allow read, create: if request.auth != null && 
        request.auth.uid == resource.data.reporterId;
    }
    
    // Notifications collection  
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

#### B. Deploy Rules
```bash
firebase deploy --only firestore:rules
```

### 3. n8n Workflow Setup

#### A. Import Workflow
1. Open n8n interface
2. Click "Import from JSON"
3. Copy content from `n8n-workflow/report-validation-workflow.json`
4. Paste and import

#### B. Configure Credentials
1. Go to Settings → Credentials
2. Add "OpenAI" credential with your API key
3. Name it: `openai-credentials`

#### C. Update HTTP Request URLs
Replace placeholder URLs in workflow nodes:
```
https://your-region-your-project.cloudfunctions.net/updateReportStatus
https://your-region-your-project.cloudfunctions.net/sendNotification
https://your-region-your-project.cloudfunctions.net/handlePostAction
```

#### D. Activate Workflow
Toggle the workflow to "Active" state

### 4. Firebase Functions Deployment

```bash
cd firebase-functions
npm install
firebase login
firebase init functions  # if not already initialized
firebase deploy --only functions
```

### 5. Test the System

#### A. Browser Console Test
1. Open AgriLink dashboard
2. Press F12 → Console
3. Load test script:
```javascript
// Copy and paste content from test-report-system.js
runReportSystemTests()
```

#### B. Manual Test
1. Find any post in your dashboard
2. Click the 3-dot menu → "Report Post"
3. Fill out the report form
4. Submit and check console for logs

## 🔍 Verification Steps

### ✅ Frontend Verification
- [ ] Report button appears in post dropdown menu
- [ ] Report modal opens with proper form fields
- [ ] Form validation works (requires report type)
- [ ] Loading states show during submission
- [ ] Success message appears after submission

### ✅ Backend Verification
- [ ] Reports appear in Firebase Firestore `reports` collection
- [ ] n8n workflow executes successfully
- [ ] GPT-4o responds with valid JSON
- [ ] Status updates in Firebase
- [ ] Notifications are created

### ✅ Reports Page Verification
- [ ] "My Reports" menu item appears in left sidebar
- [ ] Reports page loads without errors
- [ ] Reports display with correct status
- [ ] Filtering works (All, Processing, Valid, Invalid)
- [ ] Real-time updates work

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. "Report button not found"
**Problem**: Report option doesn't appear in post menu
**Solution**: 
- Check if you're viewing someone else's post (not your own)
- Verify `isUserPost()` function logic
- Check console for JavaScript errors

#### 2. "Firebase permission denied"
**Problem**: Can't save reports to Firestore
**Solution**:
- Check Firestore security rules
- Verify user is authenticated
- Check Firebase project configuration

#### 3. "n8n webhook timeout"
**Problem**: Webhook doesn't respond
**Solution**:
- Verify webhook URL in `.env.local`
- Check n8n workflow is active
- Test webhook directly with curl:
```bash
curl -X POST https://your-n8n-instance.com/webhook/report-validation \
  -H "Content-Type: application/json" \
  -d '{"reportType":"spam","postContent":"test"}'
```

#### 4. "GPT-4o API errors"
**Problem**: OpenAI API calls fail
**Solution**:
- Verify API key is correct and has credits
- Check if GPT-4o model is available in your region
- Review API usage limits

#### 5. "Reports page shows no data"
**Problem**: Reports page is empty
**Solution**:
- Check Firestore collection name is `reports`
- Verify user ID matches between report creation and retrieval
- Check browser console for errors

## 📊 Testing Scenarios

### Valid Reports (Should be flagged as VALID)
```javascript
// Spam example
{
  reportType: "spam",
  postContent: "BUY NOW! AMAZING FERTILIZER! CLICK HERE!",
  description: "This is clearly spam advertising"
}

// Misinformation example  
{
  reportType: "misinformation",
  postContent: "Drinking bleach will cure plant diseases",
  description: "This is dangerous misinformation"
}
```

### Invalid Reports (Should be flagged as INVALID)
```javascript
// Legitimate disagreement
{
  reportType: "harassment", 
  postContent: "I disagree with your farming method",
  description: "This person disagreed with me"
}

// Normal business post
{
  reportType: "fraud",
  postContent: "Selling organic seeds with certificate",
  description: "Seems suspicious to me"
}
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Required
NEXT_PUBLIC_N8N_WEBHOOK_URL=your-webhook-url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Optional
MAX_REPORTS_PER_DAY=10
MAX_EVIDENCE_FILE_SIZE=10485760  # 10MB
```

### n8n Workflow Customization
- Adjust GPT-4o temperature (0.1-1.0)
- Modify system prompt for different analysis
- Add rate limiting logic
- Customize notification messages

### Firebase Functions Configuration
- Update CORS settings for production
- Add authentication middleware
- Implement rate limiting
- Add email notifications

## 📈 Monitoring & Maintenance

### Key Metrics to Monitor
- Report submission rate
- AI accuracy (valid vs invalid decisions)
- Response times
- Error rates
- User satisfaction

### Regular Maintenance Tasks
- Review AI decision accuracy
- Update GPT-4o prompts if needed
- Clean up old reports (optional)
- Monitor API usage and costs
- Update security rules as needed

## 🎯 Success Criteria

Your report system is working correctly when:
1. ✅ Users can submit reports via the modal
2. ✅ Reports are saved to Firebase immediately
3. ✅ n8n workflow processes reports automatically
4. ✅ GPT-4o provides intelligent analysis
5. ✅ Status updates appear in real-time
6. ✅ Users receive appropriate notifications
7. ✅ Reports page shows complete audit trail

## 📞 Getting Help

If you encounter issues:
1. Check browser console for error messages
2. Review Firebase Functions logs
3. Check n8n execution history
4. Verify all environment variables are set
5. Test each component individually using the test script

The system is designed to be robust - even if n8n is down, reports will still be saved to Firebase for later processing.

---

**🎉 Congratulations!** Once all steps are complete, you'll have a fully functional AI-powered report validation system for AgriLink!
