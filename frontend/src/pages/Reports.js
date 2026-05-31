import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './Reports.css';



export default function Reports() {

  const toDbDate = (str) => {
    if (!str) return '';
    const trimmed = str.trim();
    const parts = trimmed.split(/[-/]/).map(p => p.trim());
    if (parts.length === 3) {
      let [d, m, y] = parts;
      if (d.length === 4) {
        return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
      }
      d = d.padStart(2, '0');
      m = m.padStart(2, '0');
      if (y.length === 2) {
        y = '20' + y;
      }
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  };

  const fromDbDate = (str) => {
    if (!str) return '';
    const trimmed = str.trim();
    const parts = trimmed.split(/[-/]/).map(p => p.trim());
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y.length === 2 || d.length === 4) return trimmed; // already DD-MM-YYYY
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    return trimmed;
  };

  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (filterEvent) params.event = filterEvent;
      const res = await axios.get('/api/attendance/report', { params });
      setReport(res.data);
    } catch (err) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterEvent]);

  useEffect(() => {
    const t = setTimeout(fetchReport, 400);
    return () => clearTimeout(t);
  }, [fetchReport]);

  const formatDateDDMMYYYY = (dateStr) => {
    // Convert YYYY-MM-DD to DDMMYYYY
    if (dateStr && dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}${month}${year}`;
    }
    // If already in different format, try to parse
    return dateStr.replace(/[\/\-]/g, '');
  };

  const exportExcel = () => {
    if (report.length === 0) { toast.error('No data to export'); return; }

    const wb = XLSX.utils.book_new();

    // Create a sheet for each session (date + event combination)
    report.forEach(session => {
      const formattedDate = formatDateDDMMYYYY(session.date);
      const sheetName = `${session.event_name}_${formattedDate}`.replace(/[\/\\?*:\[\]]/g, '-').substring(0, 31);
      
      const rows = [
        ['ATTENDANCE REPORT', '', '', '', '', '', '', ''],
        ['Event:', session.event_name, 'Date:', session.date, '', '', '', ''],
        [],
        ['S.No', 'Name', 'Enrollment No.', 'Admission No.', 'Course', 'Year', 'Semester', 'Status']
      ];

      // Data rows
      (session.records || [])
        .filter(r => {
          if (statusFilter === 'present') return r.present === 1;
          if (statusFilter === 'absent') return r.present !== 1;
          return true;
        })
        .forEach((r, idx) => {
          rows.push([
            idx + 1,
            r.name || '',
            r.enrollment_no || '',
            r.admission_no || '',
            r.course || '',
            r.year || '',
            r.semester || '',
            r.present == 1 ? 'Present' : 'Absent'
          ]);
        });

      rows.push([]);
      rows.push([
        'Summary',
        `Total Members: ${session.total}`,
        `Present: ${session.present}`,
        `Absent: ${session.absent}`,
        `Percentage: ${session.total ? Math.round((session.present / session.total) * 100) : 0}%`,
        '',
        '',
        ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // S.No
        { wch: 24 },  // Name
        { wch: 18 },  // Enrollment No.
        { wch: 18 },  // Admission No.
        { wch: 12 },  // Course
        { wch: 10 },  // Year
        { wch: 12 },  // Semester
        { wch: 12 }   // Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `attendance_report_${Date.now()}.xlsx`);
    toast.success(`Excel exported with ${report.length} sheets!`);
  };

  const exportCSV = () => {
    if (report.length === 0) { toast.error('No data to export'); return; }

    const rows = [['Date', 'Event', 'Name', 'Enrollment No.', 'Course', 'Year', 'Semester', 'Status']];
    report.forEach(session => {
      (session.records || [])
        .filter(r => {
          if (statusFilter === 'present') return r.present === 1;
          if (statusFilter === 'absent') return r.present !== 1;
          return true;
        })
        .forEach(r => {
          rows.push([
            session.date, session.event_name,
            r.name, r.enrollment_no, r.course, r.year, r.semester,
            r.present == 1 ? 'Present' : 'Absent'
          ]);
        });
    });

    const csv = rows.map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    saveAs(new Blob([csv], { type: 'text/csv' }), `attendance_report_${Date.now()}.csv`);
    toast.success('CSV exported!');
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this attendance session?')) return;
    try {
      await axios.delete(`/api/attendance/sessions/${sessionId}`);
      toast.success('Session deleted');
      fetchReport();
    } catch {
      toast.error('Delete failed');
    }
  };

  const totalSessions = report.length;
  const totalPresent = report.reduce((a, s) => a + (s.present || 0), 0);
  const totalRecords = report.reduce((a, s) => a + (s.total || 0), 0);
  const avgRate = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0;

  return (
    <div className="reports-root">
      {/* Filter bar */}
      <div className="filter-card animate-in">
        <h3 className="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
        </h3>
        <div className="filter-row">
          <div className="field">
            <label>From Date (DD-MM-YYYY)</label>
            <div className="date-input-container" style={{ minWidth: '220px' }}>
              <input type="text" placeholder="e.g. 01-05-2026" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <div className="picker-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input 
                  type="date" 
                  value={toDbDate(startDate)}
                  onChange={e => {
                    if (e.target.value) {
                      setStartDate(fromDbDate(e.target.value));
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="field">
            <label>To Date (DD-MM-YYYY)</label>
            <div className="date-input-container" style={{ minWidth: '220px' }}>
              <input type="text" placeholder="e.g. 31-05-2026" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <div className="picker-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input 
                  type="date" 
                  value={toDbDate(endDate)}
                  onChange={e => {
                    if (e.target.value) {
                      setEndDate(fromDbDate(e.target.value));
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="field">
            <label>Filter by Event</label>
            <input type="text" placeholder="Event name..." value={filterEvent} onChange={e => setFilterEvent(e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Both</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <button className="clear-filter-btn" onClick={() => { setStartDate(''); setEndDate(''); setFilterEvent(''); setStatusFilter('all'); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Clear
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="report-stats">
        <div className="rstat">
          <div className="rstat-v">{totalSessions}</div>
          <div className="rstat-l">Sessions</div>
        </div>
        <div className="rstat">
          <div className="rstat-v">{totalRecords}</div>
          <div className="rstat-l">Records</div>
        </div>
        <div className="rstat green">
          <div className="rstat-v">{totalPresent}</div>
          <div className="rstat-l">Total Present</div>
        </div>
        <div className="rstat blue">
          <div className="rstat-v">{avgRate}%</div>
          <div className="rstat-l">Avg. Rate</div>
        </div>
      </div>

      {/* Export buttons + results */}
      <div className="results-card">
        <div className="results-header">
          <div className="results-title">
            <h3>{totalSessions} Session{totalSessions !== 1 ? 's' : ''} Found</h3>
          </div>
          <div className="export-btns">
            <button className="export-btn excel" onClick={exportExcel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Excel
            </button>
            <button className="export-btn csv" onClick={exportCSV}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{padding:'20px'}}>
            {[1,2,3].map(i => <div key={i} className="skeleton-row" style={{marginBottom:'10px'}} />)}
          </div>
        ) : report.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
              <line x1="2" y1="20" x2="22" y2="20"/>
            </svg>
            <p>No attendance records found</p>
          </div>
        ) : (
          <div className="sessions-list">
            {report.map(session => (
              <div key={session.id} className="session-block">
                <div
                  className="session-header"
                  onClick={() => {
                    setExpandedSession(expandedSession === session.id ? null : session.id);
                    setStatusFilter('all');
                  }}
                >
                  <div className="session-main">
                    <div className="session-date">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {new Date(session.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="session-event">{session.event_name}</div>
                  </div>
                  <div className="session-pills">
                    <span className="spill green">{session.present}P</span>
                    <span className="spill red">{session.absent}A</span>
                    <span className="spill gray">{session.total}T</span>
                    <span className="spill purple">
                      {session.total ? Math.round((session.present / session.total) * 100) : 0}%
                    </span>
                    <button className="del-session" onClick={(e) => handleDeleteSession(session.id, e)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                    <svg className={`chevron ${expandedSession === session.id ? 'up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {expandedSession === session.id && session.records && (
                  <div className="session-records animate-in">

                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Enrollment No.</th>
                          <th>Course</th>
                          <th>Year</th>
                          <th>Semester</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.records
                          .filter(r => {
                            if (statusFilter === 'present') return r.present === 1;
                            if (statusFilter === 'absent') return r.present !== 1;
                            return true;
                          })
                          .map((r, idx) => (
                            <tr key={idx}>
                              <td className="row-num">{idx + 1}</td>
                              <td className="name-cell">
                                <div className="mini-avatar">{r.name[0]}</div>
                                {r.name}
                              </td>
                              <td className="mono">{r.enrollment_no}</td>
                              <td>{r.course}</td>
                              <td>{r.year}</td>
                              <td>{r.semester}</td>
                              <td>
                                <span className={`status-badge ${r.present == 1 ? 'present-badge' : 'absent-badge'}`}>
                                  {r.present == 1 ? '✓ Present' : '✗ Absent'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
