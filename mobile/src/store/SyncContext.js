import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { dbAll, dbRun } from '../database';
import { syncAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await loadLastSyncTime();
        if (isMounted) {
          await refreshPendingCount();
        }
      } catch (e) {
        console.log('Sync init check:', e.message);
      }
    };

    initialize();

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online && isMounted && pendingCount > 0) {
        triggerSync();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loadLastSyncTime = async () => {
    const t = await AsyncStorage.getItem('lastSyncTime');
    setLastSyncTime(t);
  };

  const refreshPendingCount = async () => {
    try {
      const rows = await dbAll(
        `SELECT COUNT(*) as cnt FROM sync_queue WHERE sync_status IN ('pending','failed')`
      );
      setPendingCount(rows[0]?.cnt || 0);
    } catch (e) {}
  };

  const enqueue = async (userId, recordId, operationType, tableName, payload) => {
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
      await AsyncStorage.setItem('lastSyncTime', now);
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

