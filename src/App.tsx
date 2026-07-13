import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './layouts/AppShell';
import { CampaignsPage } from './pages/CampaignsPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { ConnectionsPage } from './pages/ConnectionsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/campaigns" replace />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route
            path="/inbox"
            element={
              <ComingSoonPage
                title="Inbox — unworked leads"
                phase="Phase 2"
                description="Shared triage queue, oldest unclaimed first."
              />
            }
          />
          <Route
            path="/pipeline"
            element={
              <ComingSoonPage
                title="Pipeline"
                phase="Phase 3"
                description="Kanban board with claim state and aging indicators."
              />
            }
          />
          <Route
            path="/my-day"
            element={
              <ComingSoonPage
                title="My Day"
                phase="Phase 4"
                description="Overdue and due-today follow-ups, sorted by urgency."
              />
            }
          />
          <Route
            path="/reports"
            element={
              <ComingSoonPage
                title="Reports"
                phase="Phase 4"
                description="Funnel, cost per qualified lead, creative performance."
              />
            }
          />
          <Route
            path="/automations"
            element={
              <ComingSoonPage
                title="Automations"
                phase="Phase 4"
                description="Single-condition when-X-do-Y rules with a runs log."
              />
            }
          />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
