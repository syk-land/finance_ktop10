import React, { useEffect, useState, useRef } from 'react';

export default function NotificationToast() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const displayedIdsRef = useRef(new Set());

  useEffect(() => {
    // Request system desktop notification permissions on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchNotifications = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5005/api/notifications');
        if (!res.ok) return;
        const alerts = await res.json();

        // Detect newly generated alerts by matching against previous IDs
        const newAlerts = alerts.filter(alert => !displayedIdsRef.current.has(alert.id));

        if (newAlerts.length > 0) {
          // Add to system notifications
          newAlerts.forEach(alert => {
            displayedIdsRef.current.add(alert.id);
            
            // Trigger OS Desktop push notification if allowed
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('K-TOP 10 주가 급변 알림', {
                body: alert.message,
                icon: '/favicon.svg'
              });
            }
          });

          // Concat new alerts to the toast list
          setActiveAlerts(prev => [...newAlerts, ...prev].slice(0, 5));

          // Set 7-second timer to fade out and delete each new alert
          newAlerts.forEach(alert => {
            setTimeout(() => {
              setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
            }, 7000);
          });
        }
      } catch (err) {
        console.warn('[NotificationToast] Pull failed:', err.message);
      }
    };

    // Initial pull
    fetchNotifications();

    // Poll backend every 10 seconds for real-time 5% alerts
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const removeAlert = (id) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <div className="notification-toast-container">
      {activeAlerts.map(alert => (
        <div key={alert.id} className="notification-toast glass-panel">
          <div className="toast-content">
            <span className="toast-icon">🚨</span>
            <div className="toast-body">
              <div className="toast-title">{alert.companyName} 주가 급변</div>
              <div className="toast-desc">{alert.message}</div>
            </div>
            <button className="toast-close-btn" onClick={() => removeAlert(alert.id)}>✕</button>
          </div>
          <div className="toast-progress-bar"></div>
        </div>
      ))}
    </div>
  );
}
