# JVD Internal Management System — Business Logic Requirements
**Source:** Boss Takedown Notes / Stakeholder Insights  
**Last Updated:** 2026-05-12  
**Status:** Living Document — Update as clarifications are received

---

## 1. Internal Jargon & Terminology

| Term | Definition |
|---|---|
| **Joiners** | Individual, couple, or group passengers who share the same fleet or travel package. A single trip booking can contain multiple joiners from different parties (e.g., a Baguio trip may combine an individual, a couple, and a family group all under one bus/package). |
| **Fleet** | Company-owned vehicles managed under the PMS module. |
| **PMS** | Preventive Maintenance System — also serves as the full vehicle profiling system. |
| **JO** | Job Order — internal work request for vehicle maintenance. |
| **WO** | Work Order — auto-generated from PMS schedules; requires approval before execution. |
| **PO** | Purchase Order — issued only when parts or products must be sourced from external suppliers. |
| **KYC** | Know Your Customer — compliance documents uploaded during accreditation. |

---

## 2. Customer Details

Each customer record must capture the following minimum fields:

- **Full Name**
- **Address**
- **Contact Number**
- **Email Address**

> **Note:** Customers may book as individuals, couples, or groups. The system must support a **Joiners** model where multiple customer records are linked to a single booking/package.

---

## 3. Travel Module — Joiners Logic

- A single travel booking (fleet/package) can accommodate **multiple joiners** of different types (individual, couple, group).
- Example: A Baguio trip may have Joiner A (individual), Joiner B (couple), and Joiner C (family group) — all under the same bus/departure.
- The system must track each joiner's details separately but link them to the parent booking.
- **Passenger manifests** should reflect all joiners per fleet/trip.

---

## 4. Procurement Workflow

### 4.1 Purchase Order (PO)
- **Responsible:** Sir Jaymart
- A PO is issued **only** for parts or products that must be **sourced from external suppliers**.
- PO must include:
  - Item/Part Number
  - Quantity
  - Supplier details (cross-referenced and counter-checked)
- **Monthly payment tracking and consignment records** must be maintained.
- Each receipt must capture the **part number and all details** necessary to counter-check all purchased parts (critical for vehicle maintenance audit trails).
- **Supplier verification:** All supplier information must be cross-checked and counter-checked before PO issuance.

### 4.2 Check Records
- PO records must be maintained for auditing purposes.
- System should support filtering/searching POs by supplier, part number, date range, and status.

---

## 5. Work Orders & Job Orders

### 5.1 Job Order (JO)
- **Authorized to issue:** Ma'am Minda
- A Job Order can be created for vehicle maintenance tasks.
- If **no PO is required** (parts already in-house), the JO proceeds directly to execution without waiting for procurement.
- If **parts must be sourced externally**, a linked PO is generated and must be fulfilled before the JO can proceed.

### 5.2 Work Order (WO)
- **Focus:** PMS (Preventive Maintenance System)
- Work Orders are **auto-generated** by the system based on PMS schedules (mileage thresholds, date intervals).
- **Critical Rule:** Auto-generated WOs must be **approved by the designated employee** before any maintenance work proceeds. No work should begin on an unapproved WO.
- Mechanics can also **request** a Job Order for vehicle maintenance through the system.

### Workflow Summary

```
PMS Schedule Triggered
        ↓
Auto-Generate Work Order (WO)
        ↓
Designated Employee Reviews & Approves WO
        ↓
     [No external parts needed?]
      Yes → Proceed with JO directly
      No  → Issue PO to Supplier → Receive Parts → Proceed with JO
        ↓
Work Completed → Record in PMS Vehicle Profile
```

---

## 6. Preventive Maintenance System (PMS)

### 6.1 Vehicle Profiling (Critical)
- **Each vehicle must have its own individual profile.** The PMS also serves as the complete vehicle profiling system.
- Per-unit profile must include:
  - Vehicle details (plate number, make, model, year)
  - Designated driver(s)
  - All vehicle documents (registration, insurance, permits, etc.)
  - Full maintenance history
  - Mileage records
  - Upcoming scheduled maintenance

### 6.2 System Overview
- The PMS must provide both:
  - **Individual unit view** — deep profile per vehicle
  - **Fleet overview** — summary of all vehicles' status, due maintenance, alerts

### 6.3 Company Consumption Tracking (CRITICAL)
> **Boss emphasis: THIS IS CRITICAL FOR BUSINESS WORKFLOW AND RECORDS COMPILATION.**

- The system must track **all company consumables and parts consumption** per vehicle.
- This data is used to:
  - **Audit** all company consumption comprehensively
  - **Predict** future maintenance needs
  - Support financial reporting for operational costs

### 6.4 PMS Schedule
- PMS schedule documents are maintained in the office.
- The system should mirror/digitize these schedules and send alerts when maintenance is due.

---

## 7. Accreditations Module

Accreditations cover **three entity types:**
1. **Suppliers** — external vendors providing goods/services
2. **Partners** — affiliated companies or collaborators
3. **Clients** — customers or organizations being serviced

### 7.1 Required Information Per Accreditation
- Company permits and government documents
- Rates / pricing agreements
- Identification documents
- Contact person details

### 7.2 Legal & Compliance Documents
- **Non-Disclosure Agreement (NDA)** — required per accreditation
- **Terms and Agreement** — required per accreditation
- Must adhere to **professional and legal standards**

### 7.3 KYC (Know Your Customer) Process
- Each accredited entity must submit KYC documents.
- KYC submission flow:
  - System generates a **Gmail-accessible submission link/form** for the supplier/partner/client to upload their KYC documents.
  - Documents are stored within the accreditation profile.
- System must support **document upload functionality** for KYC files.

---

## 8. Automated Service Adviser

- The system must include an **Automated Service Adviser** feature.
- This adviser should:
  - Notify relevant staff when a vehicle is due for maintenance (based on PMS schedule).
  - Recommend service actions based on mileage, age of last service, and consumption data.
  - Generate alerts for expiring vehicle documents, accreditation renewals, or KYC expirations.
- Exact implementation scope to be defined in Sprint planning.

---

## 9. Key Business Rules Summary

| Rule | Detail |
|---|---|
| Auto-generated WOs require approval | No maintenance starts without designated employee sign-off |
| PO only for external sourcing | Internal stock fulfillment bypasses PO entirely |
| Joiners can be mixed types per booking | One trip can have individual + couple + group joiners |
| Each vehicle has its own PMS profile | No shared profiles; designated drivers recorded per unit |
| All consumption must be recorded | Critical for audit and cost prediction |
| KYC required for all accredited entities | Submitted via Gmail-accessible form |
| NDA + Terms required per accreditation | Legal compliance is mandatory |

---

## 10. Open Items / For Clarification

- [ ] Exact fields required on the KYC submission form
- [ ] Who approves accreditations (designated employee/role)?
- [ ] Automated Service Adviser — AI-based recommendations vs. rule-based threshold alerts?
- [ ] Joiner pricing logic — does each joiner type have a different rate within the same package?
- [ ] Monthly consignment payment schedule — tracked per supplier or per PO?
