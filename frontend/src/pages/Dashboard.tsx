import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  LuUsers,
  LuDollarSign,
  LuShoppingCart,
  LuPackage,
  LuGlobe,
  LuArrowUpRight,
  LuActivity,
  LuCircle,
  LuFileText,
  LuBus,
  LuDownload,
  LuFileSpreadsheet,
  LuChevronLeft,
  LuChevronRight,
  LuMapPin,
  LuUser,
  LuClock,
} from 'react-icons/lu';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// Donut – user distribution
const userDistributionData = [
  { name: 'Drivers',      value: 34, color: '#3b82f6' },
  { name: 'Agents',       value: 24, color: '#8b5cf6' },
  { name: 'Accounting',   value: 16, color: '#10b981' },
  { name: 'Procurement',  value: 13, color: '#f59e0b' },
  { name: 'HR',           value:  8, color: '#ec4899' },
  { name: 'Admin',        value:  5, color: '#6366f1' },
];
// Pie – order status
const orderStatusData = [
  { name: 'Completed',   value: 58, color: '#10b981' },
  { name: 'Pending',     value: 22, color: '#f59e0b' },
  { name: 'In Progress', value: 14, color: '#3b82f6' },
  { name: 'Cancelled',   value:  6, color: '#ef4444' },
];
// Mock data for different branches
const branchData = {
  accounting: [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 5000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
  ],
  procurement: [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 19 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 22 },
    { name: 'Fri', value: 30 },
    { name: 'Sat', value: 10 },
    { name: 'Sun', value: 18 },
  ],
  inventory: [
    { name: 'Mon', value: 85 },
    { name: 'Tue', value: 88 },
    { name: 'Wed', value: 82 },
    { name: 'Thu', value: 90 },
    { name: 'Fri', value: 95 },
    { name: 'Sat', value: 80 },
    { name: 'Sun', value: 85 },
  ],
  travel: [
    { name: 'Mon', value: 5 },
    { name: 'Tue', value: 8 },
    { name: 'Wed', value: 12 },
    { name: 'Thu', value: 7 },
    { name: 'Fri', value: 15 },
    { name: 'Sat', value: 20 },
    { name: 'Sun', value: 12 },
  ],
};

const detailedBranchData = {
  accounting: [
    { Date: '2026-05-18', 'Invoice ID': 'INV-001', Client: 'Acme Corp', Amount: '₱150,000', Status: 'Paid' },
    { Date: '2026-05-17', 'Invoice ID': 'INV-002', Client: 'Globex', Amount: '₱200,000', Status: 'Pending' },
    { Date: '2026-05-16', 'Invoice ID': 'INV-003', Client: 'Soylent Corp', Amount: '₱50,000', Status: 'Paid' },
    { Date: '2026-05-15', 'Invoice ID': 'INV-004', Client: 'Initech', Amount: '₱120,000', Status: 'Cancelled' },
    { Date: '2026-05-14', 'Invoice ID': 'INV-005', Client: 'Umbrella Corp', Amount: '₱300,000', Status: 'Paid' },
  ],
  procurement: [
    { Date: '2026-05-18', 'PO ID': 'PO-1001', Supplier: 'Office Depot', Item: 'Laptops', Amount: '₱250,000', Status: 'Approved' },
    { Date: '2026-05-17', 'PO ID': 'PO-1002', Supplier: 'Dell', Item: 'Monitors', Amount: '₱80,000', Status: 'Pending' },
    { Date: '2026-05-16', 'PO ID': 'PO-1003', Supplier: 'Furniture Inc', Item: 'Desks', Amount: '₱45,000', Status: 'Delivered' },
    { Date: '2026-05-15', 'PO ID': 'PO-1004', Supplier: 'Stationery Pro', Item: 'Paper', Amount: '₱5,000', Status: 'Approved' },
  ],
  inventory: [
    { 'Item Code': 'ITEM-001', 'Item Name': 'MacBook Pro 14"', Category: 'Electronics', 'Stock Level': '45 pcs', Status: 'In Stock' },
    { 'Item Code': 'ITEM-002', 'Item Name': 'Dell 24" Monitor', Category: 'Electronics', 'Stock Level': '12 pcs', Status: 'Low Stock' },
    { 'Item Code': 'ITEM-003', 'Item Name': 'Ergonomic Chair', Category: 'Furniture', 'Stock Level': '0 pcs', Status: 'Out of Stock' },
    { 'Item Code': 'ITEM-004', 'Item Name': 'A4 Paper Ream', Category: 'Supplies', 'Stock Level': '150 pcs', Status: 'In Stock' },
  ],
  travel: [
    { Date: '2026-05-18', 'Booking ID': 'BK-9001', Customer: 'John Doe', Destination: 'Boracay', Amount: '₱12,000', Status: 'Confirmed' },
    { Date: '2026-05-17', 'Booking ID': 'BK-9002', Customer: 'Jane Smith', Destination: 'Palawan', Amount: '₱18,000', Status: 'Pending' },
    { Date: '2026-05-16', 'Booking ID': 'BK-9003', Customer: 'Bob Johnson', Destination: 'Cebu', Amount: '₱8,500', Status: 'Confirmed' },
    { Date: '2026-05-15', 'Booking ID': 'BK-9004', Customer: 'Alice Brown', Destination: 'Siargao', Amount: '₱25,000', Status: 'Cancelled' },
  ],
};

