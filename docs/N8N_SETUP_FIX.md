# 🔧 n8n Setup Fix for AgriLink Report System

## ❌ Issues Fixed

1. **Basic Auth Error**: Removed unnecessary HTTP Basic Authentication
2. **Environment Variable Error**: Replaced `{{ $env.FIREBASE_FUNCTION_URL }}` with direct URLs
3. **Credential Configuration**: Simplified OpenAI credential setup

## ✅ Quick Fix Steps

### 1. Use the Fixed Workflow

**Replace your current workflow with the fixed version:**
- Delete the old workflow in n8n
- Import `report-validation-workflow-fixed.json` instead

### 2. Update Firebase Function URLs

**In each HTTP Request node, replace the URL with your actual Firebase Functions URL:**

```
OLD: {{ $env.FIREBASE_FUNCTION_URL }}/updateReportStatus
NEW: https://us-central1-your-project-id.cloudfunctions.net/updateReportStatus
```

**Find your Firebase Functions URL:**
```bash
# Deploy functions first
firebase deploy --only functions

# Your URL will be shown in the output, format:
# https://[REGION]-[PROJECT-ID].cloudfunctions.net/[FUNCTION-NAME]
```

### 3. Configure Each HTTP Request Node

**Update these 4 nodes with your actual URLs:**

1. **Update Valid Status**:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/updateReportStatus
   ```

2. **Update Invalid Status**:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/updateReportStatus
   ```

3. **Notify Reported User**:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/sendNotification
   ```

4. **Notify Reporter (Invalid)**:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/sendNotification
   ```

5. **Handle Post Action**:
   ```
   https://us-central1-your-project-id.cloudfunctions.net/handlePostAction
   ```

### 4. OpenAI Credential Setup

**Simple credential configuration:**
1. Go to n8n Settings → Credentials
2. Click "Add Credential" → Search "OpenAI"
3. Enter your API key
4. Name it exactly: `openai-credentials`
5. Save

### 5. Test the Workflow

**Test with curl:**
```bash
curl -X POST https://your-n8n-instance.com/webhook/report-validation \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "test_123",
    "reporterId": "user1", 
    "reportedUserId": "user2",
    "postId": "post1",
    "reportType": "spam",
    "description": "Test spam report",
    "postContent": "BUY NOW! CLICK HERE!",
    "postAuthor": "Test User",
    "reporterName": "Test Reporter"
  }'
```

## 🎯 What Each Node Does

### Webhook Trigger
- **URL**: `https://your-n8n-instance.com/webhook/report-validation`
- **Method**: POST
- **Purpose**: Receives reports from AgriLink frontend

### GPT-4o Analysis  
- **Credential**: `openai-credentials`
- **Model**: `gpt-4o`
- **Purpose**: Analyzes report content for validity

### Process AI Decision
- **Type**: Code node
- **Purpose**: Parses GPT response and formats data

### Decision Router
- **Type**: IF node  
- **Purpose**: Routes to valid/invalid paths based on AI decision

### HTTP Request Nodes
- **Authentication**: None (removed basic auth)
- **Headers**: Content-Type: application/json
- **Purpose**: Call Firebase Functions for updates/notifications

## 🚨 Common Errors & Solutions

### Error: "Basic Auth credentials not found"
**Solution**: Remove authentication from HTTP Request nodes
```json
// Remove these lines from node parameters:
"authentication": "predefinedCredentialType",
"nodeCredentialType": "httpBasicAuth",
```

### Error: "Environment variable FIREBASE_FUNCTION_URL not found"
**Solution**: Use direct URLs instead of environment variables
```json
// Change from:
"url": "={{ $env.FIREBASE_FUNCTION_URL }}/updateReportStatus"
// To:
"url": "https://us-central1-your-project.cloudfunctions.net/updateReportStatus"
```

### Error: "OpenAI credential not found"
**Solution**: Ensure credential name matches exactly
- Credential name must be: `openai-credentials`
- Check spelling and case sensitivity

### Error: "Firebase Functions not found (404)"
**Solution**: Deploy Firebase Functions first
```bash
cd firebase-functions
npm install
firebase deploy --only functions
```

## 📋 Node Configuration Checklist

- [ ] Webhook Trigger: Path set to `report-validation`
- [ ] GPT-4o Analysis: Credential set to `openai-credentials`
- [ ] All HTTP Request nodes: No authentication configured
- [ ] All HTTP Request nodes: Correct Firebase Function URLs
- [ ] Decision Router: Condition checks for "VALID"
- [ ] Workflow: Activated (toggle switch on)

## 🧪 Testing Checklist

- [ ] Webhook responds to POST requests
- [ ] GPT-4o credential works (test in node)
- [ ] Firebase Functions are deployed and accessible
- [ ] HTTP Request nodes don't show auth errors
- [ ] Workflow executes end-to-end successfully
- [ ] Response is returned to webhook caller

## 📞 Still Having Issues?

1. **Check n8n Execution Log**: Go to Executions tab and check failed runs
2. **Test Individual Nodes**: Use "Execute Node" button on each node
3. **Verify URLs**: Test Firebase Function URLs directly in browser/Postman
4. **Check Credentials**: Ensure OpenAI API key is valid and has credits

The fixed workflow removes all authentication complexity and uses direct URLs for maximum compatibility.
