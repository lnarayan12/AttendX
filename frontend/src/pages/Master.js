import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import './Master.css';

const EMPTY_FORM = { name: '', course: '', year: '', enrollment_no: '', semester: '', admission_no: '' };
const YEARS = ['1st', '2nd', '3rd', '4th'];
const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export default function Master() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await axios.get(`/api/members?search=${search}`);
      setMembers(res.data);
    } catch (err) {
      toast.error('Failed to fetch members');
    } finally {
      setFetching(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchMembers, 300);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await axios.put(`/api/members/${editId}`, form);
        toast.success('Member updated');
      } else {
        await axios.post('/api/members', form);
        toast.success('Member added');
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member) => {
    setForm({
      name: member.name, course: member.course, year: member.year,
      enrollment_no: member.enrollment_no, semester: member.semester, admission_no: member.admission_no
    });
    setEditId(member.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/members/${id}`);
      toast.success('Member deleted');
      fetchMembers();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const cancelForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        if (rows.length === 0) {
          toast.error('Excel file is empty');
          return;
        }

        // Validate only required column: name
        const requiredColumns = ['name'];
        const allColumns = ['name', 'course', 'year', 'enrollment_no', 'semester', 'admission_no'];
        const hasRequiredColumns = requiredColumns.every(col => 
          Object.keys(rows[0]).some(k => k.toLowerCase().trim() === col.toLowerCase())
        );

        if (!hasRequiredColumns) {
          toast.error(`Excel must have required column: name`);
          return;
        }

        // Normalize column names (handle different cases)
        const normalizedRows = rows.map(row => {
          const normalizedRow = {};
          allColumns.forEach(col => {
            const matchingKey = Object.keys(row).find(k => k.toLowerCase().trim() === col.toLowerCase());
            normalizedRow[col] = matchingKey ? row[matchingKey] : '';
          });
          return normalizedRow;
        });

        setImportData(normalizedRows);
        setShowImport(true);
        toast.success(`${rows.length} rows ready to import`);
      } catch (err) {
        toast.error('Failed to parse Excel file');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!importData) return;
    
    setImporting(true);
    try {
      const res = await axios.post('/api/members/import/bulk', { members: importData });
      
      if (res.data.success > 0) {
        toast.success(`${res.data.success} members imported successfully`);
      }
      if (res.data.failed > 0) {
        const errors = res.data.errors.slice(0, 3).map(e => `Row ${e.row}: ${e.message}`).join('; ');
        toast.error(`${res.data.failed} failed to import. ${errors}${res.data.errors.length > 3 ? '...' : ''}`);
      }

      setImportData(null);
      setShowImport(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="master-root">
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{members.length}</div>
            <div className="stat-label">Total Members</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="btn-primary add-btn" onClick={() => { cancelForm(); setShowForm(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Member
          </button>
          <button className="btn-secondary" onClick={() => setShowImport(true)} title="Import from Excel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="19" x2="12" y2="5"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
            </svg>
            Import Excel
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="form-card animate-in">
          <div className="form-header">
            <h3>{editId ? 'Edit Member' : 'Add New Member'}</h3>
            <button className="close-btn" onClick={cancelForm}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="member-form">
            <div className="form-grid">
              <div className="field">
                <label>Full Name *</label>
                <input type="text" placeholder="e.g. Rahul Sharma" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Course *</label>
                <input type="text" placeholder="e.g. B.Tech, BCA, MBA" value={form.course}
                  onChange={e => setForm(f => ({ ...f, course: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Year *</label>
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required>
                  <option value="">Select Year</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Semester *</label>
                <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} required>
                  <option value="">Select Semester</option>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Enrollment No. *</label>
                <input type="text" placeholder="e.g. 2021CS001" value={form.enrollment_no}
                  onChange={e => setForm(f => ({ ...f, enrollment_no: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Admission No. *</label>
                <input type="text" placeholder="e.g. ADM2021001" value={form.admission_no}
                  onChange={e => setForm(f => ({ ...f, admission_no: e.target.value.toUpperCase() }))} required />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={cancelForm}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="spinner-sm" /> : null}
                {editId ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search by name, enrollment or admission no..." value={search}
              onChange={e => setSearch(e.target.value)} className="search-input" />
            {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
          </div>
        </div>

        {fetching ? (
          <div className="loading-rows">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-row" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <p>{search ? 'No members match your search' : 'No members yet'}</p>
            {!search && <button className="btn-primary" onClick={() => setShowForm(true)}>Add First Member</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Semester</th>
                  <th>Enrollment No.</th>
                  <th>Admission No.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id}>
                    <td className="row-num">{i + 1}</td>
                    <td className="name-cell">
                      <div className="member-avatar">{m.name[0]}</div>
                      {m.name}
                    </td>
                    <td><span className="badge course">{m.course}</span></td>
                    <td>{m.year}</td>
                    <td>{m.semester}</td>
                    <td className="mono">{m.enrollment_no}</td>
                    <td className="mono">{m.admission_no}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn edit" onClick={() => handleEdit(m)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="icon-btn delete" onClick={() => setDeleteConfirm(m.id)} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon danger">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3>Delete Member?</h3>
            <p>This will permanently remove the member and all their attendance records.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="modal-backdrop" onClick={() => !importing && setShowImport(false)}>
          <div className="modal import-modal" onClick={e => e.stopPropagation()}>
            {!importData ? (
              <>
                <h3>Import Members from Excel</h3>
                <p className="import-info"><strong>Required columns:</strong> name, enrollment_no, admission_no</p>
                <p className="import-info"><strong>Optional columns:</strong> course, year, semester (can be left blank)</p>
                <div className="required-columns">
                  <code>name, course, year, enrollment_no, semester, admission_no</code>
                </div>
                <label className="file-input-label">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Click to select Excel file
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={importing} style={{display: 'none'}} />
                </label>
                <button className="btn-ghost" onClick={() => setShowImport(false)}>Cancel</button>
              </>
            ) : (
              <>
                <h3>Preview Import Data</h3>
                <p className="import-info">{importData.length} members ready to import</p>
                <div className="import-preview">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Course</th>
                        <th>Year</th>
                        <th>Semester</th>
                        <th>Enrollment No.</th>
                        <th>Admission No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 5).map((m, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{m.name}</td>
                          <td>{m.course}</td>
                          <td>{m.year}</td>
                          <td>{m.semester}</td>
                          <td className="mono">{m.enrollment_no}</td>
                          <td className="mono">{m.admission_no}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.length > 5 && <p style={{fontSize: '12px', color: '#666', marginTop: '8px'}}>... and {importData.length - 5} more</p>}
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={() => setImportData(null)} disabled={importing}>Back</button>
                  <button className="btn-primary" onClick={handleImport} disabled={importing}>
                    {importing ? <span className="spinner-sm" /> : null}
                    Import {importData.length} Members
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
