## Overview: What the Admin Dashboard Is

The Admin Dashboard is the control center for configuring clients, managing devices, setting up staff routines, and generating Medicaid-compliant billing documentation. It’s only accessible by users with the "admin" role. The design is role-based, streamlined, and extensible.

## Main Admin Dashboard Sections

### 1. Clients

**Purpose:** Create and manage each individual client’s profile, their service plan, and their hardware configuration.

**Actions:**

* View all clients in a list/table view with search/filter capabilities.
* Add a new client:

  * Name
  * Address
  * Timezone
  * Emergency contact
  * Locale emergency services number
  * Assigned service provider ID (if applicable)
* Edit or delete a client
* View client-specific dashboards (for audit and config)

---

### 2. SOPs (Standard Operating Procedures)

**Purpose:** Define instructions for how staff should respond to different types of events (e.g., what to do if a fall is detected).

**Actions:**

* Add SOPs based on event type:

  * Example: “Fall Detected” SOP includes:

    1. Attempt contact
    2. Observe client via camera
    3. If no response, call 911
    4. Document all steps taken
* Edit and assign SOPs per client or make them global
* Staff can view (but not edit) these in the Client Dashboard when handling an event

---

### 3. Devices & Sensors (Per Client)

**Purpose:** Define and manage the hardware installed at each client’s home (door sensors, fall detection cameras, stoves, bed sensors, etc.)

**Actions:**

* For each client:

  * Add new device/sensor:

    * Device type (camera, contact sensor, stove monitor, etc.)
    * Location label (e.g., “Front Door” or “Living Room”)
    * Device ID or identifier (for mapping webhook alerts)
    * AI behavior or event types expected (e.g., “fall”, “motion”, “door opened”)
  * Edit/delete existing device
  * Define or update event trigger metadata (e.g., subject line match, Home Assistant entity ID)

---

### 4. Logs

**Purpose:** Generate Log records based on staff actions and events.

**Actions:**

* Filter events:

  * By client
  * By staff
  * By date range
  * By event type
* View each event:

  * Staff member who responded
  * Timestamp
  * Event notes
---