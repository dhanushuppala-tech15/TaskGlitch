import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { DerivedTask, Task } from '@/types';
import TaskForm from './TaskForm';
import TaskDetailsDialog from './TaskDetailsDialog';

interface Props {
  tasks: DerivedTask[];
  onAdd: (payload: Omit<Task, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export default function TaskTable({ tasks, onAdd, onUpdate, onDelete }: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [details, setDetails] = useState<Task | null>(null);

  const existingTitles = useMemo(() => tasks.map(t => t.title), [tasks]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Tasks
          </Typography>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenForm(true)}>
            Add Task
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell align="right">ROI</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {tasks.map(t => (
                <TableRow key={t.id} hover onClick={() => setDetails(t)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography fontWeight={600}>{t.title}</Typography>
                    {t.notes && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {t.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">${t.revenue.toLocaleString()}</TableCell>
                  <TableCell align="right">{t.timeTaken}</TableCell>
                  <TableCell align="right">{t.roi == null ? '—' : t.roi.toFixed(2)}</TableCell>
                  <TableCell>{t.priority}</TableCell>
                  <TableCell>{t.status}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            setEditing(t);
                            setOpenForm(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(t.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!tasks.length && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box py={6} textAlign="center" color="text.secondary">
                      No tasks yet.
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <TaskForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={value =>
          value.id ? onUpdate(value.id, value) : onAdd(value as Omit<Task, 'id'>)
        }
        existingTitles={existingTitles}
        initial={editing}
      />

      <TaskDetailsDialog open={!!details} task={details} onClose={() => setDetails(null)} onSave={onUpdate} />
    </Card>
  );
}
