import { configureStore } from '@reduxjs/toolkit';
import { incidentsReducer } from '../features/incidents/incidentsSlice';
import { leaderboardReducer } from '../features/leaderboard/leaderboardSlice';

export const store = configureStore({
  reducer: {
    incidents: incidentsReducer,
    leaderboard: leaderboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
