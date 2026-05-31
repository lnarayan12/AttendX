import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Event.css';

export default function Event() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);

  const getTodayISO = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

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

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const dbDate = toDbDate(dateStr);
    const d = new Date(dbDate + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  };

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(fromDbDate(getTodayISO()));
  const [search, setSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/members', { headers });
      setMembers(res.data);
    } catch (err) {
      toast.error('Failed to fetch members');
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/events', { headers });
      setEvents(res.data);
    } catch (err) {
      toast.error('Failed to fetch events');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchEvents();
  }, [fetchMembers, fetchEvents]);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.enrollment_no.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id) => {
    setSelectedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    const next = {};
    filteredMembers.forEach(m => { next[m.id] = newVal; });
    setSelectedMembers(prev => ({ ...prev, ...next }));
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    try {
      console.info('[Event] Form submit triggered. Name:', eventName, 'Date:', eventDate);

      if (!eventName || !eventName.trim()) { toast.error('Event name is required'); return; }
      if (!eventDate) { toast.error('Event date is required'); return; }

      setSaving(true);
      const memberIds = Object.keys(selectedMembers)
        .filter(id => selectedMembers[id])
        .map(Number);

      const dbDate = toDbDate(eventDate);
      const payload = { name: eventName, date: dbDate, memberIds };
      console.info('[Event] Submitting payload:', payload);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (editingEvent) {
        const res = await axios.put(`/api/events/${editingEvent.id}`, { name: eventName, memberIds }, { headers });
        console.info('[Event] PUT response:', res.data);
        toast.success('Event updated');
      } else {
        const res = await axios.post('/api/events', payload, { headers });
        console.info('[Event] POST response:', res.data);
        toast.success('Event created');
      }

      cancelForm();
      fetchEvents();
    } catch (err) {
      console.error('[Event] Error:', err);
      console.error('[Event] Response status:', err.response?.status);
      console.error('[Event] Response data:', err.response?.data);
      const msg = err.response?.data?.error || err.message || 'Failed to save event';
      toast.error(`Error ${err.response?.status || ''}: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventName(event.name);
    setEventDate(fromDbDate(event.date));
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(`/api/events/${event.id}`, { headers }).then(res => {
      const memberMap = {};
      res.data.members.forEach(m => { memberMap[m.id] = true; });
      setSelectedMembers(memberMap);
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`/api/events/${deleteConfirm}`, { headers });
      toast.success('Event deleted');
      fetchEvents();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const cancelForm = () => {
    setEventName('');
    setEventDate(fromDbDate(getTodayISO()));
    setSelectedMembers({});
    setSelectAll(false);
    setShowForm(false);
    setEditingEvent(null);
  };

  return (
    <div className="event-root">
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
          </div>
          <div>
            <div className="stat-value">{events.length}</div>
            <div className="stat-label">Total Events</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-primary add-btn" onClick={() => { cancelForm(); setShowForm(true); }} disabled={showForm}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Event
          </button>
        </div>
      </div>

      {/* Create/Edit Event Form */}
      {showForm && (
        <div className="modal-backdrop" onClick={cancelForm}>
          <div className="modal event-modal" onClick={e => e.stopPropagation()}>
            <div className="form-header">
              <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button className="close-btn" onClick={cancelForm}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="event-form">
            <div className="form-grid">
              <div className="field">
                <label>Event Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Sports Day"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Event Date *</label>
                <div className="date-input-container">
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY (e.g. 31-05-2026)"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    required
                    disabled={!!editingEvent}
                  />
                  <div className="picker-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input 
                      type="date" 
                      value={toDbDate(eventDate)}
                      onChange={e => {
                        if (e.target.value) {
                          setEventDate(fromDbDate(e.target.value));
                        }
                      }}
                      disabled={!!editingEvent}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{marginTop: '20px'}}>
              <label style={{marginBottom: '12px', display: 'block', fontWeight: '600'}}>Assign Members</label>
              <div className="search-wrap">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search members..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && <button type="button" className="clear-search" onClick={() => setSearch('')}>✕</button>}
              </div>

              <div style={{marginTop: '10px', marginBottom: '12px'}}>
                <label className="checkbox-item">
                  <input type="checkbox" checked={selectAll} onChange={toggleAll} />
                  <span>Select All ({filteredMembers.length})</span>
                </label>
              </div>

              <div className="members-list">
                {filteredMembers.map(m => (
                  <label key={m.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedMembers[m.id] || false}
                      onChange={() => toggleMember(m.id)}
                    />
                    <span>{m.name} ({m.enrollment_no})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions" style={{marginTop: '20px'}}>
              <button type="button" className="btn-ghost" onClick={cancelForm}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <span className="spinner-sm" /> : null}
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Events List */}
      <div className="table-card">
        <div className="table-toolbar">
          <h3 style={{margin: 0}}>Events</h3>
        </div>

        {fetching ? (
          <div className="loading-rows">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-row" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No events yet</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Create First Event</button>
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td style={{fontWeight: 700}}>{event.name}</td>
                    <td>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:'5px',
                        padding:'3px 10px', borderRadius:'20px', fontSize:'12px',
                        fontWeight:700, fontFamily:"'Space Mono',monospace",
                        background:'var(--violet-100)', color:'var(--violet-700)',
                        border:'1px solid var(--violet-200)'
                      }}>
                        {formatDisplayDate(event.date)}
                      </span>
                    </td>
                    <td><span className="badge purple">{event.memberCount || 0} members</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn edit" onClick={() => handleEditEvent(event)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                         <button className="icon-btn delete" onClick={() => handleDeleteClick(event.id)} title="Delete">
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
            <h3>Delete Event?</h3>
            <p>This will permanently remove the event and all its associated attendance records.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
