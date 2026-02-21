// PH Startup Compliance Checklist — Data + Logic

export type BusinessType = "sole-proprietorship" | "partnership" | "corporation";
export type Agency = "DTI" | "SEC" | "BIR" | "LGU" | "OTHER";
export type CompliancePhase = "registration" | "post-registration" | "ongoing";

export interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  agency: Agency;
  phase: CompliancePhase;
  appliesTo: BusinessType[];
  costMin: number;
  costMax: number;
  estimatedDays: number;
  requiredDocuments: string[];
  tips?: string;
  dependsOn?: string[];
}

export interface ComplianceSummary {
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  costMin: number;
  costMax: number;
  completedCostMin: number;
  completedCostMax: number;
  remainingDays: number;
  byPhase: Record<CompliancePhase, { total: number; completed: number }>;
  byAgency: Record<Agency, { total: number; completed: number }>;
  nextSteps: ComplianceItem[];
}

export const DATA_LAST_UPDATED = "2026-02";

export const PHASE_LABELS: Record<CompliancePhase, string> = {
  registration: "Registration",
  "post-registration": "Post-Registration",
  ongoing: "Ongoing Compliance",
};

export const AGENCY_COLORS: Record<Agency, string> = {
  DTI: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SEC: "bg-green-500/20 text-green-400 border-green-500/30",
  BIR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  LGU: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  OTHER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const ALL_TYPES: BusinessType[] = ["sole-proprietorship", "partnership", "corporation"];

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  // === REGISTRATION ===
  {
    id: "dti-business-name",
    title: "Register Business Name with DTI",
    description:
      "Register your business name with the Department of Trade and Industry. This is required for sole proprietorships and is your primary business registration.",
    agency: "DTI",
    phase: "registration",
    appliesTo: ["sole-proprietorship"],
    costMin: 200,
    costMax: 2000,
    estimatedDays: 1,
    requiredDocuments: [
      "Valid government ID",
      "Accomplished DTI application form",
      "Proposed business name (prepare 3 alternatives)",
    ],
    tips: "Register online via the DTI BNRS (Business Name Registration System) at bnrs.dti.gov.ph for faster processing. Name registration is valid for 5 years.",
  },
  {
    id: "sec-registration",
    title: "Register with SEC",
    description:
      "Register your corporation or partnership with the Securities and Exchange Commission. This establishes your business as a separate legal entity.",
    agency: "SEC",
    phase: "registration",
    appliesTo: ["partnership", "corporation"],
    costMin: 2000,
    costMax: 15000,
    estimatedDays: 7,
    requiredDocuments: [
      "Articles of Incorporation / Partnership",
      "By-Laws (for corporations)",
      "Treasurer's Affidavit",
      "Bank certificate of deposit (minimum paid-up capital)",
      "SEC Name Reservation confirmation",
      "Valid IDs of incorporators/partners",
    ],
    tips: "Reserve your company name first via SEC CRMS (Company Registration and Monitoring System). The Revised Corporation Code allows single-person corporations (OPC). Minimum capital requirement was removed by the CREATE Act for most businesses.",
  },
  {
    id: "barangay-clearance",
    title: "Obtain Barangay Clearance",
    description:
      "Secure a Barangay Business Clearance from the barangay where your business will operate. This is a prerequisite for the Mayor's Permit.",
    agency: "LGU",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 500,
    costMax: 2000,
    estimatedDays: 3,
    requiredDocuments: [
      "DTI Certificate or SEC Registration",
      "Proof of business address (lease contract or land title)",
      "Valid ID of business owner/representative",
    ],
    dependsOn: ["dti-business-name", "sec-registration"],
    tips: "Visit your local barangay hall. Processing is usually same-day to 3 days. Fees vary by barangay.",
  },
  {
    id: "mayors-permit",
    title: "Apply for Mayor's Permit / Business Permit",
    description:
      "Apply for a Mayor's Permit (Business Permit) from the city or municipality where your business operates. This is your license to operate.",
    agency: "LGU",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 3000,
    costMax: 30000,
    estimatedDays: 10,
    requiredDocuments: [
      "Barangay Clearance",
      "DTI Certificate or SEC Registration",
      "Lease contract or proof of business address",
      "Community Tax Certificate (cedula)",
      "Fire Safety Inspection Certificate (from BFP)",
      "Sanitary permit (if applicable)",
    ],
    dependsOn: ["barangay-clearance"],
    tips: "Fees depend on capitalization and business type. Apply in January for renewals. Late renewal incurs 25% surcharge + 2% monthly interest. Many LGUs now offer online application via eBPLS.",
  },
  {
    id: "bir-registration",
    title: "Register with BIR (TIN & Form 1901/1903)",
    description:
      "Register your business with the Bureau of Internal Revenue. Sole proprietors use Form 1901; corporations and partnerships use Form 1903. You'll receive your TIN and Certificate of Registration (COR).",
    agency: "BIR",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 30,
    costMax: 30,
    estimatedDays: 5,
    requiredDocuments: [
      "DTI Certificate or SEC Registration",
      "Mayor's Permit",
      "Barangay Clearance",
      "Lease contract or proof of address",
      "Valid government ID",
      "BIR Form 1901 (sole prop) or 1903 (corp/partnership)",
    ],
    dependsOn: ["mayors-permit"],
    tips: "The ₱500 registration fee was abolished by the EOPT Act (RA 11976) in 2024. Only the ₱30 documentary stamp tax remains. File within 30 days of business start. You'll be assigned your RDO (Revenue District Office) based on business address.",
  },
  {
    id: "bir-payment-system",
    title: "Enroll in BIR eFPS or eBIRForms",
    description:
      "Enroll in the BIR Electronic Filing and Payment System (eFPS) for large taxpayers, or eBIRForms for others. This is required for filing tax returns electronically.",
    agency: "BIR",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 3,
    requiredDocuments: [
      "BIR Certificate of Registration (COR)",
      "BIR Form 1905 (for eFPS enrollment)",
      "Email address",
    ],
    dependsOn: ["bir-registration"],
    tips: "eBIRForms is free and sufficient for most startups. eFPS is mandatory for large taxpayers. Under the EOPT Act, electronic filing is now mandated for most taxpayers; manual filing is only allowed for micro/small taxpayers or when there are system issues.",
  },
  {
    id: "sss-employer",
    title: "Register as SSS Employer",
    description:
      "Register as an employer with the Social Security System. Required if you have employees (including yourself for sole proprietors).",
    agency: "OTHER",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 3,
    requiredDocuments: [
      "SSS Employer Registration Form (R-1)",
      "DTI Certificate or SEC Registration",
      "List of employees (SSS Form R-1A)",
      "Mayor's Permit",
    ],
    dependsOn: ["bir-registration"],
    tips: "Register online via the SSS website. You must remit contributions for employees within the first 10 days of the following month.",
  },
  {
    id: "philhealth-employer",
    title: "Register as PhilHealth Employer",
    description:
      "Register as an employer with the Philippine Health Insurance Corporation for mandatory health insurance coverage of employees.",
    agency: "OTHER",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 3,
    requiredDocuments: [
      "PhilHealth Employer Registration Form (ER1)",
      "DTI Certificate or SEC Registration",
      "BIR Certificate of Registration",
      "List of employees",
    ],
    dependsOn: ["bir-registration"],
    tips: "Contributions are shared 50/50 between employer and employee. Register online at philhealth.gov.ph.",
  },
  {
    id: "pagibig-employer",
    title: "Register as Pag-IBIG Employer",
    description:
      "Register as an employer with the Home Development Mutual Fund (Pag-IBIG) for mandatory savings and housing loan program.",
    agency: "OTHER",
    phase: "registration",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 3,
    requiredDocuments: [
      "Pag-IBIG Employer Registration Form (HQP-PFF-002)",
      "DTI Certificate or SEC Registration",
      "BIR Certificate of Registration",
      "List of employees",
    ],
    dependsOn: ["bir-registration"],
    tips: "Employer contribution is 2% of employee's monthly compensation (max fund salary cap: ₱10,000, max contribution: ₱200/month per side). Register online at pagibigfund.gov.ph.",
  },

  // === POST-REGISTRATION ===
  {
    id: "bir-books-of-accounts",
    title: "Register Books of Accounts with BIR",
    description:
      "Register your books of accounts (journal, ledger, and subsidiary books) with the BIR. These must be registered before first use and renewed annually.",
    agency: "BIR",
    phase: "post-registration",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 500,
    estimatedDays: 1,
    requiredDocuments: [
      "BIR Certificate of Registration",
      "Bound blank books (manual) or computerized accounting system letter request",
      "BIR Form 1905 (if changing from manual to computerized)",
    ],
    dependsOn: ["bir-registration"],
    tips: "You can use computerized books of accounts. Submit a letter to your RDO requesting approval for your accounting software. QuickBooks, Xero, or even properly maintained spreadsheets may qualify.",
  },
  {
    id: "bir-authority-to-print",
    title: "Apply for Authority to Print (ATP) Receipts/Invoices",
    description:
      "Apply for BIR Authority to Print official receipts or sales invoices. You cannot issue valid receipts without this. Alternatively, register a CAS (Computerized Accounting System) or POS.",
    agency: "BIR",
    phase: "post-registration",
    appliesTo: ALL_TYPES,
    costMin: 500,
    costMax: 3000,
    estimatedDays: 5,
    requiredDocuments: [
      "BIR Form 1906 (Application for ATP)",
      "BIR Certificate of Registration",
      "Job order from BIR-accredited printer",
    ],
    dependsOn: ["bir-registration"],
    tips: "The BIR is migrating to electronic invoicing (EIS). Check if your business is covered by the Electronic Invoicing System mandate. For startups, manual receipts are usually sufficient initially.",
  },
  {
    id: "open-bank-account",
    title: "Open a Business Bank Account",
    description:
      "Open a dedicated business bank account to separate personal and business finances. Essential for proper bookkeeping and investor readiness.",
    agency: "OTHER",
    phase: "post-registration",
    appliesTo: ALL_TYPES,
    costMin: 5000,
    costMax: 25000,
    estimatedDays: 3,
    requiredDocuments: [
      "DTI Certificate or SEC Registration",
      "Mayor's Permit",
      "BIR Certificate of Registration",
      "Articles of Incorporation and By-Laws (for corporations)",
      "Board resolution authorizing account opening (for corporations)",
      "Valid IDs of authorized signatories",
    ],
    dependsOn: ["bir-registration"],
    tips: "Choose a bank that supports online banking and has good API integrations. BDO, BPI, and UnionBank are popular choices for startups. Initial deposit requirements vary (₱5K-₱25K).",
  },
  {
    id: "dole-registration",
    title: "Register with DOLE (if 5+ employees)",
    description:
      "Register your establishment with the Department of Labor and Employment if you have 5 or more employees. Required under Rule 1020 of the Occupational Safety and Health Standards.",
    agency: "OTHER",
    phase: "post-registration",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 5,
    requiredDocuments: [
      "DOLE registration form",
      "List of employees",
      "Business Permit",
      "Company profile",
    ],
    dependsOn: ["mayors-permit"],
    tips: "Even if you have fewer than 5 employees, it's good practice to comply with DOLE labor standards early. This includes proper employment contracts, minimum wage compliance, and 13th month pay.",
  },

  // === ONGOING ===
  {
    id: "bir-quarterly-vat",
    title: "File Quarterly VAT/Percentage Tax Return",
    description:
      "File BIR Form 2550Q (quarterly VAT) or 2551Q (quarterly percentage tax) by the 25th day after the end of each quarter. VAT applies if gross sales exceed ₱3M annually; otherwise, 3% percentage tax applies.",
    agency: "BIR",
    phase: "ongoing",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 0,
    requiredDocuments: [
      "BIR Form 2550Q (VAT) or 2551Q (Percentage Tax)",
      "Summary of sales and purchases for the quarter",
      "Official receipts/invoices",
    ],
    tips: "Under the EOPT Act (RA 11976), VAT and percentage tax are now filed quarterly instead of monthly. Due dates: April 25, July 25, October 25, January 25. If gross annual sales are below ₱3M, you pay 3% percentage tax (not VAT). Above ₱3M, you're VAT-registered at 12%. File even if there's zero tax due — failure to file incurs penalties.",
  },
  {
    id: "bir-quarterly-income-tax",
    title: "File Quarterly Income Tax Return",
    description:
      "File BIR Form 1701Q (individuals/sole prop) or 1702Q (corporations/partnerships) quarterly. Due dates: Q1 by May 15, Q2 by Aug 15, Q3 by Nov 15.",
    agency: "BIR",
    phase: "ongoing",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 0,
    requiredDocuments: [
      "BIR Form 1701Q or 1702Q",
      "Financial statements for the quarter",
      "Proof of tax payments (if applicable)",
    ],
    tips: "You can choose between graduated income tax rates or the 8% flat rate (for sole proprietors with gross sales under ₱3M). Consult with your accountant on which option minimizes your tax burden.",
  },
  {
    id: "bir-annual-income-tax",
    title: "File Annual Income Tax Return",
    description:
      "File BIR Form 1701 (individuals/sole prop) or 1702 (corporations) annually. Due by April 15 of the following year. This is the final reconciliation of your income tax for the year.",
    agency: "BIR",
    phase: "ongoing",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 0,
    requiredDocuments: [
      "BIR Form 1701 or 1702",
      "Audited Financial Statements (for corps with gross sales > ₱3M)",
      "All quarterly returns filed during the year",
      "Summary of withholding taxes",
    ],
    tips: "Corporate tax rate is 25% under the CREATE Act (20% for domestic corps with net taxable income ≤ ₱5M and total assets ≤ ₱100M). Sole proprietors can opt for the 8% flat rate if eligible.",
  },
  {
    id: "sec-annual-financial-statements",
    title: "Submit Annual Financial Statements to SEC",
    description:
      "Corporations must submit audited financial statements (AFS) to the SEC annually. Due within 120 days after the fiscal year ends (April 30 for calendar year).",
    agency: "SEC",
    phase: "ongoing",
    appliesTo: ["partnership", "corporation"],
    costMin: 10000,
    costMax: 50000,
    estimatedDays: 0,
    requiredDocuments: [
      "Audited Financial Statements (by an independent CPA)",
      "SEC Form for AFS submission",
      "Tax Clearance or proof of filing of Annual ITR",
    ],
    tips: "AFS must be audited by an SEC-accredited external auditor. Costs vary by firm size: small firms charge ₱10K-₱30K, Big 4 firms charge ₱50K+. Submit via SEC eFAST. Calendar-year companies follow a staggered filing schedule (May-June) based on SEC registration number. Non-December FY-end companies file within 120 days after fiscal year end.",
  },
  {
    id: "sec-annual-gis",
    title: "Submit Annual General Information Sheet (GIS) to SEC",
    description:
      "Corporations must file the General Information Sheet within 30 days after the annual stockholders' meeting. It reports the company's directors, officers, stockholders, and financial position.",
    agency: "SEC",
    phase: "ongoing",
    appliesTo: ["corporation"],
    costMin: 0,
    costMax: 1000,
    estimatedDays: 0,
    requiredDocuments: [
      "SEC GIS Form",
      "Updated list of directors, officers, and stockholders",
      "Financial summary for the fiscal year",
    ],
    tips: "File within 30 days of your annual stockholders' meeting. Late filing incurs penalties. Submit electronically via SEC eFAST.",
  },
  {
    id: "lgu-permit-renewal",
    title: "Renew Mayor's Permit / Business Permit Annually",
    description:
      "Renew your Business Permit/Mayor's Permit every January. Late renewal incurs surcharges. This is required to continue legal business operations.",
    agency: "LGU",
    phase: "ongoing",
    appliesTo: ALL_TYPES,
    costMin: 3000,
    costMax: 30000,
    estimatedDays: 5,
    requiredDocuments: [
      "Previous year's Business Permit",
      "Barangay Clearance (current year)",
      "Community Tax Certificate (cedula)",
      "Updated lease contract",
      "BIR Certificate of Registration",
      "Fire Safety Inspection Certificate",
    ],
    tips: "Renewal period is January 1-20. Late renewal: 25% surcharge + 2% monthly interest. Many LGUs offer early bird discounts in the first week of January.",
  },
  {
    id: "sss-philhealth-pagibig-remittances",
    title: "Remit Monthly SSS/PhilHealth/Pag-IBIG Contributions",
    description:
      "Remit employee and employer contributions monthly. SSS: due within 10 days after month. PhilHealth: due within 10 days. Pag-IBIG: due within 15 days after month end.",
    agency: "OTHER",
    phase: "ongoing",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 0,
    requiredDocuments: [
      "SSS R-3 (Contribution Report)",
      "PhilHealth RF-1 (Remittance Report)",
      "Pag-IBIG remittance form",
      "Payment proof",
    ],
    tips: "Automate through salary software or bank auto-debit. Late remittance incurs 3% monthly penalty (SSS). Use SSS, PhilHealth, and Pag-IBIG online portals for easier processing.",
  },
  {
    id: "bir-withholding-tax",
    title: "File & Remit Withholding Taxes",
    description:
      "If you have employees or pay contractors, you must withhold and remit taxes. File BIR Form 1601-C (compensation) monthly by the 10th. For expanded withholding, file Form 0619-E (monthly remittance, first 2 months of quarter) and Form 1601-EQ (quarterly return, last month of quarter).",
    agency: "BIR",
    phase: "ongoing",
    appliesTo: ALL_TYPES,
    costMin: 0,
    costMax: 0,
    estimatedDays: 0,
    requiredDocuments: [
      "BIR Form 1601-C (compensation withholding, monthly)",
      "BIR Form 0619-E (expanded withholding, monthly remittance)",
      "BIR Form 1601-EQ (expanded withholding, quarterly return)",
      "Alphabetical list of employees/payees",
      "Proof of remittance",
    ],
    tips: "Compensation withholding (1601-C) is filed monthly by the 10th. Expanded withholding tax (EWT) uses Form 0619-E for monthly remittance (first 2 months of quarter) and Form 1601-EQ for the quarterly return. EWT applies to payments to contractors, professionals, and suppliers. Rates vary: 1-2% for goods, 2-15% for services. Failure to withhold makes you liable for the tax.",
  },
];

