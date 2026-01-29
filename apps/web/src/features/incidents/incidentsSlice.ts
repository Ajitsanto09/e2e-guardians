import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Incident, Activity } from './types';

export const fetchIncidents = createAsyncThunk('incidents/fetchList', async (status?: string) => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`/api/incidents${qs}`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return (await res.json()) as Incident[];
});

export const fetchIncidentDetail = createAsyncThunk('incidents/fetchDetail', async (id: string) => {
  const res = await fetch(`/api/incidents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch incident detail');
  return (await res.json()) as { incident: Incident; activities: Activity[] };
});

type State = {
  list: Incident[];
  listStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  selected?: { incident: Incident; activities: Activity[] };
  selectedStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
};

const initialState: State = {
  list: [],
  listStatus: 'idle',
  selectedStatus: 'idle',
};

const slice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    clearSelected(state) {
      state.selected = undefined;
      state.selectedStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncidents.pending, (state) => {
        state.listStatus = 'loading';
      })
      .addCase(fetchIncidents.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchIncidents.rejected, (state, action) => {
        state.listStatus = 'failed';
        state.error = action.error.message;
      })
      .addCase(fetchIncidentDetail.pending, (state) => {
        state.selectedStatus = 'loading';
      })
      .addCase(fetchIncidentDetail.fulfilled, (state, action) => {
        state.selectedStatus = 'succeeded';
        state.selected = action.payload;
      })
      .addCase(fetchIncidentDetail.rejected, (state, action) => {
        state.selectedStatus = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { clearSelected } = slice.actions;
export const incidentsReducer = slice.reducer;
