Perfect. Here's a complete breakdown of the **Staff Dashboard**—the interface staff members will use to monitor and respond to client events. This dashboard is designed to be clean, intuitive, and focused on just the essential actions needed to ensure client safety and compliance documentation.

---

## Staff Dashboard: Overview

The Staff Dashboard is a web-based PWA (Progressive Web App) accessible via tablet or desktop. It provides staff with:

* A real-time queue of client alerts (AI-verified or scheduled)
* A simple interface to view, respond to, and log those events
* The ability to initiate two-way calls (via Google Meet)
* Tools to document every action in a way that supports billing and compliance

### 1. Main Dashboard / Event Queue

**Purpose:** Show a live view of client statuses and any open events that require action.

**Features:**

* List or grid of clients with color-coded “status pills”:

  * 🟢 Green = Online, no events
  * 🟡 Yellow = Scheduled check-in event pending
  * 🔴 Red = AI-verified alert (e.g. fall, door open)
* Filters:

  * “All Clients”
  * “My Queue” (events assigned to me or unclaimed)
  * “New Events Only”
* Clicking on a client opens their dedicated Client Dashboard

---

### 2. Client Dashboard (One per client)

**Purpose:** Let staff see everything they need about the client and respond to active alerts.

**Features:**

* **Header**:

  * Client name and photo (optional)
  * Status pill (green/yellow/red)
  * Emergency Services info (pre-filled from admin config)

* **Active Event Panel**:

  * List of open events (e.g. “Fall Detected – Living Room – 10:03 AM”)
  * “Play Clip” button if AI-verified footage is attached
  * “Acknowledge” button (marks event as being handled)

* **Event Log Form**:

  * Required free-text field: “What did you do?”

    * Examples:

      * “Attempted contact via Google Meet – no answer.”
      * “Client responded. No injury.”
      * “Client needed help – emergency services were called.”
  * Optional: drop-down to select an outcome (e.g., “false alarm,” “emergency escalated”)

* **Action Buttons**:

  * “Start Call” → Launches Google Meet
  * “Close Event” → Disabled until notes are completed

* **SOP (Standard Operating Procedure) Section**:

  * SOP list for this event type
  * Relevant SOP is auto-highlighted (e.g., “Fall Detected SOP”)
  * Staff can open it as a reference while writing notes

---