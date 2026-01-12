import { useCallback, useEffect, useMemo, useState } from 'react';
import { DerivedTask, Metrics, Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
  withDerived,
  sortTasks,
} from '@/utils/logic';
import { generateSalesTasks } from '@/utils/seed';

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  lastDeleted: Task | null;
  addTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  clearLastDeleted: () => void;
}

const INITIAL_METRICS: Metrics = {
  totalRevenue: 0,
  totalTimeTaken: 0,
  timeEfficiencyPct: 0,
  revenuePerHour: 0,
  averageROI: 0,
  performanceGrade: 'Needs Improvement',
};

export function useTasks(): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);

  // ✅ SINGLE, SAFE FETCH
  useEffect(() => {
    let mounted = true;

    async function loadTasks() {
      try {
        const res = await fetch('/tasks.json');
        const data = res.ok ? await res.json() : [];
        const normalized: Task[] = Array.isArray(data) ? data : [];
        const safeData = normalized.length ? normalized : generateSalesTasks(50);
        if (mounted) setTasks(safeData);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Failed to load tasks');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTasks();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ STABLE DERIVED SORTING
  const derivedSorted = useMemo<DerivedTask[]>(() => {
    return sortTasks(tasks.map(withDerived));
  }, [tasks]);

  // ✅ SAFE METRICS
  const metrics = useMemo<Metrics>(() => {
    if (!tasks.length) return INITIAL_METRICS;
    const averageROI = computeAverageROI(tasks);
    return {
      totalRevenue: computeTotalRevenue(tasks),
      totalTimeTaken: tasks.reduce((s, t) => s + t.timeTaken, 0),
      timeEfficiencyPct: computeTimeEfficiency(tasks),
      revenuePerHour: computeRevenuePerHour(tasks),
      averageROI,
      performanceGrade: computePerformanceGrade(averageROI),
    };
  }, [tasks]);

  // ✅ CRUD
  const addTask = useCallback((task: Omit<Task, 'id'> & { id?: string }) => {
    setTasks(prev => [
      ...prev,
      {
        ...task,
        id: task.id ?? crypto.randomUUID(),
        timeTaken: task.timeTaken > 0 ? task.timeTaken : 1,
        createdAt: new Date().toISOString(),
        completedAt: task.status === 'Done' ? new Date().toISOString() : undefined,
      },
    ]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        if (next.timeTaken <= 0) next.timeTaken = 1;
        if (t.status !== 'Done' && next.status === 'Done') {
          next.completedAt = new Date().toISOString();
        }
        return next;
      })
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) || null;
      setLastDeleted(target);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks(prev => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  const clearLastDeleted = useCallback(() => {
    setLastDeleted(null);
  }, []);

  return {
    tasks,
    loading,
    error,
    derivedSorted,
    metrics,
    lastDeleted,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
    clearLastDeleted,
  };
}
