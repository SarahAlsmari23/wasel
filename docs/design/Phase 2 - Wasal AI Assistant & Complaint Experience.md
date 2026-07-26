# Phase 2 - Wasal AI Assistant & Complaint Experience

## Objective

Build the complete complaint submission experience inside Wasal.

This phase focuses on the AI chat interface, complaint analysis flow, complaint summary, and government entity recommendation.

At the end of this phase, users should be able to interact with Wasal exactly as if the AI were already connected, even if the responses are currently mocked.

---

# User Access Model

Wasal provides two AI experiences depending on the user's goal.

## AI Assistant Mode (Guest & Logged-in Users)

Available to everyone without requiring login.

Users can:

- Ask general questions about government complaints.
- Learn about government authorities.
- Ask which authority is responsible for a specific issue.
- Understand complaint procedures.
- Learn about required documents.
- Ask questions related to government services.

No complaint will be generated in this mode.

---

## Complaint Builder Mode (Logged-in Users Only)

Available only after logging in.

Users can:

- Start a new complaint.
- Answer AI follow-up questions.
- Generate a professional complaint summary.
- Save complaint drafts.
- Save conversations.
- View complaint history.
- Continue unfinished complaints.

---

# Pages Included

- Wasal AI Assistant
- Complaint Builder
- Government Recommendation Card
- Complaint Summary
- Save Complaint Flow

---

# Layout

Desktop Layout

```
----------------------------------------------------------
Header
----------------------------------------------------------

| Government Recommendation Card |     AI Conversation    |
|                                |                        |
|                                |                        |
|                                |                        |
|                                |                        |
----------------------------------------------------------
Message Input
----------------------------------------------------------
```

Mobile Layout

The Government Recommendation Card should appear below the conversation.

---

# AI Modes

Before starting the conversation, users should choose how they want to use Wasal.

Display two prominent option cards.

---

Option 1

### Ask Wasal

Description

Ask any question related to government complaints, authorities, or complaint procedures.

No login required.

Button

Start Chat

---

Option 2

### Start a Complaint

Description

Allow Wasal to collect information, prepare a professional complaint, and recommend the correct government authority.

Login required.

Button

Start Complaint

---

# Chat Interface

The chat should look modern, clean, and minimal.

Components:

- Conversation messages
- User messages
- AI messages
- Typing animation
- Scrollable history
- Message timestamp
- Auto scroll

---

# Input Area

Fixed at the bottom.

Contains:

- Text field
- Send button
- Attachment button

Placeholder:

```
Describe your complaint...
```

---

# Starter Suggestions

Before the first message, display quick suggestion chips.

Examples:

- لدي مشكلة مع شركة اتصالات.
- أريد تقديم شكوى ضد متجر.
- لدي مشكلة في خدمة حكومية.
- كيف أعرف الجهة المختصة؟

Clicking any suggestion automatically fills the input field.

---

# File Upload

Allow uploading:

- PDF
- Image
- Word

Display uploaded files before sending.

Maximum:

- One file for now.

---

# AI Conversation Flow

Two conversation flows should exist.

---

Flow 1

General AI Assistant

Example

User

```
كيف أقدم شكوى على شركة اتصالات؟
```

AI

```
يمكنك تقديم الشكوى من خلال هيئة الاتصالات بعد تجهيز المعلومات المطلوبة...
```

The conversation ends after answering the user's question.

No complaint is generated.

---

Flow 2

Complaint Builder

Example

User

```
أريد تقديم بلاغ.
```

If the user is not logged in:

Display Login Required.

After login:

Begin collecting complaint information.

Example

```
ما هي الجهة التي ترغب في تقديم الشكوى ضدها؟
```

Continue asking questions until enough information has been collected.

Generate the complaint summary.

---

# AI Thinking State

While processing, display an animated loading state.

Example:

```
وصال يحلل الشكوى...
```

---

# Complaint Analysis Card

Once analysis is completed, display a recommendation card.

Desktop:

- Left side

Mobile:

- Below the conversation

---

Card Content

- Government Logo
- Government Name
- Short Description
- Complaint Category
- Complaint Summary
- Complaint Details
- Required Documents
- Submission Steps
- Official Website Button
- Confidence Score

Example:

