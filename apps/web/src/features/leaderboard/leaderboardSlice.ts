import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export type LeaderRow = {
  userId: string;
  periodKey: string;
  points: number;
  breakdown: Record<string, number>;
  updatedAt: string;
};

export const fetchLeaderboard = createAsyncThunk('leaderboard/fetch', async (period: 'week' | 'month') => {
  const res = await fetch(`/api/leaderboard?period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return (await res.json()) as { periodKey: string; rows: LeaderRow[] };
});

type State = {
  period: 'week' | 'month';
  periodKey?: string;
  rows: LeaderRow[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
};

const initialState: State = {
  period: 'week',
  rows: [],
  status: 'idle',
};

const slice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    setPeriod(state, action: { payload: 'week' | 'month' }) {
      state.period = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboard.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.periodKey = action.payload.periodKey;
        state.rows = action.payload.rows;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { setPeriod } = slice.actions;
export const leaderboardReducer = slice.reducer;
