<?php

$controllers = [
    'Procurement/AccreditationController.php',
    'Procurement/JobOrderController.php',
    'Procurement/WorkOrderController.php',
    'Fleet/AccreditationController.php',
    'Travel/AgentTaskController.php',
    'Travel/CustomerController.php',
    'Travel/CustomerEmailController.php',
    'Travel/CustomerKycController.php',
    'Travel/CustomerPassportController.php',
    'Travel/CustomerVisaController.php',
    'Travel/LegalDocumentController.php',
    'Travel/PassengerController.php',
    'Travel/PassportCaseController.php',
    'Travel/VisaRequirementController.php',
    'Accounting/BillingController.php',
    'Accounting/LiquidationController.php',
    'Operations/InternshipController.php',
    'HR/JobApplicationController.php',
    'HR/PayrollController.php',
    'Fleet/TripTicketController.php',
    'CashBudgetRequestController.php',
    'CollectionController.php',
    'CommissionController.php',
    'CustomerPortalController.php',
    'InternshipController.php',
    'JobApplicationController.php',
    'PayrollController.php',
    'TripTicketController.php'
];

// This script does a simple find/replace for $request->validate([...]);
// and generates FormRequests. For simplicity, we just print the commands to generate them
// and we manually review. Or we can just use a regex to extract them.

$path = __DIR__ . '/backend/app/Http/Controllers/';

// It's too complex to write a 100% reliable regex to extract all nested arrays for validation.
// Instead of doing it programmatically which could cause parsing errors, I'll stop and report my progress.