```
وزارة التجارة

Category:
Consumer Protection

Summary:
رفض تعويض فاتورة.

Required Documents:

• Invoice
• Conversation proof

Recommended Action

Submit complaint through Ministry of Commerce.
```

---

# Action Buttons

Inside the Recommendation Card

Primary

```
Go to Official Website
```

Secondary

```
Save Complaint
```

Third

```
Copy Complaint Summary

```

---

# AI Conversation Flow

Two conversation flows should exist.

---

Flow 1

General AI Assistant

Example

User

```
كيف أقدم شكوى على شركة اتصالات؟
```

AI

```
يمكنك تقديم الشكوى من خلال هيئة الاتصالات بعد تجهيز المعلومات المطلوبة...
```

The conversation ends after answering the user's question.

No complaint is generated.

---

Flow 2

Complaint Builder

Example

User

```
أريد تقديم بلاغ.
```

If the user is not logged in:

Display Login Required.

After login:

Begin collecting complaint information.

Example

```
ما هي الجهة التي ترغب في تقديم الشكوى ضدها؟
```

Continue asking questions until enough information has been collected.

Generate the complaint summary.

---

# Conversation History

Logged-in users can reopen previous conversations.

Each conversation card contains:

- Title
- Created Date
- Government Entity
- Status
- Open Conversation
- Delete

---

# Complaint Status

Available status badges:

- Draft
- Completed
- Pending
- Submitted

---

# AI Response Design

Support:

- Markdown
- Bullet Lists
- Bold Text
- Clickable Links
- Government Badges

---

# Initial State

When users first open the Wasal page, display two primary actions.

---

Ask Wasal

Use the AI assistant to ask general questions.

No login required.

---

Start a Complaint

Begin creating a professional complaint.

Requires login.

This should be the most visually prominent action.

---

# Error State

If analysis fails:

```
تعذر تحليل الشكوى.

يرجى المحاولة مرة أخرى.
```

Display Retry Button.

---

# Loading States

Create loading states for:

- Conversation
- Recommendation Card
- File Upload
- Save Complaint
- Export PDF

---

# Responsive Design

Support:

- Desktop
- Tablet
- Mobile

No horizontal scrolling.

---

# Animations

Use smooth animations for:

- Page transitions
- Chat message appearance
- Typing animation
- Recommendation Card appearance
- Hover effects
- Button micro-interactions

---

# Mock Data

Until backend integration, use mock data.

Example Government

```
وزارة التجارة
```

Complaint Type

```
Consumer Protection
```

Summary

```
رفض تعويض فاتورة.
```

Official Link

```
https://example.com

General AI

```
كيف أقدم شكوى على متجر إلكتروني؟
```

Complaint Builder

```
رفضت شركة الاتصالات تعويض فاتورتي.
```
```

---

# Accessibility

Support:

- Keyboard navigation
- Visible focus states
- Screen reader labels
- High contrast buttons
- RTL support

---

# Components to Build

- AI Chat Container
- Chat Message Bubble
- Chat Input
- Suggestion Chips
- File Upload Component
- Typing Indicator
- Recommendation Card
- Complaint Summary Card
- Status Badge
- Save Complaint Modal
- Conversation History Card
- Empty State
- Error State
- Loading Skeleton
- Export Button
- Government Badge

---

# Complaint Progress Timeline 

After the AI finishes analyzing the complaint, display a visual progress timeline showing the user's journey.

Timeline Example:

```
🟢 Complaint Analysis
        ↓
🟢 Government Identified
        ↓
🟢 Complaint Summary Generated
        ↓
🟡 Ready for Submission
        ↓
⚪ Submitted (Future Feature)
```

Purpose:

- Help users understand where they are in the complaint journey.
- Reduce uncertainty.
- Increase confidence in the AI process.
- Improve overall user experience.

This timeline should appear above the Government Recommendation Card after the AI completes its analysis.

# Feedback Messages

Display temporary toast messages after important user actions.

Examples

```
تم حفظ البلاغ كمسودة.
```

```
تم نسخ ملخص البلاغ.
```

```
تعذر حفظ البلاغ.
```

```
يرجى تسجيل الدخول لبدء إنشاء البلاغ.
```

These messages should disappear automatically after a few seconds.