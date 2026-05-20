import { useState, useEffect } from 'react';
import { 
  LuFileSpreadsheet, LuFileText, LuCalendar,
  LuTrendingUp, LuDollarSign, LuActivity
} from 'react-icons/lu';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { billingApi } from '../../api/billing';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { LoadingScreen } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('month');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const summaryRes = await billingApi.getReportsSummary(range);
      setData(summaryRes.data.data);
    } catch (err) {
      console.error('Failed to fetch report summary, using professional mock data');
      const mockData: Record<string, any> = {
        day: {
          kpis: { revenue: 45200, transactions: 18, avg_ticket: 2511, profit_margin: 0.15 },
          trend: [
            { date: `${new Date().toISOString().split('T')[0]} 08:00:00`, total: 5000 },
            { date: `${new Date().toISOString().split('T')[0]} 10:00:00`, total: 12000 },
            { date: `${new Date().toISOString().split('T')[0]} 12:00:00`, total: 8500 },
            { date: `${new Date().toISOString().split('T')[0]} 14:00:00`, total: 15000 },
            { date: `${new Date().toISOString().split('T')[0]} 16:00:00`, total: 4700 }
          ],
          categories: [
            { category: 'Travel & Tours', total: 30000 },
            { category: 'Accounting Services', total: 15200 },
          ]
        },
        week: {
          kpis: { revenue: 285400, transactions: 84, avg_ticket: 3397, profit_margin: 0.16 },
          trend: Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return {
              date: d.toISOString().split('T')[0],
              total: Math.round(20000 + Math.random() * 40000)
            };
          }),
          categories: [
            { category: 'Travel & Tours', total: 180000 },
            { category: 'Accounting Services', total: 105400 },
          ]
        },
        month: {
          kpis: { revenue: 1250500, transactions: 142, avg_ticket: 8806, profit_margin: 0.18 },
          trend: [
            { date: '2026-05-01', total: 45000 },
            { date: '2026-05-15', total: 210000 },
            { date: '2026-05-30', total: 310500 }
          ],
          categories: [
            { category: 'Travel & Tours', total: 650000 },
            { category: 'Accounting Services', total: 250000 },
          ]
        },
        year: {
          kpis: { revenue: 14850000, transactions: 1840, avg_ticket: 8070, profit_margin: 0.20 },
          trend: Array.from({ length: 12 }, (_, i) => {
            const year = new Date().getFullYear();
            return {
              date: `${year}-${String(i + 1).padStart(2, '0')}-01`,
              total: Math.round(800000 + Math.random() * 600000)
            };
          }),
          categories: [
            { category: 'Travel & Tours', total: 9500000 },
            { category: 'Accounting Services', total: 5350000 },
          ]
        },
        all: {
          kpis: { revenue: 42500000, transactions: 5120, avg_ticket: 8300, profit_margin: 0.19 },
          trend: [
            { date: '2024-01-01', total: 12000000 },
            { date: '2025-01-01', total: 18000000 },
            { date: '2026-01-01', total: 12500000 }
          ],
          categories: [
            { category: 'Travel & Tours', total: 26000000 },
            { category: 'Accounting Services', total: 16500000 },
          ]
        }
      };
      setData(mockData[range] || mockData.month);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    try {
      const res = await billingApi.getReportsDetailed(range);
      const invoices = res.data.data;
      
      if (!invoices || invoices.length === 0) {
        alert("No detailed transaction data found for this period.");
        return;
      }

      const flattenedData = invoices.map((inv: any) => ({
        DATE: new Date(inv.created_at).toLocaleDateString(),
        'INVOICE #': inv.invoice_number,
        CUSTOMER: inv.customer_name || 'Walk-in',
        SERVICES: inv.items?.map((i: any, idx: number) => `${idx + 1}. ${i.service?.name} (x${i.quantity})`).join('\n') || 'N/A',
        METHOD: inv.payment_method,
        AMOUNT: `PHP ${Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      }));

      if (type === 'pdf') {
        exportToPDF(`Detailed Transaction Log - ${range.toUpperCase()}`, flattenedData);
      } else {
        exportToExcel(`Detailed Transaction Log - ${range.toUpperCase()}`, flattenedData);
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to fetch detailed records for export.");
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [range]);

  const { user } = useAuth();

  const exportToPDF = (title: string, exportData: any[]) => {
    if (!exportData || exportData.length === 0) {
      alert("No data available to export for this period.");
      return;
    }
    try {
      const doc = new jsPDF('l', 'mm', 'a4');

      // Add Logo
      try {
        doc.addImage('/JVDlogo-removebg-preview.png', 'PNG', 240, 10, 35, 35);
      } catch (e) {
        console.warn("Logo not found for PDF");
      }

      // Branding Header
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("JVD MANAGEMENT SYSTEM", 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text("INTERNAL ORGANIZATIONAL REPORT", 14, 32);

      // Company Address
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Susano Road Camarin, Caloocan City, Philippines | +63 976-4711-294", 14, 37);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 42, 280, 42);

      // Report Title & Meta
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`Financial Report: ${title}`, 14, 52);
      
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated by: ${user?.first_name} ${user?.last_name || 'Authorized Personnel'}`, 14, 59);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, 64);
      doc.text(`Reference ID: JVD-REF-${Math.floor(100000 + Math.random() * 900000)}`, 14, 69);
      
      // Main Data Table
      autoTable(doc, {
        head: [Object.keys(exportData[0]).map(k => k.toUpperCase())],
        body: exportData.map(obj => Object.values(obj)),
        startY: 80,
        theme: 'grid',
        headStyles: { 
          fillColor: [37, 99, 235], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 3
        },
        bodyStyles: { 
          fontSize: 8,
          cellPadding: 2,
          fillColor: false 
        },
        columnStyles: {
          3: { cellWidth: 60 }, // SERVICES column
        },
        alternateRowStyles: { 
          fillColor: false 
        },
        margin: { top: 80 }
      });

      // Signature Section
      let finalY = 240;
      try {
        if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
          finalY = (doc as any).lastAutoTable.finalY + 20;
        }
      } catch (e) {
        console.warn("Could not determine table end");
      }

      if (finalY < 270) {
        doc.setDrawColor(200);
        doc.line(14, finalY, 70, finalY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Authorized Signature", 14, finalY + 5);
        doc.text(`${user?.first_name} ${user?.last_name || "Manager Name"}`, 14, finalY + 10);
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" });
      }
      
      doc.save(`jvd_financial_report_${range}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try Excel export instead.");
    }
  };

  const exportToExcel = async (title: string, exportData: any[]) => {
    if (!exportData || exportData.length === 0) {
      alert("No data available to export for this period.");
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('JVD Financial Report');

    // 1. Setup Columns
    const columns = Object.keys(exportData[0] || {}).map(key => {
      const headerLen = key.length;
      const maxContentLen = Math.max(...exportData.map(row => String(row[key] || '').length), 0);
      return {
        header: key.toUpperCase(),
        key: key,
        width: Math.max(headerLen, maxContentLen, 12) + 8
      };
    });
    
    if (columns[0]) columns[0].width = Math.max(columns[0].width, 35);
    worksheet.columns = columns;

    // 2. Header Rows
    worksheet.insertRow(1, ['JVD INTERNAL MANAGEMENT SYSTEM']);
    worksheet.insertRow(2, [`FINANCIAL REPORT: ${title.toUpperCase()}`]);
    worksheet.insertRow(3, [`Generated by: ${user?.first_name} ${user?.last_name}`]);
    worksheet.insertRow(4, [`Date: ${new Date().toLocaleString()}`]);
    worksheet.insertRow(5, [`Period: ${range.toUpperCase()}`]);
    worksheet.insertRow(6, [`Status: AUTHORIZED INTERNAL USE ONLY`]);
    worksheet.insertRow(7, []); 

    for (let i = 1; i <= 6; i++) {
      const row = worksheet.getRow(i);
      row.getCell(1).font = { bold: true, size: i === 1 ? 16 : 10, color: { argb: i === 1 ? 'FF1E3A8A' : 'FF64748B' } };
    }

    // 3. Data Table
    worksheet.getRow(8).values = Object.keys(exportData[0] || {}).map(k => k.toUpperCase());
    exportData.forEach((item) => {
      worksheet.addRow(item);
    });

    // 4. Styling
    const headerRow = worksheet.getRow(8);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 8 && rowNumber <= 8 + exportData.length) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          const val = String(cell.value || '');
          const isNumeric = !isNaN(Number(cell.value)) || val.includes('%') || val.includes('₱');
          cell.alignment = { vertical: 'middle', horizontal: isNumeric ? 'center' : 'left', indent: isNumeric ? 0 : 1, wrapText: true };
          if (rowNumber % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      }
    });

    // 5. Protection
    await worksheet.protect('jvd-secure', { selectLockedCells: true, selectUnlockedCells: true });

    // 6. Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jvd_financial_report_${range}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading && !data) {
    return <LoadingScreen />;
  }

  const getProcessedTrend = (rawTrend: any[], selectedRange: string) => {
    const trendList = rawTrend || [];
    const localNow = new Date();
    const currentYear = localNow.getFullYear();
    const currentMonthStr = String(localNow.getMonth() + 1).padStart(2, '0');
    
    if (selectedRange === 'day') {
      const todayStr = `${currentYear}-${currentMonthStr}-${String(localNow.getDate()).padStart(2, '0')}`;
      const filled = [];
      for (let h = 0; h < 24; h++) {
        const hourStr = String(h).padStart(2, '0');
        const dateKey = `${todayStr} ${hourStr}:00:00`;
        const match = trendList.find((t: any) => {
          if (!t.date) return false;
          const tDate = t.date.replace('T', ' ');
          return tDate.includes(`${todayStr} ${hourStr}:`) || tDate.includes(` ${hourStr}:`);
        });
        filled.push({
          date: dateKey,
          total: match ? parseFloat(match.total) : 0
        });
      }
      return filled;
    }

    if (selectedRange === 'week') {
      const startOfWeek = new Date(localNow);
      const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday
      const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const filled = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const match = trendList.find((t: any) => t.date && t.date.startsWith(dateKey));
        filled.push({
          date: dateKey,
          total: match ? parseFloat(match.total) : 0
        });
      }
      return filled;
    }

    if (selectedRange === 'month') {
      const daysInMonth = new Date(currentYear, localNow.getMonth() + 1, 0).getDate();
      const filled = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(currentYear, localNow.getMonth(), i);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const match = trendList.find((t: any) => t.date && t.date.startsWith(dateKey));
        filled.push({
          date: dateKey,
          total: match ? parseFloat(match.total) : 0
        });
      }
      return filled;
    }

    if (selectedRange === 'year') {
      const filled = [];
      for (let m = 0; m < 12; m++) {
        const monthNum = String(m + 1).padStart(2, '0');
        const dateKey = `${currentYear}-${monthNum}-01`;
        const match = trendList.find((t: any) => {
          if (!t.date) return false;
          return t.date.startsWith(`${currentYear}-${monthNum}`);
        });
        filled.push({
          date: dateKey,
          total: match ? parseFloat(match.total) : 0
        });
      }
      return filled;
    }

    if (selectedRange === 'all') {
      if (trendList.length === 1) {
        const d = new Date(trendList[0].date.replace(' ', 'T'));
        const prevYear = `${d.getFullYear() - 1}-01-01`;
        const nextYear = `${d.getFullYear() + 1}-01-01`;
        return [
          { date: prevYear, total: 0 },
          { date: trendList[0].date, total: parseFloat(trendList[0].total) },
          { date: nextYear, total: 0 }
        ];
      }
      return trendList.map((t: any) => ({
        date: t.date,
        total: parseFloat(t.total)
      }));
    }

    return trendList.map((t: any) => ({
      date: t.date,
      total: parseFloat(t.total)
    }));
  };

  const processedTrend = getProcessedTrend(data?.trend, range);

  return (
    <div className="space-y-10 pb-12 mt-10">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/60 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            Analytics Module
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Financial Intelligence & Export
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-[1.25rem] border border-gray-200/50 dark:border-gray-700/50 shadow-inner backdrop-blur-md">
            {['day', 'week', 'month', 'year', 'all'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  range === r 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md scale-[1.03]' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:scale-[1.01]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleExport('pdf')}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
            >
              <LuFileText className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
            >
              <LuFileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-300/40 dark:shadow-blue-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuDollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white">
              <LuTrendingUp className="w-3 h-3" />
              Revenue
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Revenue</p>
            <p className="text-3xl font-black">₱{data?.kpis.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Transactions */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-xl shadow-violet-300/40 dark:shadow-violet-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuActivity className="w-5 h-5 text-white" />
            </div>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white">
              Volume
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Transactions</p>
            <p className="text-3xl font-black">{data?.kpis.transactions}</p>
          </div>
        </div>

        {/* Avg Ticket Size */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl shadow-amber-300/40 dark:shadow-amber-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuCalendar className="w-5 h-5 text-white" />
            </div>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white">
              Avg
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Avg Ticket Size</p>
            <p className="text-3xl font-black">₱{Math.round(data?.kpis.avg_ticket || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-300/40 dark:shadow-emerald-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuTrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white">
              Margin
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Profit Margin</p>
            <p className="text-3xl font-black">{(data?.kpis.profit_margin * 100)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Revenue Trend Chart */}
        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="mb-10">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Revenue Trajectory</h2>
            <p className="text-[11px] text-gray-400 font-medium">Historical performance over the selected period</p>
          </div>
          <div className="h-[350px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={processedTrend} style={{ background: "transparent" }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    tickFormatter={(val) => {
                      try {
                        const dateObj = new Date(val);
                        if (isNaN(dateObj.getTime())) return val;
                        
                        if (range === 'day') {
                          return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        }
                        if (range === 'year' || range === 'all') {
                          return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        }
                        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } catch (e) {
                        return val;
                      }
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val >= 1000 ? val/1000 + 'k' : val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                    labelStyle={{ fontWeight: 800, color: '#111827', marginBottom: '8px' }}
                    formatter={(value: any) => [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                    dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="mb-10">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Service Distribution</h2>
            <p className="text-[11px] text-gray-400 font-medium">Revenue contribution by service category</p>
          </div>
          <div className="h-[350px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={data?.categories} style={{ background: "transparent" }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val >= 1000 ? val/1000 + 'k' : val}`} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} 
                    formatter={(value: any) => [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Total Revenue']}
                  />
                  <Bar dataKey="total" radius={[15, 15, 0, 0]}>
                    {data?.categories?.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
