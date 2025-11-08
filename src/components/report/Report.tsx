import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Report.css';

// --- INTERFACES ---

type DataItem = Record<string, string | number>;

interface BorrowedBook {
 book_id: string;
 title: string;
 author: string;
 borrow_count: number;
}

interface StudentFine {
 user_id: string;
 name: string;
 email: string;
 total_fines: number;
 paid_fines: number;
 pending_fines: number;
}

interface OverdueBook {
 book_id: string;
 title: string;
 author: string;
 user_name: string;
 borrowed_date: string;
 due_date: string;
 days_overdue: number;
 fine_amount: number;
}

type ReportType = 'most-borrowed' | 'student-fines' | 'overdue';

interface ReportConfig {
  sheetName: string;
  dataKeys: string[];
  displayNames: string[];
}

interface ReportData {
  data: Array<BorrowedBook | StudentFine | OverdueBook>;
  sheetName: string;
  dataKeys: string[];
  displayNames: string[];
}

// --- REPORT CONFIGURATION (Defines Keys and Display Names) ---
// This ensures the exported file only contains the data you see in the UI, 
// and uses the requested column headers.
const REPORT_CONFIG: Record<ReportType, ReportConfig> = {
    'most-borrowed': {
        sheetName: 'Most Borrowed Books',
        // Internal data keys (used to extract data, excludes book_id)
        dataKeys: ['Rank', 'title', 'author', 'borrow_count'], 
        // Friendly display names (used for Excel header row)
        displayNames: ['Rank', 'Title', 'Author', 'Times Borrowed']
    },
    'student-fines': {
        sheetName: 'Student With Highest Fines',
        // Internal data keys (excludes user_id)
        dataKeys: ['Rank', 'name', 'email', 'total_fines', 'paid_fines', 'pending_fines'],
        // Friendly display names
        displayNames: ['Rank', 'Student Name', 'Email', 'Total Fines (RM)', 'Paid (RM)', 'Pending (RM)']
    },
    'overdue': {
        sheetName: 'Overdue Books',
        // Internal data keys (excludes book_id)
        dataKeys: ['title', 'author', 'user_name', 'borrowed_date', 'due_date', 'days_overdue', 'fine_amount'],
        // Friendly display names
        displayNames: ['Book Title', 'Author', 'Student Name', 'Borrowed Date', 'Due Date', 'Days Overdue', 'Fine Amount (RM)']
    }
};