export function getFilteredChecklist(businessType: BusinessType): ComplianceItem[] {
  return COMPLIANCE_ITEMS.filter((item) => item.appliesTo.includes(businessType));
}

export function areDependenciesMet(
  item: ComplianceItem,
  completedIds: Set<string>,
  filteredItems: ComplianceItem[]
): boolean {
  if (!item.dependsOn || item.dependsOn.length === 0) return true;
  const filteredIds = new Set(filteredItems.map((i) => i.id));
  return item.dependsOn.every(
    (depId) => !filteredIds.has(depId) || completedIds.has(depId)
  );
}

export function groupByPhase(
  items: ComplianceItem[]
): Record<CompliancePhase, ComplianceItem[]> {
  return {
    registration: items.filter((i) => i.phase === "registration"),
    "post-registration": items.filter((i) => i.phase === "post-registration"),
    ongoing: items.filter((i) => i.phase === "ongoing"),
  };
}

export function computeComplianceSummary(
  items: ComplianceItem[],
  completedIds: Set<string>
): ComplianceSummary {
  const totalItems = items.length;
  const completedItems = items.filter((i) => completedIds.has(i.id)).length;
  const progressPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  const costMin = items.reduce((sum, i) => sum + i.costMin, 0);
  const costMax = items.reduce((sum, i) => sum + i.costMax, 0);
  const completedCostMin = items
    .filter((i) => completedIds.has(i.id))
    .reduce((sum, i) => sum + i.costMin, 0);
  const completedCostMax = items
    .filter((i) => completedIds.has(i.id))
    .reduce((sum, i) => sum + i.costMax, 0);

  const remainingItems = items.filter((i) => !completedIds.has(i.id));
  const remainingDays = remainingItems.reduce((sum, i) => sum + i.estimatedDays, 0);

  const phases: CompliancePhase[] = ["registration", "post-registration", "ongoing"];
  const byPhase = {} as Record<CompliancePhase, { total: number; completed: number }>;
  for (const phase of phases) {
    const phaseItems = items.filter((i) => i.phase === phase);
    byPhase[phase] = {
      total: phaseItems.length,
      completed: phaseItems.filter((i) => completedIds.has(i.id)).length,
    };
  }

  const agencies: Agency[] = ["DTI", "SEC", "BIR", "LGU", "OTHER"];
  const byAgency = {} as Record<Agency, { total: number; completed: number }>;
  for (const agency of agencies) {
    const agencyItems = items.filter((i) => i.agency === agency);
    byAgency[agency] = {
      total: agencyItems.length,
      completed: agencyItems.filter((i) => completedIds.has(i.id)).length,
    };
  }

  const nextSteps = remainingItems
    .filter((i) => areDependenciesMet(i, completedIds, items))
    .slice(0, 3);

  return {
    totalItems,
    completedItems,
    progressPercent,
    costMin,
    costMax,
    completedCostMin,
    completedCostMax,
    remainingDays,
    byPhase,
    byAgency,
    nextSteps,
  };
}
