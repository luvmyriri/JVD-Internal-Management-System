import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { userApi } from '../../api/users';
import { jobApplicationsApi } from '../../api/jobApplications';
import { internshipsApi } from '../../api/internships';
import { tripTicketApi } from '../../api/operations';
import { fleetApi } from '../../api/fleet';
import { dashboardApi } from '../../api/dashboards';
import {
  LuUsers,
  LuBanknote,
  LuGlobe,
  LuArrowUpRight,
  LuFileText,
  LuBus,
  LuDownload,
  LuFileSpreadsheet,
  LuChevronLeft,
  LuChevronRight,
  LuTrophy,
  LuTicket,
  LuTrendingUp,
  LuActivity,
  LuUser,
  LuBadgeCheck,
  LuClock,
  LuBriefcase
} from 'react-icons/lu';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { StatusBadge } from '../../components/ui';
import { formatDate } from '../../utils';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { loadLogoAsBase64 } from '../../utils/pdfHelpers';

const DEPARTMENTS = [
  'Administration',
  'Accounting',
  'Operations',
  'Maintenance',
  'Human Resources',
  'Logistics',
];

const DEPT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

// Donut â€“ user distribution
const userDistributionData = [
  { name: 'Drivers',      value: 34, color: '#3b82f6' },
  { name: 'Agents',       value: 24, color: '#8b5cf6' },
  { name: 'Accounting',   value: 16, color: '#10b981' },
  { name: 'Procurement',  value: 13, color: '#f59e0b' },
  { name: 'HR',           value:  8, color: '#ec4899' },
  { name: 'Admin',        value:  5, color: '#6366f1' },
];