const detailedCustomerData = [
  { 'Customer ID': 'CUST-001', Name: 'John Doe', Email: 'john.doe@example.com', 'Plan Type': 'Premium', Status: 'Active', 'Join Date': '2026-01-15' },
  { 'Customer ID': 'CUST-002', Name: 'Jane Smith', Email: 'jane.smith@example.com', 'Plan Type': 'Basic', Status: 'Active', 'Join Date': '2026-02-20' },
  { 'Customer ID': 'CUST-003', Name: 'Bob Johnson', Email: 'bob.j@example.com', 'Plan Type': 'Enterprise', Status: 'Inactive', 'Join Date': '2025-11-10' },
  { 'Customer ID': 'CUST-004', Name: 'Alice Brown', Email: 'alice.b@example.com', 'Plan Type': 'Premium', Status: 'Active', 'Join Date': '2026-03-05' },
  { 'Customer ID': 'CUST-005', Name: 'Charlie Green', Email: 'charlie.g@example.com', 'Plan Type': 'Basic', Status: 'Active', 'Join Date': '2026-04-12' },
];

const detailedEmployeeData = [
  { 'Employee ID': 'EMP-001', Name: 'Alice Smith', Department: 'HR', Position: 'Manager', Status: 'Active', 'Hire Date': '2024-05-10' },
  { 'Employee ID': 'EMP-002', Name: 'Bob Jones', Department: 'Accounting', Position: 'Accountant', Status: 'Active', 'Hire Date': '2025-01-15' },
  { 'Employee ID': 'EMP-003', Name: 'Charlie Brown', Department: 'IT', Position: 'Developer', Status: 'Active', 'Hire Date': '2025-06-01' },
  { 'Employee ID': 'EMP-004', Name: 'David Wilson', Department: 'Procurement', Position: 'Officer', Status: 'On Leave', 'Hire Date': '2024-11-20' },
  { 'Employee ID': 'EMP-005', Name: 'Eva Davis', Department: 'Travel', Position: 'Agent', Status: 'Active', 'Hire Date': '2026-02-15' },
];

const detailedRevenueData = [
  { Month: 'January', 'Gross Revenue': '₱1,050,000', Expenses: '₱600,000', 'Net Profit': '₱450,000', Status: 'Audited' },
  { Month: 'February', 'Gross Revenue': '₱1,280,000', Expenses: '₱700,000', 'Net Profit': '₱580,000', Status: 'Audited' },
  { Month: 'March', 'Gross Revenue': '₱1,520,000', Expenses: '₱800,000', 'Net Profit': '₱720,000', Status: 'Audited' },
  { Month: 'April', 'Gross Revenue': '₱1,850,000', Expenses: '₱900,000', 'Net Profit': '₱950,000', Status: 'Audited' },
  { Month: 'May', 'Gross Revenue': '₱2,210,000', Expenses: '₱1,000,000', 'Net Profit': '₱1,210,000', Status: 'Estimated' },
];

const detailedAgentData = [
  { 'Agent ID': 'AGT-001', Name: 'James Bond', Area: 'Manila', 'Total Bookings': 45, 'Success Rate': '95%', Status: 'Active' },
  { 'Agent ID': 'AGT-002', Name: 'Ethan Hunt', Area: 'Cebu', 'Total Bookings': 32, 'Success Rate': '90%', Status: 'Active' },
  { 'Agent ID': 'AGT-003', Name: 'Jason Bourne', Area: 'Davao', 'Total Bookings': 12, 'Success Rate': '85%', Status: 'Inactive' },
  { 'Agent ID': 'AGT-004', Name: 'Lara Croft', Area: 'Palawan', 'Total Bookings': 28, 'Success Rate': '98%', Status: 'Active' },
];

