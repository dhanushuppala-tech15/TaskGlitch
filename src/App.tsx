import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import MetricsBar from '@/components/MetricsBar';
import TaskTable from '@/components/TaskTable';
import UndoSnackbar from '@/components/UndoSnackbar';
import ChartsDashboard from '@/components/ChartsDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ActivityLog, { ActivityItem } from '@/components/ActivityLog';

import { UserProvider, useUser } from '@/context/UserContext';
import { TasksProvider, useTasksContext } from '@/context/TasksContext';

import { downloadCSV, toCSV } from '@/utils/csv';
import type { Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
} from '@/utils/logic';

function AppContent() {
  const {
    loading,
    error,
    derivedSorted,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
    clearLastDeleted,
    lastDeleted,
  } = useTasksContext();

  const { user } = useUser();

  // 🔎 Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // 📝 Activity log
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const createActivity = useCallback(
    (type: ActivityItem['type'], summary: string): ActivityItem => ({
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ts: Date.now(),
      type,
      summary,
    }),
    []
  );

  // ✅ Stable filtered tasks
  const filteredTasks = useMemo(() => {
    return derivedSorted.filter(task => {
      if (query && !task.title.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'All' && task.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [derivedSorted, query, statusFilter, priorityFilter]);

  // ➕ Add
  const handleAdd = useCallback(
    (payload: Omit<Task, 'id'>) => {
      addTask(payload);
      setActivity(prev => [
        createActivity('add', `Added task: ${payload.title}`),
        ...prev,
      ].slice(0, 50));
    },
    [addTask, createActivity]
  );

  // ✏️ Update
  const handleUpdate = useCallback(
    (id: string, patch: Partial<Task>) => {
      updateTask(id, patch);
      setActivity(prev => [
        createActivity('update', `Updated task: ${id}`),
        ...prev,
      ].slice(0, 50));
    },
    [updateTask, createActivity]
  );

  // 🗑 Delete
  const handleDelete = useCallback(
    (id: string) => {
      deleteTask(id);
      setActivity(prev => [
        createActivity('delete', `Deleted task: ${id}`),
        ...prev,
      ].slice(0, 50));
    },
    [deleteTask, createActivity]
  );

  // ↩️ Undo delete
  const handleUndo = useCallback(() => {
    undoDelete();
    setActivity(prev => [
      createActivity('undo', 'Undo delete'),
      ...prev,
    ].slice(0, 50));
  }, [undoDelete, createActivity]);

  // ✅ Snackbar close = CLEAR lastDeleted (BUG 2 FIX)
  const handleCloseUndo = useCallback(() => {
    clearLastDeleted();
  }, [clearLastDeleted]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight={700} gutterBottom>
                TaskGlitch
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Welcome back, {user.name.split(' ')[0]}.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                onClick={() => {
                  const csv = toCSV(filteredTasks);
                  downloadCSV('tasks.csv', csv);
                }}
              >
                Export CSV
              </Button>
              <Avatar sx={{ width: 40, height: 40 }}>
                {user.name.charAt(0)}
              </Avatar>
            </Stack>
          </Stack>

          {/* Loading / Error */}
          {loading && (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {/* Metrics */}
          {!loading && !error && (
            <MetricsBar
              metricsOverride={{
                totalRevenue: computeTotalRevenue(filteredTasks),
                totalTimeTaken: filteredTasks.reduce((s, t) => s + t.timeTaken, 0),
                timeEfficiencyPct: computeTimeEfficiency(filteredTasks),
                revenuePerHour: computeRevenuePerHour(filteredTasks),
                averageROI: computeAverageROI(filteredTasks),
                performanceGrade: computePerformanceGrade(
                  computeAverageROI(filteredTasks)
                ),
              }}
            />
          )}

          {/* Filters */}
          {!loading && !error && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                placeholder="Search by title"
                value={query}
                onChange={e => setQuery(e.target.value)}
                fullWidth
              />
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Todo">Todo</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Done">Done</MenuItem>
              </Select>
              <Select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="All">All Priorities</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </Stack>
          )}

          {/* Task Table */}
          {!loading && !error && (
            <TaskTable
              tasks={filteredTasks}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}

          {!loading && !error && <ChartsDashboard tasks={filteredTasks} />}
          {!loading && !error && <AnalyticsDashboard tasks={filteredTasks} />}
          {!loading && !error && <ActivityLog items={activity} />}

          {/* Undo Snackbar */}
          <UndoSnackbar
            open={!!lastDeleted}
            onUndo={handleUndo}
            onClose={handleCloseUndo}
          />
        </Stack>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <UserProvider>
      <TasksProvider>
        <AppContent />
      </TasksProvider>
    </UserProvider>
  );
}