const Report = () => {
  const [reportType, setReportType] = useState<ReportType>('most-borrowed');
  const [limit, setLimit] = useState<number>(5);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mostBorrowedBooks, setMostBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [studentFines, setStudentFines] = useState<StudentFine[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<OverdueBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMostBorrowedBooks = useCallback(async () => {
    // Ensure supabase is properly typed or checked if used in a real environment
    if (typeof supabase === 'undefined') {
      throw new Error("Supabase client is not available.");
    }
    const { data, error } = await supabase
      .rpc('get_most_borrowed_books', { limit_count: limit });

    if (error) throw error;
    setMostBorrowedBooks(data || []);
  }, [limit]);

  const fetchStudentFines = useCallback(async () => {
    if (typeof supabase === 'undefined') {
      throw new Error("Supabase client is not available.");
    }
    const { data, error } = await supabase
      .rpc('get_students_with_highest_fines', { limit_count: limit });

    if (error) throw error;
    setStudentFines(data || []);
  }, [limit]);

  const fetchOverdueBooks = useCallback(async () => {
    if (typeof supabase === 'undefined') {
      throw new Error("Supabase client is not available.");
    }
    const { data, error } = await supabase
      .rpc('get_overdue_books');

    if (error) throw error;
    setOverdueBooks(data || []);
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      switch (reportType) {
        case 'most-borrowed':
          await fetchMostBorrowedBooks();
          break;
        case 'student-fines':
          await fetchStudentFines();
          break;
        case 'overdue':
          await fetchOverdueBooks();
          break;
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [reportType, fetchMostBorrowedBooks, fetchStudentFines, fetchOverdueBooks]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);
  
  const getReportData = (): ReportData => {
    const config = REPORT_CONFIG[reportType];
        
    switch (reportType) {
      case 'most-borrowed': {
        const sortedBooks = [...mostBorrowedBooks].sort((a, b) => 
          sortOrder === 'asc' ? a.borrow_count - b.borrow_count : b.borrow_count - a.borrow_count
        );
        const mostBorrowedData = sortedBooks.map((item, index) => ({
          Rank: index + 1,
          ...item,
        }));
        return { data: mostBorrowedData, ...config };
      }
      
      case 'student-fines': {
        const sortedFines = [...studentFines].sort((a, b) => 
          sortOrder === 'asc' ? a.total_fines - b.total_fines : b.total_fines - a.total_fines
        );
        const studentFinesData = sortedFines.map((item, index) => ({
          Rank: index + 1,
          ...item,
        }));
        return { data: studentFinesData, ...config };
      }
      
      case 'overdue': {
        const sortedOverdue = [...overdueBooks].sort((a, b) => 
          sortOrder === 'asc' ? a.fine_amount - b.fine_amount : b.fine_amount - a.fine_amount
        );
        return { data: sortedOverdue, ...config };
      }
      
      default: {
        console.error('Invalid report type selected.');
        return { data: [], sheetName: '', dataKeys: [], displayNames: [] };
      }
    }
  };

  const exportToPdf = async () => {
    try {
      const { data, sheetName, dataKeys, displayNames } = getReportData();

      if (!data || data.length === 0) {
        setError('No data to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const doc = new jsPDF();
      
      // Add main header
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80); // Dark blue color
      doc.text('BookSmart Library Management System', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      
      // Add report title
      doc.setFontSize(14);
      doc.text(sheetName, doc.internal.pageSize.width / 2, 25, { align: 'center' });

      // Add timestamp
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128); // Gray color
      doc.text(new Date().toLocaleString(), doc.internal.pageSize.width - 15, 10, { align: 'right' });

      // Prepare table data
      const tableRows = data.map(item => 
        dataKeys.map(key => {
          const value = (item as unknown as DataItem)[key];
          if (typeof value === 'number' && (key.includes('fines') || key.includes('fine_amount'))) {
            return `RM ${value.toFixed(2)}`;
          }
          if (key === 'borrowed_date' || key === 'due_date') {
            return new Date(value as string).toLocaleDateString();
          }
          return value?.toString() ?? '';
        })
      );

      // Generate table
      autoTable(doc, {
        head: [displayNames],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [166, 201, 236] },
        margin: { top: 35 },
        didDrawPage: function(data) {
          // Add footer on each page
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          
          // Add page number
          const pageNumber = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
          doc.text(pageNumber, pageSize.width / 2, pageHeight - 10, { align: 'center' });
          
          // Add footer text
          const footerText = '© 2025 BookSmart Library Management System. All rights reserved.';
          doc.text(footerText, pageSize.width / 2, pageHeight - 5, { align: 'center' });
        }
      });

      // Save PDF
      doc.save(`${reportType}-report-${timestamp}.pdf`);

    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      const { data, sheetName, dataKeys, displayNames } = getReportData();

      if (!data || data.length === 0) {
        setError('No data to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Create filtered data with proper types
      const filteredData = data.map((item) => {
        const filteredItem: DataItem = {};
        dataKeys.forEach(key => {
          let value = (item as unknown as DataItem)[key];
          if (typeof value === 'number' && (key.includes('fines') || key.includes('fine_amount'))) {
            value = `RM ${value.toFixed(2)}`;
          }
          if ((key === 'borrowed_date' || key === 'due_date') && typeof value === 'string') {
            value = new Date(value).toLocaleDateString();
          }
          filteredItem[key] = value;
        });
        return filteredItem;
      });

      // Generate the sheet
      const ws = XLSX.utils.json_to_sheet(filteredData, {
        header: dataKeys
      });

      // Define header style
      const headerStyle: XLSX.CellStyle = {
        fill: {
          fgColor: { rgb: "A6C9EC" },
          patternType: "solid"
        },
        font: { bold: true }
      };

      // Apply header styles
      for (let i = 0; i < dataKeys.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (ws[cellRef]) {
          ws[cellRef].v = displayNames[i];
          ws[cellRef].s = headerStyle;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${reportType}-report-${timestamp}.xlsx`);

    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    }
  };

  return (
    <div className="report-container">
      <header className="report-header">
        <h1>Library Reports</h1>
        <div className="report-controls">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="report-type-select"
          >
            <option value="most-borrowed">Most Borrowed Books</option>
            <option value="student-fines">Students with Highest Fines</option>
            <option value="overdue">Overdue Books</option>
          </select>

          {reportType !== 'overdue' && (
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="limit-select"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          )}
          <div className="export-buttons">
            <button 
              onClick={exportToExcel}
              className="export-button"
              disabled={loading || Boolean(error)}
            >
              Export to Excel
            </button>
            <button 
              onClick={exportToPdf}
              className="export-button"
              disabled={loading || Boolean(error)}
            >
              Export to PDF
            </button>
          </div>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading report data...</div>
      ) : (
        <div className="report-content">
          {reportType === 'most-borrowed' && (
            <div className="most-borrowed-table">
              <h2>Most Borrowed Books</h2>
              <table>
                <thead>
                  <tr>
                    <th 
                      className={`sortable-header ${sortOrder}`}
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      Rank
                    </th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Times Borrowed</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mostBorrowedBooks]
                    .sort((a, b) => sortOrder === 'asc' 
                      ? a.borrow_count - b.borrow_count 
                      : b.borrow_count - a.borrow_count
                    )
                    .map((book, index) => (
                      <tr key={book.book_id}>
                        <td>{index + 1}</td>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>{book.borrow_count}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'student-fines' && (
            <div className="student-fines-table">
              <h2>Students with Highest Fines</h2>
              <table>
                <thead>
                  <tr>
                    <th 
                      className={`sortable-header ${sortOrder}`}
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      Rank
                    </th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Total Fines</th>
                    <th>Paid</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {[...studentFines]
                    .sort((a, b) => sortOrder === 'asc' 
                      ? a.total_fines - b.total_fines 
                      : b.total_fines - a.total_fines
                    )
                    .map((student, index) => (
                      <tr key={student.user_id}>
                        <td>{index + 1}</td>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>RM {student.total_fines.toFixed(2)}</td>
                        <td>RM {student.paid_fines.toFixed(2)}</td>
                        <td>RM {student.pending_fines.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'overdue' && (
            <div className="overdue-table">
              <h2>Overdue Books</h2>
              <table>
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Author</th>
                    <th>Student Name</th>
                    <th>Borrowed Date</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Fine Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueBooks.map((book) => (
                    <tr key={book.book_id}>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.user_name}</td>
                      <td>{new Date(book.borrowed_date).toLocaleDateString()}</td>
                      <td>{new Date(book.due_date).toLocaleDateString()}</td>
                      <td>{book.days_overdue}</td>
                      <td>RM {book.fine_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Report;