const detailedBranchData = {
  accounting: [
    { Date: '2026-05-18', 'Invoice ID': 'INV-001', Client: 'Acme Corp', Amount: 'PHP 150,000', Status: 'Paid' },
    { Date: '2026-05-17', 'Invoice ID': 'INV-002', Client: 'Globex', Amount: 'PHP 200,000', Status: 'Pending' },
    { Date: '2026-05-16', 'Invoice ID': 'INV-003', Client: 'Soylent Corp', Amount: 'PHP 50,000', Status: 'Paid' },
    { Date: '2026-05-15', 'Invoice ID': 'INV-004', Client: 'Initech', Amount: 'PHP 120,000', Status: 'Cancelled' },
    { Date: '2026-05-14', 'Invoice ID': 'INV-005', Client: 'Umbrella Corp', Amount: 'PHP 300,000', Status: 'Paid' },
  ],
  procurement: [
    { Date: '2026-05-18', 'PO ID': 'PO-1001', Supplier: 'Office Depot', Item: 'Laptops', Amount: 'PHP 250,000', Status: 'Approved' },
    { Date: '2026-05-17', 'PO ID': 'PO-1002', Supplier: 'Dell', Item: 'Monitors', Amount: 'PHP 80,000', Status: 'Pending' },
    { Date: '2026-05-16', 'PO ID': 'PO-1003', Supplier: 'Furniture Inc', Item: 'Desks', Amount: 'PHP 45,000', Status: 'Delivered' },
    { Date: '2026-05-15', 'PO ID': 'PO-1004', Supplier: 'Stationery Pro', Item: 'Paper', Amount: 'PHP 5,000', Status: 'Approved' },
  ],
  inventory: [
    { 'Item Code': 'ITEM-001', 'Item Name': 'MacBook Pro 14"', Category: 'Electronics', 'Stock Level': '45 pcs', Status: 'In Stock' },
    { 'Item Code': 'ITEM-002', 'Item Name': 'Dell 24" Monitor', Category: 'Electronics', 'Stock Level': '12 pcs', Status: 'Low Stock' },
    { 'Item Code': 'ITEM-003', 'Item Name': 'Ergonomic Chair', Category: 'Furniture', 'Stock Level': '0 pcs', Status: 'Out of Stock' },
    { 'Item Code': 'ITEM-004', 'Item Name': 'A4 Paper Ream', Category: 'Supplies', 'Stock Level': '150 pcs', Status: 'In Stock' },
  ],
  travel: [
    { Date: '2026-05-18', 'Booking ID': 'BK-9001', Customer: 'John Doe', Destination: 'Boracay', Amount: 'PHP 12,000', Status: 'Confirmed' },
    { Date: '2026-05-17', 'Booking ID': 'BK-9002', Customer: 'Jane Smith', Destination: 'Palawan', Amount: 'PHP 18,000', Status: 'Pending' },
    { Date: '2026-05-16', 'Booking ID': 'BK-9003', Customer: 'Bob Johnson', Destination: 'Cebu', Amount: 'PHP 8,500', Status: 'Confirmed' },
    { Date: '2026-05-15', 'Booking ID': 'BK-9004', Customer: 'Alice Brown', Destination: 'Siargao', Amount: 'PHP 25,000', Status: 'Cancelled' },
    { Date: '2026-05-14', 'Booking ID': 'BK-9005', Customer: 'Charlie Green', Destination: 'Bohol', Amount: 'PHP 14,500', Status: 'Confirmed' },
    { Date: '2026-05-13', 'Booking ID': 'BK-9006', Customer: 'David Wilson', Destination: 'Iloilo', Amount: 'PHP 9,200', Status: 'Confirmed' },
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
  { Month: 'January', 'Gross Revenue': 'PHP 1,050,000', Expenses: 'PHP 600,000', 'Net Profit': 'PHP 450,000', Status: 'Audited' },
  { Month: 'February', 'Gross Revenue': 'PHP 1,280,000', Expenses: 'PHP 700,000', 'Net Profit': 'PHP 580,000', Status: 'Audited' },
  { Month: 'March', 'Gross Revenue': 'PHP 1,520,000', Expenses: 'PHP 800,000', 'Net Profit': 'PHP 720,000', Status: 'Audited' },
  { Month: 'April', 'Gross Revenue': 'PHP 1,850,000', Expenses: 'PHP 900,000', 'Net Profit': 'PHP 950,000', Status: 'Audited' },
  { Month: 'May', 'Gross Revenue': 'PHP 2,210,000', Expenses: 'PHP 1,000,000', 'Net Profit': 'PHP 1,210,000', Status: 'Estimated' },
];




const topAgents = [
  {
    rank: 1,
    name: 'Lara Croft',
    sales: 'PHP 1,250,000',
    bookings: 145,
    rating: 4.9,
    image: 'https://ui-avatars.com/api/?name=Lara+Croft&background=f43f5e&color=fff'
  },
  {
    rank: 2,
    name: 'Maria Santos',
    sales: 'PHP 980,000',
    bookings: 120,
    rating: 4.8,
    image: 'https://ui-avatars.com/api/?name=Maria+Santos&background=8b5cf6&color=fff'
  },
  {
    rank: 3,
    name: 'Rosa Garcia',
    sales: 'PHP 850,000',
    bookings: 112,
    rating: 4.7,
    image: 'https://ui-avatars.com/api/?name=Rosa+Garcia&background=10b981&color=fff'
  }
];

const topDrivers = [
  {
    rank: 1,
    name: 'Juan dela Cruz',
    trips: 42,
    hours: 180,
    rating: 4.8,
    image: 'https://ui-avatars.com/api/?name=Juan+dela+Cruz&background=3b82f6&color=fff'
  },
  {
    rank: 2,
    name: 'Emmanuel Nalang',
    trips: 39,
    hours: 165,
    rating: 4.8,
    image: 'https://ui-avatars.com/api/?name=Emmanuel+Nalang&background=f59e0b&color=fff'
  },
  {
    rank: 3,
    name: 'Pedro Reyes',
    trips: 35,
    hours: 150,
    rating: 4.6,
    image: 'https://ui-avatars.com/api/?name=Pedro+Reyes&background=6366f1&color=fff'
  }
];

const heatmapGridData = [
  [15, 20, 25, 45, 60, 65, 75, 85, 95, 90, 80, 45], // Mon
  [20, 15, 20, 35, 55, 68, 72, 88, 98, 92, 85, 50], // Tue
  [18, 12, 15, 30, 50, 60, 70, 80, 95, 90, 78, 40], // Wed
  [15, 10, 18, 32, 48, 62, 75, 82, 92, 88, 75, 35], // Thu
  [22, 18, 25, 40, 65, 75, 85, 95, 100, 96, 88, 60], // Fri
  [30, 25, 22, 35, 50, 65, 80, 90, 98, 95, 90, 70], // Sat
  [25, 20, 15, 25, 40, 55, 68, 78, 88, 85, 80, 65], // Sun
];

// @ts-expect-error kept for future heatmap feature
const _getHeatmapColor = (value: number, theme: string) => {
  if (theme === 'dark') {
    if (value <= 20) return 'bg-purple-950/20 border border-purple-900/10';
    if (value <= 40) return 'bg-purple-900/40 border border-purple-800/20';
    if (value <= 60) return 'bg-purple-800/60 border border-purple-700/30';
    if (value <= 80) return 'bg-violet-600/80 border border-violet-500/40 shadow-sm';
    return 'bg-fuchsia-500 border border-fuchsia-400 shadow-md shadow-fuchsia-500/20';
  } else {
    if (value <= 20) return 'bg-purple-50 border border-purple-100/50';
    if (value <= 40) return 'bg-purple-100 border border-purple-200/50';
    if (value <= 60) return 'bg-purple-200 border border-purple-300/50';
    if (value <= 80) return 'bg-violet-400 border border-violet-400/50 shadow-sm';
    return 'bg-fuchsia-600 border border-fuchsia-500 shadow-md shadow-fuchsia-600/20';
  }
};

const monthlyChartData = [
  { month: 'Jan', bookings: 95,  revenue: 1280, utilization: 72 },
  { month: 'Feb', bookings: 108, revenue: 1520, utilization: 75 },
  { month: 'Mar', bookings: 134, revenue: 1850, utilization: 82 },
  { month: 'Apr', bookings: 119, revenue: 2100, utilization: 78 },
  { month: 'May', bookings: 156, revenue: 2300, utilization: 91 },
  { month: 'Jun', bookings: 162, revenue: 2480, utilization: 94 },
  { month: 'Jul', bookings: 170, revenue: 2650, utilization: 96 },
  { month: 'Aug', bookings: 158, revenue: 2520, utilization: 89 },
  { month: 'Sep', bookings: 143, revenue: 2210, utilization: 84 },
  { month: 'Oct', bookings: 128, revenue: 1980, utilization: 79 },
  { month: 'Nov', bookings: 112, revenue: 1740, utilization: 76 },
  { month: 'Dec', bookings: 98,  revenue: 1350, utilization: 70 },
];




export default function HRDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [chartTab, setChartTab] = useState<'revenue' | 'utilization'>('revenue');

  // Load real employees from backend
  const { data: usersResponse } = useQuery({
    queryKey: ['users-list-hr-dashboard'],
    queryFn: () => userApi.list({ per_page: 1000 }).then(res => res.data),
    placeholderData: keepPreviousData,
  });

  // Load real job applications from backend
  const { data: applicationsResponse } = useQuery({
    queryKey: ['job-applications-list-hr-dashboard'],
    queryFn: jobApplicationsApi.getAll,
    placeholderData: keepPreviousData,
  });

  // Load real internships from backend
  const { data: internshipsResponse } = useQuery({
    queryKey: ['internships-list-hr-dashboard'],
    queryFn: internshipsApi.getAll,
    placeholderData: keepPreviousData,
  });

  const { data: ticketsRaw } = useQuery({
    queryKey: ['trip-tickets-hr'],
    queryFn: tripTicketApi.getAll,
    staleTime: 1000 * 60 * 2,
  });

  const { data: busesRaw } = useQuery({
    queryKey: ['buses-hr'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const tickets = (ticketsRaw as any[]) ?? [];
  const buses   = (busesRaw as any)?.data ?? [];

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: dashboardApi.getHr,
    staleTime: 1000 * 60 * 2,
  });

  // @ts-expect-error kept for future heatmap feature
  const _heatmap = dashboardData?.peak_client_activity && dashboardData.peak_client_activity.length > 0 ? dashboardData.peak_client_activity : heatmapGridData;
  const recentBookings = dashboardData?.recent_bookings && dashboardData.recent_bookings.length > 0 ? dashboardData.recent_bookings : detailedBranchData.travel;
  const agents = dashboardData?.top_agents && dashboardData.top_agents.length > 0 ? dashboardData.top_agents : topAgents;
  const drivers = dashboardData?.top_drivers && dashboardData.top_drivers.length > 0 ? dashboardData.top_drivers : topDrivers;
  const monthlyData = dashboardData?.monthly_chart && dashboardData.monthly_chart.length > 0 ? dashboardData.monthly_chart : monthlyChartData;

  const totalEmployeesCount = usersResponse?.data?.length ?? 0;
  const inactiveEmployeesCount = usersResponse?.data?.filter((u: any) => !u.is_active).length ?? 0;
  const openApplicationsCount = applicationsResponse?.data?.filter((a: any) => a.status === 'pending' || a.status === 'interviewing').length ?? 0;
  const activeInternsCount = internshipsResponse?.data?.filter((i: any) => i.status === 'active').length ?? 0;

  const applications = Array.isArray(applicationsResponse) ? applicationsResponse : (applicationsResponse?.data || []);
  const internships = Array.isArray(internshipsResponse) ? internshipsResponse : (internshipsResponse?.data || []);

  const recentApplications = useMemo(() => applications.slice(0, 6), [applications]);
  const recentInterns = useMemo(() => internships.slice(0, 6), [internships]);

  const employeeDistribution = useMemo(() => {
    if (!usersResponse?.data) return [];
    return DEPARTMENTS.map((dept, idx) => ({
      name: dept,
      value: usersResponse.data.filter((u: any) => u.department === dept).length,
      fill: DEPT_COLORS[idx]
    })).filter((d: any) => d.value > 0);
  }, [usersResponse]);

  const availableBusesToday = useMemo(() => {
    const todayDate = new Date();
    const currentY = todayDate.getFullYear();
    const currentM = todayDate.getMonth();
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const fallbackEvents = [
      { id: 1,  date: new Date(currentY, currentM, 1), busIndex: 0, route: 'Manila - Cebu',    driver: 'Juan dela Cruz', depart: '06:00 AM', status: 'completed',    seats: 45 },
      { id: 2,  date: new Date(currentY, currentM, 3), busIndex: 1, route: 'Manila - Davao',   driver: 'Maria Santos',   depart: '07:30 AM', status: 'completed',    seats: 55 },
      { id: 3,  date: new Date(currentY, currentM, 5), busIndex: 2, route: 'Cebu - Iloilo',    driver: 'Pedro Reyes',    depart: '08:00 AM', status: 'in_service',   seats: 40 },
      { id: 4,  date: new Date(currentY, currentM, todayDate.getDate()), busIndex: 3, route: 'Manila - Bohol',   driver: 'Ana Lim',      depart: '09:00 AM', status: 'in_service',   seats: 50 },
      { id: 5,  date: new Date(currentY, currentM, todayDate.getDate()), busIndex: 0, route: 'Davao - Cagayan', driver: 'Juan dela Cruz', depart: '02:00 PM', status: 'scheduled',    seats: 45 },
      { id: 6,  date: new Date(currentY, currentM, todayDate.getDate()), busIndex: 4, route: 'Manila - Palawan',driver: 'Rosa Garcia',    depart: '04:30 PM', status: 'scheduled',    seats: 60 },
      { id: 7,  date: new Date(currentY, currentM, todayDate.getDate() + 1), busIndex: 1, route: 'Cebu - Bacolod',  driver: 'Maria Santos',   depart: '07:00 AM', status: 'scheduled',    seats: 55 },
      { id: 8,  date: new Date(currentY, currentM, todayDate.getDate() + 2), busIndex: 5, route: 'Manila - Ilocos', driver: 'Carlo Tan',      depart: '05:00 AM', status: 'scheduled',    seats: 45 },
      { id: 9,  date: new Date(currentY, currentM, todayDate.getDate() + 3), busIndex: 2, route: 'Davao -> Butuan', driver: 'Pedro Reyes',  depart: '08:30 AM', status: 'maintenance', seats: 40 },
      { id: 10, date: new Date(currentY, currentM, todayDate.getDate() + 5), busIndex: 6, route: 'Manila -> Leyte',  driver: 'Liza Navarro',   depart: '06:45 AM', status: 'scheduled',   seats: 50 },
    ];

    const fleetSchedules = !tickets || tickets.length === 0
      ? (buses && buses.length > 0
          ? fallbackEvents.map(event => {
              const actualBus = buses[event.busIndex % buses.length];
              return {
                id: event.id,
                date: event.date,
                bus: actualBus.plate_number,
                busModel: actualBus.model,
                plate: actualBus.plate_number,
                route: event.route,
                driver: event.driver,
                depart: event.depart,
                status: event.status,
                seats: actualBus.seating_capacity || event.seats
              };
            })
          : fallbackEvents.map(event => ({
              id: event.id,
              date: event.date,
              bus: `BUS-00${event.busIndex + 1}`,
              busModel: 'Luxury Coach',
              plate: `XYZ-00${event.busIndex + 1}`,
              route: event.route,
              driver: event.driver,
              depart: event.depart,
              status: event.status,
              seats: event.seats
            })))
      : tickets.map((t: any) => ({
          id: t.id,
          date: t.date_of_travel ? new Date(t.date_of_travel) : new Date(),
          bus: t.bus?.plate_number || t.plate_no || 'N/A',
          busModel: t.bus?.model || '',
          plate: t.bus?.plate_number || t.plate_no || 'N/A',
          route: `${t.pick_up || 'N/A'} - ${t.drop_off || 'N/A'}`,
          driver: t.driver ? `${t.driver.first_name || ''} ${t.driver.last_name || ''}`.trim() : (t.driver?.name || 'N/A'),
          depart: '09:00 AM',
          status: t.status === 'completed' ? 'completed' : t.status === 'approved' ? 'in_service' : 'scheduled',
          seats: t.no_of_passengers || 45,
        }));

    const todayEvents = fleetSchedules.filter(s => isSameDay(s.date, todayDate));
    const occupiedToday = Array.from(new Set(todayEvents.map(d => d.bus)));

    if (!buses || buses.length === 0) {
      const allBusesPlaceholder = [
        { id: 1, plate_number: 'XYZ-001', model: 'BUS-001', seating_capacity: 45 },
        { id: 2, plate_number: 'XYZ-002', model: 'BUS-002', seating_capacity: 55 },
        { id: 3, plate_number: 'XYZ-003', model: 'BUS-003', seating_capacity: 40 },
        { id: 4, plate_number: 'XYZ-004', model: 'BUS-004', seating_capacity: 50 },
        { id: 5, plate_number: 'XYZ-005', model: 'BUS-005', seating_capacity: 60 },
        { id: 6, plate_number: 'XYZ-006', model: 'BUS-006', seating_capacity: 45 },
        { id: 7, plate_number: 'XYZ-007', model: 'BUS-007', seating_capacity: 50 },
      ];
      return allBusesPlaceholder.filter((b: any) => !occupiedToday.includes(b.model));
    }
    return buses.filter((b: any) => !occupiedToday.includes(b.plate_number));
  }, [tickets, buses]);

  const getApplicationStatusVariant = (status: string): any => {
    const map: Record<string, string> = {
      pending: 'warning', reviewed: 'info', interviewing: 'info', hired: 'success', rejected: 'danger'
    };
    return map[status] || 'neutral';
  };

  const getInternStatusVariant = (status: string): any => {
    const map: Record<string, string> = {
      pending: 'warning', active: 'success', completed: 'info', terminated: 'danger'
    };
    return map[status] || 'neutral';
  };


  const exportToPDF = async (title: string, data: any[]) => {
    try {
      const doc = new jsPDF();

      // Add Logo (loaded as base64 to work in all environments including production)
      const logoBase64 = await loadLogoAsBase64('/JVDlogo-removebg-preview.png');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 160, 10, 35, 35);
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
            typeof val === 'string' ? val.replace(/PHP /g, 'PHP ').replace(/₱/g, 'PHP ') : val
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
      worksheet.spliceRows(1, 0,
        ['JVD INTERNAL MANAGEMENT SYSTEM'],
        [`OFFICIAL REPORT: ${title.toUpperCase()}`],
        [`Generated by: ${user?.first_name} ${user?.last_name}`],
        [`Date: ${new Date().toLocaleString()}`],
        [`Reference: JVD-REF-${Math.floor(100000 + Math.random() * 900000)}`],
        [`Status: AUTHORIZED INTERNAL USE ONLY`],
        []
      );

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
            cleanedItem[key] = cleanedItem[key].replace(/PHP /g, 'PHP ').replace(/₱/g, 'PHP ');
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
            const isNumeric = !isNaN(Number(cell.value)) || val.includes('%') || val.includes('PHP ');

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
                  onClick={async (e) => { e.stopPropagation(); await exportToPDF(title, data); setIsOpen(false); }}
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
    <div className="flex flex-col gap-2 pb-4 lg:h-[calc(100vh-9.5rem)] lg:overflow-y-auto custom-scrollbar">

      {/* ── Top KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-20 shrink-0">

        {/* KPI 1: Total Employees */}
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30 flex items-center gap-3.5 group hover:scale-[1.01] transition-all cursor-default h-[72px]">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <LuUsers className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 truncate">Total Employees</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black leading-none">{totalEmployeesCount}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black bg-white/25 text-white flex items-center gap-0.5">
                <LuArrowUpRight className="w-2 h-2" />
                +12%
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center">
            <DownloadActions variant="light" title="Global Personnel" data={detailedEmployeeData} />
          </div>
        </div>

        {/* KPI 2: Inactive Staff */}
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30 flex items-center gap-3.5 group hover:scale-[1.01] transition-all cursor-default h-[72px]">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <LuUsers className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 truncate">Inactive Staff</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black leading-none">{inactiveEmployeesCount}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center">
            <DownloadActions variant="light" title="User Roles" data={userDistributionData} />
          </div>
        </div>

        {/* KPI 3: Open Applications */}
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-900/30 flex items-center gap-3.5 group hover:scale-[1.01] transition-all cursor-default h-[72px]">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <LuGlobe className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 truncate">Open Applications</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black leading-none">{openApplicationsCount}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black bg-white/25 text-white flex items-center gap-0.5">
                <LuArrowUpRight className="w-2 h-2" />
                +15%
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center">
            <DownloadActions variant="light" title="Customer Base" data={detailedCustomerData} />
          </div>
        </div>

        {/* KPI 4: Interns Active */}
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex items-center gap-3.5 group hover:scale-[1.01] transition-all cursor-default h-[72px]">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <LuBanknote className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 truncate">Interns Active</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black leading-none">{activeInternsCount}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <select className="bg-white/20 text-white text-[8px] font-black border-none rounded-lg px-1.5 py-0.5 outline-none cursor-pointer hover:bg-white/30 transition-colors uppercase tracking-wider">
              <option value="monthly" className="text-gray-800">Monthly</option>
              <option value="weekly" className="text-gray-800">Weekly</option>
              <option value="yearly" className="text-gray-800">Yearly</option>
            </select>
            <DownloadActions variant="light" title="Revenue Metrics" data={detailedRevenueData} />
          </div>
        </div>
      </div>

      {/* ── 3-Column Analytics Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 min-h-0 flex-1 relative z-10">

        {/* Column 1: Fleet Calendar */}
        <div className="h-full min-h-[500px] min-w-0">
          <CalendarFleetAvailability tickets={tickets} buses={buses} />
        </div>

        {/* Column 2: Heatmap + Travel Bookings */}
        <div className="flex flex-col gap-2 h-full min-h-0 min-w-0">

          {/* Employee Distribution */}
          <div className="flex-[4] min-h-[250px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-2.5 flex flex-col">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                  <LuActivity className="w-3 h-3 text-blue-500" />
                  Employee Distribution
                </h3>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">By Department</p>
              </div>
              <DownloadActions variant="dark" title="Employee Distribution" data={employeeDistribution.map((d: any) => ({ Department: d.name, Count: d.value }))} />
            </div>
            <div className="flex-1 w-full mt-2 relative min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {employeeDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                      border: '1px solid',
                      borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#f3f4f6' : '#111827' }}
                    formatter={(value: any, name: any) => [value, name]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Travel Bookings List */}
          <div className="flex-[6] min-h-[250px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-2.5 flex flex-col">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800 shrink-0">
              <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <LuTicket className="w-3 h-3 text-violet-500" />
                Travel Bookings
              </h3>
              <DownloadActions variant="dark" title="Travel Bookings Weekly" data={recentBookings} />
            </div>

            <div className="space-y-1 overflow-y-auto flex-1 mt-3.5 pr-0.5">
              {recentBookings.slice(0, 6).map((item, idx) => (
                <div key={item['Booking ID']} className="flex items-center gap-2 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl p-1.5 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[9px] font-black shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] font-black text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded">
                        {item['Booking ID']}
                      </span>
                      <span className="text-[7px] text-gray-400 font-bold">{item.Date}</span>
                    </div>
                    <h4 className="text-[9.5px] font-black text-gray-900 dark:text-white mt-0.5 truncate">
                      {item.Customer} {'->'} <span className="text-violet-600 dark:text-violet-400">{item.Destination}</span>
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9.5px] font-black text-gray-900 dark:text-white">{item.Amount}</p>
                    <span className={`text-[6.5px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                      item.Status === 'Confirmed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      item.Status === 'Pending'   ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.Status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Performers + Charts */}
        <div className="flex flex-col gap-2 h-full min-h-0 min-w-0">

          {/* Top Performers */}
          <div className="flex-[4.5] min-h-[250px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-2.5 flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-gray-50 dark:border-gray-800 shrink-0">
              <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <LuTrophy className="w-3 h-3 text-amber-500" />
                Top Performers
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 mt-3.5 pr-0.5">
              {/* Agents */}
              <div>
                <h4 className="text-[8px] font-black text-rose-500 uppercase tracking-wider mb-1">Top Agents</h4>
                <div className="space-y-0.5">
                  {agents.map((agent) => (
                    <div key={agent.rank} className="flex items-center gap-1.5 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl p-1 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                        agent.rank === 1 ? 'bg-amber-400 text-white shadow-sm' :
                        agent.rank === 2 ? 'bg-slate-300 text-gray-800' :
                        'bg-amber-600/80 text-white'
                      }`}>
                        {agent.rank}
                      </div>
                      <img src={agent.image} alt={agent.name} className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[9px] font-black text-gray-950 dark:text-white truncate">{agent.name}</h4>
                        <p className="text-[7px] text-gray-400 font-medium">{agent.bookings} Bk â€¢ {agent.rating}â˜…</p>
                      </div>
                      <p className="text-[8.5px] font-black text-rose-600 dark:text-rose-400 shrink-0 pr-0.5">{agent.sales}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drivers */}
              <div className="pt-1 border-t border-gray-50 dark:border-gray-800/50">
                <h4 className="text-[8px] font-black text-blue-500 uppercase tracking-wider mb-1">Top Coach Drivers</h4>
                <div className="space-y-0.5">
                  {drivers.map((driver) => (
                    <div key={driver.rank} className="flex items-center gap-1.5 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl p-1 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                        driver.rank === 1 ? 'bg-amber-400 text-white shadow-sm' :
                        driver.rank === 2 ? 'bg-slate-300 text-gray-800' :
                        'bg-amber-600/80 text-white'
                      }`}>
                        {driver.rank}
                      </div>
                      <img src={driver.image} alt={driver.name} className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[9px] font-black text-gray-950 dark:text-white truncate">{driver.name}</h4>
                        <p className="text-[7px] text-gray-400 font-medium">{driver.trips} Trips â€¢ {driver.rating}â˜…</p>
                      </div>
                      <p className="text-[8.5px] font-black text-blue-600 dark:text-blue-400 shrink-0 pr-0.5">{driver.hours}h</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Operations & Performance tabbed widget */}
          <div className="flex-[5.5] min-h-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-2.5 flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-gray-50 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setChartTab('revenue')}
                  className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 pb-1 -mb-1.5 border-b-2 transition-all ${
                    chartTab === 'revenue'
                      ? 'border-blue-500 text-blue-600 dark:text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <LuTrendingUp className="w-3 h-3 text-blue-500" />
                  Revenue vs Bookings
                </button>
                <button
                  onClick={() => setChartTab('utilization')}
                  className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 pb-1 -mb-1.5 border-b-2 transition-all ${
                    chartTab === 'utilization'
                      ? 'border-purple-500 text-purple-600 dark:text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <LuActivity className="w-3 h-3 text-purple-500" />
                  Fleet Utilization
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {chartTab === 'revenue' ? (
                  <>
                    <span className="text-[7px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-full">Bookings</span>
                    <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Revenue (K)</span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-black text-purple-600 dark:text-purple-400">Full Year <span className="text-gray-400 font-bold text-[7px]">2025</span></span>
                    <DownloadActions
                      variant="dark"
                      title="Fleet Utilization 2025"
                      data={monthlyData.map(d => ({
                        Month: d.month,
                        'Utilization (%)': d.utilization,
                        'Bookings': d.bookings,
                        'Revenue (PHP K)': d.revenue,
                      }))}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 'revenue' ? (
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 6, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#f1f5f9'} />
                    <XAxis dataKey="month" tick={{ fontSize: 8, fontWeight: 700, fill: theme === 'dark' ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 7.5, fontWeight: 700, fill: theme === 'dark' ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#111827' : '#fff',
                        border: '1px solid',
                        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700
                      }}
                      labelStyle={{ color: theme === 'dark' ? '#f9fafb' : '#111827', fontWeight: 900 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
                    <Area type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} fill="url(#bkGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyData} margin={{ top: 2, right: 4, left: -28, bottom: 0 }} barSize={9}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 8, fontWeight: 700, fill: theme === 'dark' ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 7.5, fontWeight: 700, fill: theme === 'dark' ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [`${v}%`, 'Utilization']}
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#111827' : '#fff',
                        border: '1px solid',
                        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700
                      }}
                    />
                    <Bar dataKey="utilization" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* ── HR Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 min-h-[400px] flex-1 relative z-10 mt-2">

        {/* Column 1: Available Buses Today */}
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50 dark:border-gray-800 shrink-0">
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <LuBus className="w-3.5 h-3.5 text-emerald-500" />
                Available Buses Today
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ready for dispatch</p>
            </div>
            <DownloadActions 
              variant="dark" 
              title="Available Buses Today" 
              data={availableBusesToday.map((b: any) => ({ 
                'Plate Number': b.plate_number, 
                'Model': b.model, 
                'Capacity': b.seating_capacity || 49 
              }))} 
            />
          </div>
          <div className="space-y-2 overflow-y-auto mt-3 pr-1 flex-1">
            {availableBusesToday.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-4">No available buses today.</p>
            ) : (
              availableBusesToday.map((bus: any) => (
                <div key={bus.id || bus.plate_number} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <LuBus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                        {bus.model || 'Luxury Coach'}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold truncate">
                        Plate: {bus.plate_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {bus.seating_capacity || 49} Seats
                    </span>
                    <span className="text-[8px] text-gray-400 font-bold flex items-center gap-1">
                      <LuClock className="w-2.5 h-2.5" />
                      Today
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Recent Job Applications */}
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50 dark:border-gray-800 shrink-0">
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <LuBriefcase className="w-3.5 h-3.5 text-violet-500" />
                Recent Applications
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Latest candidates</p>
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto mt-3 pr-1 flex-1">
            {recentApplications.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-4">No recent applications.</p>
            ) : (
              recentApplications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <LuUser className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                        {app.first_name} {app.last_name}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold truncate">
                        {app.position_applied}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <StatusBadge status={app.status} variant={getApplicationStatusVariant(app.status)} />
                    <span className="text-[8px] text-gray-400 font-bold flex items-center gap-1">
                      <LuClock className="w-2.5 h-2.5" />
                      {formatDate(app.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Recent Internships */}
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 min-h-[350px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50 dark:border-gray-800 shrink-0">
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                <LuBadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                Recent Internships
              </h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Latest interns</p>
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto mt-3 pr-1 flex-1">
            {recentInterns.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-4">No recent interns.</p>
            ) : (
              recentInterns.map((intern: any) => (
                <div key={intern.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <LuGlobe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                        {intern.first_name} {intern.last_name}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold truncate">
                        {intern.department} / {intern.school}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <StatusBadge status={intern.status} variant={getInternStatusVariant(intern.status)} />
                    <span className="text-[8px] text-gray-400 font-bold flex items-center gap-1">
                      <LuClock className="w-2.5 h-2.5" />
                      {formatDate(intern.start_date)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// ── Fleet Schedule Data ───────────────────────────────────────────────────────
const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarFleetAvailability({ tickets = [], buses = [] }: { tickets?: any[]; buses?: any[] }) {
  const [calDate, setCalDate] = useState(new Date(y, m, 1));
  const [selected, setSelected] = useState<Date>(today);

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();

  const cells = useMemo(() => {
    const arr: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(calYear, calMonth, d));
    return arr;
  }, [calYear, calMonth, daysInMonth, firstWeekday]);

  // Build live schedules from trip tickets, fallback to static mock mapped to actual buses if available
  const fleetSchedules = useMemo(() => {
    const fallbackEvents = [
      { id: 1,  date: new Date(y, m, 1), busIndex: 0, route: 'Manila - Cebu',    driver: 'Juan dela Cruz', depart: '06:00 AM', status: 'completed',    seats: 45 },
      { id: 2,  date: new Date(y, m, 3), busIndex: 1, route: 'Manila - Davao',   driver: 'Maria Santos',   depart: '07:30 AM', status: 'completed',    seats: 55 },
      { id: 3,  date: new Date(y, m, 5), busIndex: 2, route: 'Cebu - Iloilo',    driver: 'Pedro Reyes',    depart: '08:00 AM', status: 'in_service',   seats: 40 },
      { id: 4,  date: new Date(y, m, today.getDate()), busIndex: 3, route: 'Manila - Bohol',   driver: 'Ana Lim',      depart: '09:00 AM', status: 'in_service',   seats: 50 },
      { id: 5,  date: new Date(y, m, today.getDate()), busIndex: 0, route: 'Davao - Cagayan', driver: 'Juan dela Cruz', depart: '02:00 PM', status: 'scheduled',    seats: 45 },
      { id: 6,  date: new Date(y, m, today.getDate()), busIndex: 4, route: 'Manila - Palawan',driver: 'Rosa Garcia',    depart: '04:30 PM', status: 'scheduled',    seats: 60 },
      { id: 7,  date: new Date(y, m, today.getDate() + 1), busIndex: 1, route: 'Cebu - Bacolod',  driver: 'Maria Santos',   depart: '07:00 AM', status: 'scheduled',    seats: 55 },
      { id: 8,  date: new Date(y, m, today.getDate() + 2), busIndex: 5, route: 'Manila - Ilocos', driver: 'Carlo Tan',      depart: '05:00 AM', status: 'scheduled',    seats: 45 },
      { id: 9,  date: new Date(y, m, today.getDate() + 3), busIndex: 2, route: 'Davao -> Butuan', driver: 'Pedro Reyes',  depart: '08:30 AM', status: 'maintenance', seats: 40 },
      { id: 10, date: new Date(y, m, today.getDate() + 5), busIndex: 6, route: 'Manila -> Leyte',  driver: 'Liza Navarro',   depart: '06:45 AM', status: 'scheduled',   seats: 50 },
    ];

    if (!tickets || tickets.length === 0) {
      if (buses && buses.length > 0) {
        return fallbackEvents.map(event => {
          const actualBus = buses[event.busIndex % buses.length];
          return {
            id: event.id,
            date: event.date,
            bus: actualBus.plate_number,
            busModel: actualBus.model,
            plate: actualBus.plate_number,
            route: event.route,
            driver: event.driver,
            depart: event.depart,
            status: event.status,
            seats: actualBus.seating_capacity || event.seats
          };
        });
      } else {
        return fallbackEvents.map(event => ({
          id: event.id,
          date: event.date,
          bus: `BUS-00${event.busIndex + 1}`,
          busModel: 'Luxury Coach',
          plate: `XYZ-00${event.busIndex + 1}`,
          route: event.route,
          driver: event.driver,
          depart: event.depart,
          status: event.status,
          seats: event.seats
        }));
      }
    }

    return tickets.map((t: any) => ({
      id: t.id,
      date: t.date_of_travel ? new Date(t.date_of_travel) : new Date(),
      bus: t.bus?.plate_number || t.plate_no || 'N/A',
      busModel: t.bus?.model || '',
      plate: t.bus?.plate_number || t.plate_no || 'N/A',
      route: `${t.pick_up || 'N/A'} - ${t.drop_off || 'N/A'}`,
      driver: t.driver ? `${t.driver.first_name || ''} ${t.driver.last_name || ''}`.trim() : (t.driver?.name || 'N/A'),
      depart: '09:00 AM',
      status: t.status === 'completed' ? 'completed' : t.status === 'approved' ? 'in_service' : 'scheduled',
      seats: t.no_of_passengers || 45,
    }));
  }, [tickets, buses, y, m, today]);

  const selectedEvents = useMemo(() => {
    return fleetSchedules.filter(s => isSameDay(s.date, selected));
  }, [fleetSchedules, selected]);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const occupiedToday = useMemo(() => {
    return Array.from(new Set(selectedEvents.map(d => d.bus)));
  }, [selectedEvents]);

  const availableToday = useMemo(() => {
    if (!buses || buses.length === 0) {
      const allBusesPlaceholder = [
        { id: 1, plate_number: 'XYZ-001', model: 'BUS-001', seating_capacity: 45 },
        { id: 2, plate_number: 'XYZ-002', model: 'BUS-002', seating_capacity: 55 },
        { id: 3, plate_number: 'XYZ-003', model: 'BUS-003', seating_capacity: 40 },
        { id: 4, plate_number: 'XYZ-004', model: 'BUS-004', seating_capacity: 50 },
        { id: 5, plate_number: 'XYZ-005', model: 'BUS-005', seating_capacity: 60 },
        { id: 6, plate_number: 'XYZ-006', model: 'BUS-006', seating_capacity: 45 },
        { id: 7, plate_number: 'XYZ-007', model: 'BUS-007', seating_capacity: 50 },
      ];
      return allBusesPlaceholder.filter((b: any) => !occupiedToday.includes(b.model));
    }
    return buses.filter((b: any) => !occupiedToday.includes(b.plate_number));
  }, [buses, occupiedToday]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm p-3 flex flex-col h-full min-h-0">
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-50 dark:border-gray-855 shrink-0">
        <div>
          <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
            <LuBus className="w-3.5 h-3.5 text-blue-500" />
            Fleet Calendar & Availability
          </h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Select date to track status</p>
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex flex-col gap-1.5 mt-3.5 shrink-0">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-855 dark:text-white uppercase tracking-wider">
            {MONTH_NAMES[calMonth]} {calYear}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
              className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <LuChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
              className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <LuChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-[8px] font-black text-gray-400 dark:text-gray-600 py-0.5 uppercase">{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="h-6.5" />;
            const events = fleetSchedules.filter(s => isSameDay(s.date, date));
            const isToday = isSameDay(date, today);
            const isSel = isSameDay(date, selected);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelected(date)}
                className={`relative flex flex-col items-center justify-center rounded-lg transition-all h-6.5 text-[9px] font-black ${
                  isSel
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/30'
                    : isToday
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{date.getDate()}</span>
                {events.length > 0 && (
                  <span className={`w-1 h-1 rounded-full mt-0.5 ${isSel ? 'bg-white' : 'bg-blue-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Available / Occupied Row split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/80 min-h-0 flex-1">
        {/* Left: Available */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-xl mb-1.5 shrink-0">
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Avail</span>
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{availableToday.length}</span>
          </div>
          <div className="space-y-1 overflow-y-auto pr-1 flex-1">
            {availableToday.map((b: any) => (
              <div key={b.id || b.plate_number || b} className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-855 transition-all shadow-sm">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[8.5px] font-black text-gray-900 dark:text-white uppercase tracking-wider shrink-0">{b.model || b.plate_number || b}</span>
                  <span className="text-[7.5px] text-gray-400 dark:text-gray-500 font-bold truncate">({b.plate_number || b})</span>
                </div>
                <span className="text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded shrink-0">{b.seating_capacity || 49} Seats</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Occupied */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-xl mb-1.5 shrink-0">
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Occupied</span>
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">{occupiedToday.length}</span>
          </div>
          <div className="space-y-1 overflow-y-auto pr-1 flex-1">
            {occupiedToday.length === 0 ? (
              <p className="text-[9px] text-gray-400 dark:text-gray-500 italic p-1.5">No occupied buses.</p>
            ) : (
              occupiedToday.map((b, idx) => {
                const dispatch = selectedEvents.find(s => s.bus === b);
                const plate = dispatch?.plate || 'XYZ 7890';
                const driver = dispatch?.driver || 'Standby Driver';
                const route = dispatch?.route || 'In route';
                const depart = dispatch?.depart || 'N/A';
                return (
                  <div key={`${b}-${idx}`} className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-855 transition-all shadow-sm">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                        <span className="text-[8.5px] font-black text-gray-900 dark:text-white uppercase tracking-wider shrink-0">{dispatch?.busModel || b}</span>
                        <span className="text-[7.5px] text-gray-400 dark:text-gray-500 font-bold truncate">({plate})</span>
                      </div>
                      <span className="text-[7.5px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 px-1 py-0.5 rounded shrink-0">Dep {depart}</span>
                    </div>
                    <div className="flex items-center justify-between text-[7.5px] font-bold text-gray-500 dark:text-gray-400 pl-2.5">
                      <span className="truncate max-w-[65%]">{route}</span>
                      <span className="truncate max-w-[35%] opacity-75 text-right">{driver}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

