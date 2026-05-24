import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Attendance.css';

export default function Attendance() {
  const [members, setMembers] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventName, setEventName] = useState('');
  const [search, setSearch] = useState('');
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/members');
      const mList = res.data;
      setMembers(mList);
      setAttendance(prev => {
        const next = { ...prev };
        mList.forEach(m => { if (!(m.id in next)) next[m.id] = false; });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.enrollment_no.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    const next = {};
    filteredMembers.forEach(m => { next[m.id] = newVal; });
    setAttendance(prev => ({ ...prev, ...next }));
  };

  const handleSave = async () => {
    if (!eventName.trim()) { toast.error('Please enter an event name'); return; }
    if (!date) { toast.error('Please select a date'); return; }
    if (members.length === 0) { toast.error('No members to save attendance for'); return; }

    setSaving(true);
    try {
      const attendanceList = members.map(m => ({ member_id: m.id, present: attendance[m.id] || false }));
      await axios.post('/api/attendance/save', { date, event_name: eventName.trim(), attendance: attendanceList });
      toast.success('Attendance saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = filteredMembers.filter(m => attendance[m.id]).length;
  const absentCount = filteredMembers.length - presentCount;

  return (
    <div className="attendance-root">
      {/* Config card */}
      <div className="config-card animate-in">
        <h3 className="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Session Details
        </h3>
        <div className="config-grid">
          <div className="field">
            <label>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Event Name *</label>
            <input type="text" placeholder="e.g. Morning Assembly, Tech Fest, Regular Class"
              value={eventName} onChange={e => setEventName(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="att-stats">
        <div className="att-stat green">
          <div className="att-stat-num">{presentCount}</div>
          <div className="att-stat-label">Present</div>
        </div>
        <div className="att-stat red">
          <div className="att-stat-num">{absentCount}</div>
          <div className="att-stat-label">Absent</div>
        </div>
        <div className="att-stat purple">
          <div className="att-stat-num">{filteredMembers.length}</div>
          <div className="att-stat-label">Total</div>
        </div>
        <div className="att-stat blue">
          <div className="att-stat-num">
            {filteredMembers.length ? Math.round((presentCount / filteredMembers.length) * 100) : 0}%
          </div>
          <div className="att-stat-label">Attendance</div>
        </div>
      </div>

      {/* Member list */}
      <div className="members-card animate-in">
        <div className="members-toolbar">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search members..." value={search}
              onChange={e => setSearch(e.target.value)} className="search-input" />
          </div>
          <div className="toolbar-right">
            <button className="select-all-btn" onClick={toggleAll}>
              {selectAll ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg> Deselect All</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <polyline points="9 11 12 14 22 4"/>
                </svg> Select All</>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-rows" style={{padding:'16px 20px'}}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-row" />)}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <p>{search ? 'No members match search' : 'No members found. Add members in Master tab.'}</p>
          </div>
        ) : (
          <div className="checklist">
            {filteredMembers.map(m => (
              <div
                key={m.id}
                className={`checklist-item ${attendance[m.id] ? 'present' : 'absent'}`}
                onClick={() => toggleMember(m.id)}
              >
                <div className={`checkbox ${attendance[m.id] ? 'checked' : ''}`}>
                  {attendance[m.id] && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div className="checklist-avatar">{m.name[0]}</div>
                <div className="checklist-info">
                  <div className="checklist-name">{m.name}</div>
                  <div className="checklist-meta">
                    <span>{m.enrollment_no}</span>
                    <span className="dot">·</span>
                    <span>{m.course}</span>
                    <span className="dot">·</span>
                    <span>{m.year}</span>
                  </div>
                </div>
                <div className={`status-badge ${attendance[m.id] ? 'present-badge' : 'absent-badge'}`}>
                  {attendance[m.id] ? 'Present' : 'Absent'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="save-row">
        <button className="save-btn" onClick={handleSave} disabled={saving || members.length === 0}>
          {saving ? <><span className="spinner-sm" /> Saving...</> : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg> Save Attendance</>
          )}
        </button>
      </div>
    </div>
  );
}
