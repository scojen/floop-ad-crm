import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './layouts/AppShell';
import { AutomationsPage } from './pages/AutomationsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { InboxPage } from './pages/InboxPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { MyDayPage } from './pages/MyDayPage';
import { PipelinePage } from './pages/PipelinePage';
import { PlanningPage } from './pages/PlanningPage';
import { BriefEditorPage } from './pages/BriefEditorPage';
import { ReportsPage } from './pages/ReportsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/campaigns" replace />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/leads/:leadId" element={<LeadDetailPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/planning/:briefId" element={<BriefEditorPage />} />
          <Route path="/my-day" element={<MyDayPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