const mainChartData = {
  Day: [
    { name: '8 AM', revenue: 100000 },
    { name: '10 AM', revenue: 300000 },
    { name: '12 PM', revenue: 500000 },
    { name: '2 PM', revenue: 400000 },
    { name: '4 PM', revenue: 800000 },
    { name: '6 PM', revenue: 600000 },
  ],
  Week: [
    { name: 'Mon', revenue: 1200000 },
    { name: 'Tue', revenue: 1500000 },
    { name: 'Wed', revenue: 1100000 },
    { name: 'Thu', revenue: 1800000 },
    { name: 'Fri', revenue: 2100000 },
    { name: 'Sat', revenue: 2300000 },
    { name: 'Sun', revenue: 1900000 },
  ],
  Month: [
    { name: '1st', revenue: 1200000 },
    { name: '5th', revenue: 1500000 },
    { name: '10th', revenue: 1300000 },
    { name: '15th', revenue: 1800000 },
    { name: '20th', revenue: 2100000 },
    { name: '25th', revenue: 2300000 },
    { name: '30th', revenue: 2400000 },
  ],
  Year: [
    { name: 'January', revenue: 1050000 },
    { name: 'February', revenue: 1280000 },
    { name: 'March', revenue: 1520000 },
    { name: 'April', revenue: 1850000 },
    { name: 'May', revenue: 2210000 },
    { name: 'June', revenue: 2400000 },
    { name: 'July', revenue: 2100000 },
    { name: 'August', revenue: 2300000 },
    { name: 'September', revenue: 2500000 },
    { name: 'October', revenue: 2700000 },
    { name: 'November', revenue: 2900000 },
    { name: 'December', revenue: 3200000 },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<keyof typeof mainChartData>('Month');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const exportToPDF = (title: string, data: any[]) => {
    try {
      const doc = new jsPDF();

      // Add Logo
      try {
        doc.addImage('/JVDlogo-removebg-preview.png', 'PNG', 160, 10, 35, 35);
      } catch (e) {
        console.warn("Logo failed to load, skipping...", e);
      }

      // Header Section
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.setFont("helvetica", "bold");
      doc.text("JVD MANAGEMENT SYSTEM", 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text("INTERNAL ORGANIZATIONAL REPORT", 14, 32);

      // Company Address (Mock)
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("UNIT 6 -Aryanna Village Center Brgy 175. Susano Road Camarin, Caloocan City, Caloocan, Philippines", 14, 37);
      doc.text("Contact: +63 976 - 4711 - 294", 14, 41);
      doc.text("Tel: 02 - 82938068", 14, 45);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 47, 196, 47);

      // Report Title & Meta
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`Official Report: ${title}`, 14, 55);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated by: ${user?.first_name} ${user?.last_name || 'Authorized Personnel'}`, 14, 62);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, 67);
      doc.text(`Reference ID: JVD-REF-${Math.floor(100000 + Math.random() * 900000)}`, 14, 72);



      // Main Data Table
      autoTable(doc, {
        head: [Object.keys(data[0]).map(k => k.toUpperCase())],
        body: data.map(obj => 
          Object.values(obj).map(val => 
            typeof val === 'string' ? val.replace(/₱/g, 'PHP ') : val
          )
        ) as any,
        startY: 80,
        theme: 'grid',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 4
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 3,
          fillColor: false // Transparent to show watermark behind
        },
        alternateRowStyles: {
          fillColor: false // Transparent to show watermark behind
        },
        margin: { top: 80 }
      });

      // Signature Section
      let finalY = 240; // Default fallback position
      try {
        if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
          finalY = (doc as any).lastAutoTable.finalY + 20;
        }
      } catch (e) {
        console.warn("Could not determine table end, using default Y");
      }

      if (finalY < 270) {
        doc.setDrawColor(200);
        doc.line(14, finalY, 70, finalY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Authorized Signature", 14, finalY + 5);
        doc.text(`${user?.first_name} ${user?.last_name || "Manager Name"}`, 14, finalY + 10);
      }

      // Footer & Save
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" });
      }

      doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_report.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try Excel export instead.");
    }
  };

  const exportToExcel = async (title: string, data: any[]) => {
    alert("Starting Excel export...");
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('JVD Report');

      // 1. Setup Columns (Improved Auto-fit estimation)
      const columns = Object.keys(data[0] || {}).map(key => {
        const headerLen = key.length;
        const maxContentLen = Math.max(...data.map(row => String(row[key] || '').length), 0);
        return {
          header: key.toUpperCase(),
          key: key,
          width: Math.max(headerLen, maxContentLen, 12) + 8 // More generous padding
        };
      });

      if (columns[0]) columns[0].width = Math.max(columns[0].width, 35);
      worksheet.columns = columns;

      // 2. Add Professional Header Section (Rows 1-6)
      worksheet.insertRow(1, ['JVD INTERNAL MANAGEMENT SYSTEM']);
      worksheet.insertRow(2, [`OFFICIAL REPORT: ${title.toUpperCase()}`]);
      worksheet.insertRow(3, [`Generated by: ${user?.first_name} ${user?.last_name}`]);
      worksheet.insertRow(4, [`Date: ${new Date().toLocaleString()}`]);
      worksheet.insertRow(5, [`Reference: JVD-REF-${Math.floor(100000 + Math.random() * 900000)}`]);
      worksheet.insertRow(6, [`Status: AUTHORIZED INTERNAL USE ONLY`]);
      worksheet.insertRow(7, []); // Spacer

      // Style the Header Section
      for (let i = 1; i <= 6; i++) {
        const row = worksheet.getRow(i);
        row.getCell(1).font = { bold: true, size: i === 1 ? 16 : 10, color: { argb: i === 1 ? 'FF1E3A8A' : 'FF64748B' } };
      }

      // 3. Add the Data Table (Starts at row 8)
      worksheet.getRow(8).values = Object.keys(data[0] || {}).map(k => k.toUpperCase());

      data.forEach((item) => {
        const cleanedItem = { ...item };
        Object.keys(cleanedItem).forEach(key => {
          if (typeof cleanedItem[key] === 'string') {
            cleanedItem[key] = cleanedItem[key].replace(/₱/g, 'PHP ');
          }
        });
        worksheet.addRow(cleanedItem);
      });

      // 4. Style the Table Header (Row 8)
      const headerRow = worksheet.getRow(8);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' }
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 5. Style the Data Cells (Alignment Logic)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 8 && rowNumber <= 8 + data.length) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };

            // Center-align numbers, percentages, and currencies
            const val = String(cell.value || '');
            const isNumeric = !isNaN(Number(cell.value)) || val.includes('%') || val.includes('₱');

            cell.alignment = {
              vertical: 'middle',
              horizontal: isNumeric ? 'center' : 'left',
              indent: isNumeric ? 0 : 1 // Slight indent for text
            };

            if (rowNumber % 2 === 0) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
              };
            }
          });
        }
      });

      // 6. Add Signature Footer
      const footerStart = 8 + data.length + 3;
      worksheet.getRow(footerStart).values = ['--------------------------------------------------'];
      worksheet.getRow(footerStart + 1).values = ['Authorized Signature'];
      worksheet.getRow(footerStart + 2).values = [`${user?.first_name} ${user?.last_name}`];
      worksheet.getRow(footerStart + 3).values = ['JVD Events & Travel Management Co.'];

      for (let i = 0; i < 4; i++) {
        worksheet.getRow(footerStart + i).getCell(1).font = { size: 9, color: { argb: 'FF64748B' } };
      }

      // 7. Protection (Make headers non-editable)
      await worksheet.protect('jvd-secure', {
        selectLockedCells: true,
        selectUnlockedCells: true,
      });

      // 8. Generate and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_report.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel Generation Error:", error);
      alert("Failed to generate Excel report.");
    }
  };

  if (!user) return null;

  const DownloadActions = ({ title, data, variant = 'dark' }: { title: string; data: any[]; variant?: 'dark' | 'light' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div className="relative flex items-center" ref={dropdownRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className={`p-1.5 rounded-xl transition-all opacity-50 group-hover:opacity-100 ${
            variant === 'light'
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'hover:bg-slate-50 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <LuDownload className="w-3.5 h-3.5" />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 pt-2 z-[100]">
              <div className="w-32 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2">
                <button
                  onClick={(e) => { e.stopPropagation(); exportToPDF(title, data); setIsOpen(false); }}
                  className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-2 transition-colors"
                >
                  <LuFileText className="w-3.5 h-3.5" />
                  Export PDF
                </button>
                <button
                  onClick={async (e) => { e.stopPropagation(); await exportToExcel(title, data); setIsOpen(false); }}
                  className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2 transition-colors"
                >
                  <LuFileSpreadsheet className="w-3.5 h-3.5" />
                  Export Excel
                </button>
              </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-12 pt-4">
      {/* Top Row: Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 relative z-20">
        {/* Total Employees */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-300/40 dark:shadow-blue-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuUsers className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +12%
              </div>
              <DownloadActions variant="light" title="Global Personnel" data={detailedEmployeeData} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Employees</p>
            <p className="text-3xl font-black">234</p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-300/40 dark:shadow-emerald-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuDollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +8%
              </div>
              <DownloadActions variant="light" title="Revenue Metrics" data={detailedRevenueData} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Monthly Revenue</p>
            <p className="text-3xl font-black">₱2,300,000</p>
          </div>
        </div>

        {/* Active Agents */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-xl shadow-violet-300/40 dark:shadow-violet-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuActivity className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +5%
              </div>
              <DownloadActions variant="light" title="Agent Activity" data={detailedAgentData} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Active Agents</p>
            <p className="text-3xl font-black">89</p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl shadow-amber-300/40 dark:shadow-amber-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuGlobe className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +15%
              </div>
              <DownloadActions variant="light" title="Customer Base" data={detailedCustomerData} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Customers</p>
            <p className="text-3xl font-black">1,456</p>
          </div>
        </div>
      </div>

      {/* Main Chart + Fleet Calendar + Traffic Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 relative z-10">
      {/* System Performance */}
      <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 group">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">System Performance</h2>
              <DownloadActions title="System Performance Summary" data={mainChartData[activeFilter]} />
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Consolidated revenue in Millions (PHP)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-50 dark:bg-gray-800/50 p-1 rounded-xl border border-slate-100 dark:border-gray-700/50">
              {(['Day', 'Week', 'Month', 'Year'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={mainChartData[activeFilter]} key={activeFilter + theme} style={{ background: 'transparent' }}>
                <defs>
                  <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={theme === 'dark' ? 0.25 : 0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                  domain={[0, 'auto']}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000)}K`;
                    return value;
                  }}
                />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#1e293b'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#60a5fa' : '#3b82f6' }}
                  labelStyle={{ fontWeight: 800, color: theme === 'dark' ? '#ffffff' : '#1e293b' }}
                  formatter={(value: any) => [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMain)"
                  animationDuration={800}
                  dot={false}
                  activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Fleet Calendar – compact inline */}
      <CompactFleetCalendar theme={theme} />

      {/* User Distribution Donut */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Users</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Distribution by role</p>
          </div>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-lg uppercase tracking-tighter">234 total</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="h-[160px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart style={{ background: 'transparent' }}>
                  <Pie data={userDistributionData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value" animationDuration={800}>
                    {userDistributionData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 40px -8px rgb(0 0 0/0.15)', backgroundColor: theme === 'dark' ? '#111827' : '#fff', fontSize: '11px', fontWeight: 700 }} formatter={(v: any) => [`${v}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1">
            {userDistributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400">{item.value}% {item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>{/* end 4-col */}

      {/* Branch Specific Grid */}
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] px-2">Branch Performance Matrix</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Accounting Branch */}
        <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xl shadow-emerald-300/40 dark:shadow-emerald-900/40 hover:scale-[1.02] transition-all group cursor-pointer" onClick={() => navigate('/accounting/billing')}>
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
            <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuDollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Accounting</p>
                <p className="text-lg font-black">₱4,200,000</p>
              </div>
              <DownloadActions variant="light" title="Accounting Branch Report" data={detailedBranchData.accounting} />
            </div>
          </div>
          <div className="h-16 w-full opacity-70 relative z-10">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={branchData.accounting} barSize={7} style={{ background: 'transparent' }}>
                  <Bar dataKey="value" fill="white" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Procurement Branch */}
        <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-300/40 dark:shadow-blue-900/40 hover:scale-[1.02] transition-all group cursor-pointer" onClick={() => navigate('/procurement/purchase-orders')}>
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
            <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Procurement</p>
                <p className="text-lg font-black">142 POs</p>
              </div>
              <DownloadActions variant="light" title="Procurement Branch Report" data={detailedBranchData.procurement} />
            </div>
          </div>
          <div className="h-16 w-full opacity-70 relative z-10">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={branchData.procurement} style={{ background: 'transparent' }}>
                  <Area type="monotone" dataKey="value" stroke="white" fill="rgba(255,255,255,0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inventory Branch */}
        <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-xl shadow-violet-300/40 dark:shadow-violet-900/40 hover:scale-[1.02] transition-all group cursor-pointer" onClick={() => navigate('/inventory/supplies')}>
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
            <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuPackage className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Inventory</p>
                <p className="text-lg font-black">92% Stock</p>
              </div>
              <DownloadActions variant="light" title="Inventory Branch Report" data={detailedBranchData.inventory} />
            </div>
          </div>
          <div className="h-16 w-full opacity-70 relative z-10">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={branchData.inventory} style={{ background: 'transparent' }}>
                  <Line type="stepAfter" dataKey="value" stroke="white" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Travel Branch */}
        <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-pink-700 text-white shadow-xl shadow-rose-300/40 dark:shadow-rose-900/40 hover:scale-[1.02] transition-all group cursor-pointer" onClick={() => navigate('/travel/customers')}>
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden">
            <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuGlobe className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Travel</p>
                <p className="text-lg font-black">24 Bookings</p>
              </div>
              <DownloadActions variant="light" title="Travel Branch Report" data={detailedBranchData.travel} />
            </div>
          </div>
          <div className="h-16 w-full opacity-70 relative z-10">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={branchData.travel} style={{ background: 'transparent' }}>
                  <Area type="basis" dataKey="value" stroke="white" fill="rgba(255,255,255,0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>



      {/* Bottom: Recent Activity + Order Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8 group relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Recent Activity</h3>
              <DownloadActions
                title="Recent Operational Activity"
                data={[
                  { Action: 'Operation #1025', User: 'Admin', Status: 'Success', Timestamp: '2 hours ago' },
                  { Action: 'Operation #1026', User: 'HR', Status: 'Pending', Timestamp: '1 hour ago' },
                  { Action: 'Operation #1027', User: 'Accounting', Status: 'Success', Timestamp: '30 mins ago' },
                  { Action: 'Operation #1028', User: 'Agent', Status: 'Updated', Timestamp: 'Just now' },
                ]}
              />
            </div>
            <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline transition-all">View Full Log</button>
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 group/item">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 dark:text-gray-500 dark:text-gray-400 group-hover/item:bg-blue-50 dark:group-hover/item:bg-blue-900/30 group-hover/item:text-blue-600 transition-colors">
                  <LuCircle className="w-2.5 h-2.5 fill-current" />
                </div>
                <div className="flex-1 border-b border-gray-50 dark:border-gray-800 pb-4 group-last:border-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Operational Update #{1024 + i}</p>
                  <p className="text-xs text-gray-400 mt-0.5">System synchronized with branch node {i}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">2 hours ago</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie – Order Status */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Order Status</h3>
              <p className="text-xs text-gray-400 font-medium mt-1">Overview of the latest month</p>
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Live</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-[210px] flex-1">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart style={{ background: 'transparent' }}>
                    <Pie data={orderStatusData} cx="50%" cy="50%" outerRadius={88} paddingAngle={3} dataKey="value" animationBegin={100} animationDuration={800}>
                      {orderStatusData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 40px -8px rgb(0 0 0/0.15)', backgroundColor: theme === 'dark' ? '#111827' : '#fff', fontSize: '11px', fontWeight: 700 }} formatter={(v: any) => [`${v}%`, 'Orders']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {orderStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">{item.name}</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Schedule Calendar */}
      {/* removed – now inline as CompactFleetCalendar */}

    </div>
  );
}

// ── Fleet Schedule Data ───────────────────────────────────────────────────────
const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

const FLEET_SCHEDULES = [
  { id: 1, date: new Date(y, m, 1),  bus: 'BUS-001', plate: 'ABC 1234', route: 'Manila → Cebu',          driver: 'Juan dela Cruz',  depart: '06:00 AM', status: 'completed',    seats: 45 },
  { id: 2, date: new Date(y, m, 3),  bus: 'BUS-002', plate: 'DEF 5678', route: 'Manila → Davao',          driver: 'Maria Santos',    depart: '07:30 AM', status: 'completed',    seats: 55 },
  { id: 3, date: new Date(y, m, 5),  bus: 'BUS-003', plate: 'GHI 9012', route: 'Cebu → Iloilo',           driver: 'Pedro Reyes',     depart: '08:00 AM', status: 'in_service',   seats: 40 },
  { id: 4, date: new Date(y, m, today.getDate()), bus: 'BUS-004', plate: 'JKL 3456', route: 'Manila → Bohol',   driver: 'Ana Lim',         depart: '09:00 AM', status: 'in_service',   seats: 50 },
  { id: 5, date: new Date(y, m, today.getDate()), bus: 'BUS-001', plate: 'ABC 1234', route: 'Davao → Cagayan',  driver: 'Juan dela Cruz',  depart: '02:00 PM', status: 'scheduled',   seats: 45 },
  { id: 6, date: new Date(y, m, today.getDate()), bus: 'BUS-005', plate: 'MNO 7890', route: 'Manila → Palawan', driver: 'Rosa Garcia',     depart: '04:30 PM', status: 'scheduled',   seats: 60 },
  { id: 7, date: new Date(y, m, today.getDate() + 1), bus: 'BUS-002', plate: 'DEF 5678', route: 'Cebu → Bacolod', driver: 'Maria Santos', depart: '07:00 AM', status: 'scheduled', seats: 55 },
  { id: 8, date: new Date(y, m, today.getDate() + 2), bus: 'BUS-006', plate: 'PQR 1111', route: 'Manila → Ilocos', driver: 'Carlo Tan',    depart: '05:00 AM', status: 'scheduled',   seats: 45 },
  { id: 9, date: new Date(y, m, today.getDate() + 3), bus: 'BUS-003', plate: 'GHI 9012', route: 'Davao → Butuan', driver: 'Pedro Reyes',  depart: '08:30 AM', status: 'maintenance', seats: 40 },
  { id:10, date: new Date(y, m, today.getDate() + 5), bus: 'BUS-007', plate: 'STU 2222', route: 'Manila → Leyte',  driver: 'Liza Navarro',   depart: '06:45 AM', status: 'scheduled',   seats: 50 },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  completed:   { label: 'Completed',   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50',  darkBg: 'dark:bg-emerald-500/10' },
  in_service:  { label: 'In Service',  color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50',     darkBg: 'dark:bg-blue-500/10' },
  scheduled:   { label: 'Scheduled',   color: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50',   darkBg: 'dark:bg-violet-500/10' },
  maintenance: { label: 'Maintenance', color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50',    darkBg: 'dark:bg-amber-500/10' },
};

const DOT_COLOR: Record<string, string> = {
  completed:   'bg-emerald-400',
  in_service:  'bg-blue-400',
  scheduled:   'bg-violet-400',
  maintenance: 'bg-amber-400',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CompactFleetCalendar({ theme: _theme }: { theme: string }) {
  const [calDate, setCalDate]   = useState(new Date(y, m, 1));
  const [selected, setSelected] = useState<Date>(today);

  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();

  const cells = useMemo(() => {
    const arr: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(calYear, calMonth, d));
    return arr;
  }, [calYear, calMonth, daysInMonth, firstWeekday]);

  const selectedEvents = FLEET_SCHEDULES.filter(s => isSameDay(s.date, selected));
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_LABELS  = ['S','M','T','W','T','F','S'];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LuBus className="w-3.5 h-3.5 text-blue-500" />
          <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Fleet Schedule</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400">
            <LuChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[11px] font-black text-gray-700 dark:text-gray-200 w-20 text-center">{MONTH_NAMES[calMonth]} {calYear}</span>
          <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400">
            <LuChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-black text-gray-400 dark:text-gray-600 py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const events   = FLEET_SCHEDULES.filter(s => isSameDay(s.date, date));
          const isToday  = isSameDay(date, today);
          const isSel    = isSameDay(date, selected);
          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelected(date)}
              className={`relative flex flex-col items-center pt-1 pb-0.5 rounded-lg h-9 transition-all text-[10px] font-black ${
                isSel
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/30'
                  : isToday
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span className="leading-none">{date.getDate()}</span>
              {events.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {events.slice(0, 2).map((e, ei) => (
                    <span key={ei} className={`w-1 h-1 rounded-full ${isSel ? 'bg-white/70' : DOT_COLOR[e.status]}`} />
                  ))}
                  {events.length > 2 && <span className={`text-[7px] font-black ${isSel ? 'text-white/60' : 'text-gray-400'}`}>+</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dispatch list */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex-1">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
          {selected.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} — {selectedEvents.length} dispatch{selectedEvents.length !== 1 ? 'es' : ''}
        </p>
        {selectedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 gap-1.5">
            <LuBus className="w-5 h-5 text-gray-200 dark:text-gray-700" />
            <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">No dispatches</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[130px] overflow-y-auto pr-0.5">
            {selectedEvents.map(sched => {
              const meta = STATUS_META[sched.status];
              return (
                <div key={sched.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.darkBg}`}>
                    <LuBus className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-black text-gray-800 dark:text-white truncate">{sched.bus}</span>
                      <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.darkBg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400 truncate">
                        <LuMapPin className="w-2.5 h-2.5 shrink-0" />{sched.route}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
                        <LuClock className="w-2.5 h-2.5" />{sched.depart}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function FleetScheduleCalendar({ theme: _theme2 }: { theme: string }) {
  const [calDate, setCalDate]     = useState(new Date(y, m, 1));
  const [selected, setSelected]  = useState<Date>(today);

  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();

  const cells = useMemo(() => {
    const arr: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(calYear, calMonth, d));
    return arr;
  }, [calYear, calMonth, daysInMonth, firstWeekday]);

  const eventsOnDay = (date: Date | null) =>
    date ? FLEET_SCHEDULES.filter(s => isSameDay(s.date, date)) : [];

  const selectedEvents = FLEET_SCHEDULES.filter(s => isSameDay(s.date, selected));

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <LuBus className="w-4 h-4 text-blue-500" />
            Fleet Schedule
          </h3>
          <p className="text-xs text-gray-400 font-medium mt-1">Bus deployment calendar &amp; daily dispatch details</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          {Object.entries(STATUS_META).map(([k, v]) => (
            <span key={k} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${v.bg} ${v.darkBg} ${v.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[k]}`} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Calendar ── */}
        <div className="lg:col-span-2">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <LuChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-gray-800 dark:text-white">
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <button
              onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <LuChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const events    = eventsOnDay(date);
              const isToday   = isSameDay(date, today);
              const isSel     = isSameDay(date, selected);
              const hasEvents = events.length > 0;
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelected(date)}
                  className={`relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl transition-all h-11 ${
                    isSel
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200/60 dark:shadow-blue-900/40'
                      : isToday
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-[11px] font-black leading-none">{date.getDate()}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full px-0.5">
                      {events.slice(0, 3).map((e, ei) => (
                        <span
                          key={ei}
                          className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/70' : DOT_COLOR[e.status]}`}
                        />
                      ))}
                      {events.length > 3 && (
                        <span className={`text-[8px] font-black ${isSel ? 'text-white/70' : 'text-gray-400'}`}>+{events.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Monthly summary */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{FLEET_SCHEDULES.filter(s => s.date.getMonth() === calMonth).length}</p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-0.5">This Month</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-500/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{FLEET_SCHEDULES.filter(s => s.status === 'scheduled' && s.date.getMonth() === calMonth).length}</p>
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mt-0.5">Upcoming</p>
            </div>
          </div>
        </div>

        {/* ── Detail List ── */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest">
              {selected.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {selectedEvents.length} {selectedEvents.length === 1 ? 'dispatch' : 'dispatches'}
            </span>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <LuBus className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-400">No dispatches on this day</p>
              <p className="text-xs text-gray-300 dark:text-gray-600">Select a highlighted date to view schedules</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedEvents.map((sched) => {
                const meta = STATUS_META[sched.status];
                return (
                  <div
                    key={sched.id}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all group"
                  >
                    {/* Bus icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.darkBg}`}>
                      <LuBus className={`w-5 h-5 ${meta.color}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-gray-900 dark:text-white">{sched.bus}</span>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{sched.plate}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.darkBg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <LuMapPin className="w-3 h-3" />
                          {sched.route}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <LuUser className="w-3 h-3" />
                          {sched.driver}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <LuClock className="w-3 h-3" />
                          {sched.depart}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <LuUsers className="w-3 h-3" />
                          {sched.seats} seats
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
