import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { dbAll, dbRun } from '../database';
import { syncAPI } from '../services/api';

let NetInfo = null;
let AsyncStorage = null;

// Safely load native-only modules
if (Platform.OS !== 'web') {
  try { NetInfo = require('@react-native-community/netinfo').default; } catch (e) {}
  try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}
}

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    const initialize = async () => {
      try {
        await loadLastSyncTime();
        if (Platform.OS !== 'web' && isMounted) {
          await refreshPendingCount();
        }
      } catch (e) {
        console.log('Sync init check:', e.message);
      }
    };

    initialize();

    if (Platform.OS !== 'web' && NetInfo) {
      unsubscribe = NetInfo.addEventListener(state => {
        const online = state.isConnected && state.isInternetReachable !== false;
        setIsOnline(online);
        if (online && isMounted && pendingCount > 0) {
          triggerSync();
        }
      });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loadLastSyncTime = async () => {
    try {
      if (AsyncStorage) {
        const t = await AsyncStorage.getItem('lastSyncTime');
        setLastSyncTime(t);
      }
    } catch (e) {}
  };

  const refreshPendingCount = async () => {
    if (Platform.OS === 'web') return;
    try {
      const rows = await dbAll(
        `SELECT COUNT(*) as cnt FROM sync_queue WHERE sync_status IN ('pending','failed')`
      );
      setPendingCount(rows[0]?.cnt || 0);
    } catch (e) {}
  };

  const enqueue = async (userId, recordId, operationType, tableName, payload) => {
    if (Platform.OS === 'web') return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO sync_queue 
        (id, user_id, record_id, operation_type, table_name, local_timestamp, updated_timestamp, sync_status, retry_count, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [id, userId, recordId, operationType, tableName, now, now, JSON.stringify(payload)]
    );
    await refreshPendingCount();
  };

  const triggerSync = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const pending = await dbAll(
        `SELECT * FROM sync_queue WHERE sync_status IN ('pending','failed') AND retry_count < 5 ORDER BY local_timestamp ASC LIMIT 50`
      );
      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      const items = pending.map(row => ({
        ...row,
        payload: JSON.parse(row.payload),
      }));

      const response = await syncAPI.push({ operations: items });
      const results = response.data.results || [];

      for (const result of results) {
        if (result.success) {
          await dbRun(
            `UPDATE sync_queue SET sync_status='synced', updated_at=datetime('now') WHERE id=?`,
            [result.id]
          );
        } else if (result.conflict) {
          await dbRun(
            `UPDATE sync_queue SET sync_status='conflict', updated_at=datetime('now') WHERE id=?`,
            [result.id]
          );
        } else {
          await dbRun(
            `UPDATE sync_queue SET sync_status='failed', retry_count=retry_count+1, error_message=?, updated_at=datetime('now') WHERE id=?`,
            [result.error || 'Unknown error', result.id]
          );
        }
      }

      const now = new Date().toISOString();
      if (AsyncStorage) {
        await AsyncStorage.setItem('lastSyncTime', now);
      }
      setLastSyncTime(now);
      await refreshPendingCount();
    } catch (e) {
      console.log('Sync error:', e.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  return (
    <SyncContext.Provider value={{
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncTime,
      enqueue,
      triggerSync,
      refreshPendingCount,
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};
