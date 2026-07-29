# Phase 3 - User Dashboard & Account Management

## Objective

---

The Dashboard is available only for authenticated users.

Its purpose is to help users manage their complaint history, saved drafts, conversations, and account settings.

Users who only interact with the AI Assistant without logging in will not have access to the Dashboard.

---

# Pages Included

- Dashboard
- Previous Complaints
- Conversation History
- Saved Drafts
- Profile
- Settings

---

# Dashboard

Route

```
/dashboard
```
The Dashboard is not the primary entry point of Wasal.

Users are redirected here only after logging in.

Its purpose is to manage previously created complaints rather than start new ones.

---

# Dashboard Layout

Desktop

```
---------------------------------------------------
Sidebar
---------------------------------------------------

Dashboard

New Complaint

Previous Complaints

Conversations

Saved Drafts

Profile

Settings

Logout

---------------------------------------------------

Main Content
```

Mobile

Bottom Navigation

or

Collapsible Sidebar

---

# Dashboard Overview

Display a welcome section.

Example

```
مرحباً، جمانة 👋

```

---

# Continue Where You Left Off

If the user has an unfinished complaint, display this section directly below the welcome message.

Example

```
Continue Where You Left Off

Telecommunication Billing Complaint

Last Edited:
2 hours ago

Government Entity:
Ministry of Commerce

Status:
Draft

[ Continue Complaint ]
```

Purpose

- Allow users to quickly resume unfinished complaints.
- Reduce navigation steps.
- Improve overall user experience.
- Highlight the most recent draft immediately after login.

If no unfinished complaints exist, hide this section automatically.

If multiple drafts exist, display only the most recently updated complaint.

Provide a "View All Drafts" button below the card.

---

# Quick Statistics

Display summary cards.

Examples

Completed Complaints

```
12
```

Saved Drafts

```
4
```

Previous Conversations

```
19
```

Recommended Government Entities

```
8
```

---

# Quick Actions

Provide shortcut actions.

Buttons

```
New Complaint
```

Opens the Complaint Builder.

---

```
Continue Draft
```

Continue the most recent unfinished complaint.

---

```
Ask Wasal
```

Open the AI Assistant in General Question Mode.

---

```
Browse Government Authorities
```

Navigate to the Government Authorities page.

---

# Recent Activity

Display latest user activity.

Each activity contains

- Complaint title
- Government entity
- Date
- Status

Example

```
Complaint

Telecommunication Billing

Status

Draft
```

---

# Previous Complaints

Route

```
/dashboard/complaints
```

Display all saved complaints.

Each Complaint Card contains

- Complaint Title
- Government Logo
- Government Name
- Complaint Category
- Date
- Status Badge

Buttons

```
Open

Edit

Delete

```

---

# Complaint Status

Available Status

- Draft
- Ready
- Submitted
- Completed

Each status should have a unique color.

---

# Search & Filter

Allow users to search by

- Complaint Name
- Government Entity

Filters

- Status
- Date
- Category

Sorting

- Newest
- Oldest

---

# Conversation History

Route

```
/dashboard/conversations
```

Display every AI conversation.

Conversation Card

- Conversation Title
- Last Message
- Government Entity
- Created Date

Buttons

```
Continue Conversation

Delete

```
If the conversation is related to a saved complaint, display a small badge showing the associated government authority.

---

# Saved Drafts

Route

```
/dashboard/drafts
```

Display unfinished complaints.

Each Draft contains

- Title
- Last Edited
- Government Entity

Buttons

```
Continue

Delete
```

---

# User Profile

Route

```
/dashboard/profile
```

Display

Profile Picture

Full Name

Email

Phone Number

Account Creation Date

Preferred Language

Buttons

```
Edit Profile

Change Password
```

---

# Settings

Route

```
/dashboard/settings
```

Sections

---

## General

Language

Arabic

English

---

## Appearance

Light Mode

Dark Mode

System Theme

---

## Privacy

Manage Account

Delete Account

Download Personal Data

---

## Security

Change Password

Two-Factor Authentication (Future Feature)

---

# Logout

Display confirmation modal.

Example

```
Are you sure you want to log out?
```

Buttons

```
Cancel

Logout
```

---

# Empty States

No complaints

```
ليس لديك أي بلاغات حتى الآن.
```

Button

```
ابدأ بلاغاً جديداً
```

---

No conversations

```
ابدأ أول محادثة مع وصال.
```

---

No drafts

```
لا توجد مسودات محفوظة.
```

---

# Loading States

Dashboard Skeleton

Complaint List Skeleton

Conversation Skeleton

Profile Skeleton

Settings Skeleton

---

# Responsive Design

Desktop

Tablet

Mobile

Sidebar becomes Drawer on Mobile.

Cards become stacked.

---

# Animations

Fade between pages

Card hover effect

Status badge animation

Sidebar transition

Modal animation

---

# Accessibility

Keyboard Navigation

Screen Reader Support

Visible Focus States

RTL Support

Responsive Typography

---

# Components to Build

- Dashboard Layout
- Sidebar Navigation
- Dashboard Cards
- Statistics Cards
- Complaint Card
- Conversation Card
- Draft Card
- Status Badge
- Search Bar
- Filter Dropdown
- Profile Card
- Settings Sections
- Toggle Switch
- Confirmation Modal
- Empty State
- Loading Skeleton
- Continue Where You Left Off Card
- Quick Action Card
- Toast Feedback Message

# Feedback Messages

Display temporary toast messages after user actions.

Examples

```
تم حفظ البلاغ كمسودة.
```

```
تم نسخ ملخص البلاغ.
```

```
تم تحديث الملف الشخصي.
```

```
حدث خطأ، يرجى المحاولة مرة أخرى.
```

Toast messages should disappear automatically after a few seconds.