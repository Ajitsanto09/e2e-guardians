import React, { useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks';
import { fetchIncidents, fetchIncidentDetail, clearSelected } from '../features/incidents/incidentsSlice';
import { fetchLeaderboard, setPeriod } from '../features/leaderboard/leaderboardSlice';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <header className="header">
        <div className="brand" onClick={() => (window.location.href = '/')}>E2E Guardians</div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Incidents
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Leaderboard
          </NavLink>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

function IncidentsPage() {
  const dispatch = useAppDispatch();
  const { list, listStatus } = useAppSelector((s) => s.incidents);

  useEffect(() => {
    dispatch(fetchIncidents());
  }, [dispatch]);

  return (
    <div>
      <h1>Incidents</h1>
      <p className="muted">Showing Slack-detected E2E failures (local JSON storage)</p>
      {listStatus === 'loading' ? <p>Loading…</p> : null}
      <div className="grid">
        {list.map((i) => (
          <a key={i.id} className="card" href={`/incident/${i.id}`}>
            <div className="row">
              <span className={`badge ${i.status}`}>{i.status}</span>
              <span className="muted">{new Date(i.createdAt).toLocaleString()}</span>
            </div>
            <h3>{i.app ?? 'unknown app'} {i.env ? `(${i.env})` : ''}</h3>
            <p className="muted">{i.pipelineName ?? 'pipeline unknown'}</p>
            {i.failingTests?.length ? (
              <p><strong>Failing:</strong> {i.failingTests[0]}{i.failingTests.length > 1 ? ` +${i.failingTests.length - 1} more` : ''}</p>
            ) : (
              <p className="muted">No failing test names parsed (yet)</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function IncidentDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const sel = useAppSelector((s) => s.incidents.selected);
  const status = useAppSelector((s) => s.incidents.selectedStatus);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchIncidentDetail(id));
    return () => {
      dispatch(clearSelected());
    };
  }, [dispatch, id]);

  if (!id) return <p>Missing incident id</p>;
  if (status === 'loading' || !sel) return <p>Loading…</p>;

  const { incident, activities } = sel;

  return (
    <div>
      <a className="link" href="/">← Back</a>
      <div className="card">
        <div className="row">
          <span className={`badge ${incident.status}`}>{incident.status}</span>
          <span className="muted">Updated {new Date(incident.updatedAt).toLocaleString()}</span>
        </div>
        <h1>{incident.app ?? 'unknown app'} {incident.env ? `(${incident.env})` : ''}</h1>
        <p className="muted">{incident.pipelineName ?? 'pipeline unknown'}</p>
        {incident.pipelineLink ? (
          <p><a className="link" href={incident.pipelineLink} target="_blank" rel="noreferrer">Open pipeline</a></p>
        ) : null}

        {incident.failingTests?.length ? (
          <div>
            <h3>Failing tests</h3>
            <ul>
              {incident.failingTests.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ) : null}

        {incident.jiraLinks?.length ? (
          <div>
            <h3>Jira links</h3>
            <ul>
              {incident.jiraLinks.map((u) => (
                <li key={u}><a className="link" href={u} target="_blank" rel="noreferrer">{u}</a></li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted">No Jira links captured yet. Post a Jira URL in the Slack thread.</p>
        )}
      </div>

      <h2>Activity</h2>
      <div className="card">
        {activities.length === 0 ? (
          <p className="muted">No activity yet. Reply in the Slack thread or react with 👀/✅/🛠.</p>
        ) : (
          <ul className="timeline">
            {activities.map((a) => (
              <li key={a.id}>
                <div className="row">
                  <span className="mono">{a.userId}</span>
                  <span className="muted">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <div><strong>{a.type}</strong> {a.text ? <span className="muted">— {a.text}</span> : null}</div>
                {a.meta?.jiraUrl ? (
                  <div><a className="link" href={a.meta.jiraUrl} target="_blank" rel="noreferrer">{a.meta.jiraUrl}</a></div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LeaderboardPage() {
  const dispatch = useAppDispatch();
  const { period, periodKey, rows, status } = useAppSelector((s) => s.leaderboard);

  useEffect(() => {
    dispatch(fetchLeaderboard(period));
  }, [dispatch, period]);

  return (
    <div>
      <h1>Leaderboard</h1>
      <div className="row">
        <button className={period === 'week' ? 'btn active' : 'btn'} onClick={() => dispatch(setPeriod('week'))}>This week</button>
        <button className={period === 'month' ? 'btn active' : 'btn'} onClick={() => dispatch(setPeriod('month'))}>This month</button>
        <span className="muted">{periodKey ? `Period: ${periodKey}` : ''}</span>
      </div>
      {status === 'loading' ? <p>Loading…</p> : null}
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted">No scores yet — react/comment on incidents in Slack to start earning points.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Points</th>
                <th>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.userId}>
                  <td>{idx + 1}</td>
                  <td className="mono">{r.userId}</td>
                  <td><strong>{r.points}</strong></td>
                  <td className="muted">
                    {Object.entries(r.breakdown).map(([k, v]) => `${k}:${v}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted">
        Tip: you can later resolve Slack user IDs to display names by calling Slack API from the backend.
      </p>
    </div>
  );
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<IncidentsPage />} />
        <Route path="/incident/:id" element={<IncidentDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </Layout>
  );
}
