// frontend/src/components/Admin/StatusBadge.js
import React from 'react';

const StatusBadge = ({ status, label }) => {
  const colors = {
    active: 'green',
    inactive: 'gray',
    paid: 'green',
    pending: 'orange',
    failed: 'red',
    completed: 'green',
    processing: 'blue',
  };
  return (
    <span className={`status-badge ${colors[status] || 'gray'}`}>
      {label || status}
    </span>
  );
};

export default StatusBadge;