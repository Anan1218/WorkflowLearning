import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { EvalsPage } from "./features/evals/EvalsPage";
import { ExtractPage } from "./features/extract/ExtractPage";
import { PipelinePage } from "./features/pipeline/PipelinePage";
import { ReviewDetailPage } from "./features/review/ReviewDetailPage";
import { ReviewPage } from "./features/review/ReviewPage";
import { SourcesPage } from "./features/sources/SourcesPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/extract" replace />} />
        <Route path="/extract" element={<ExtractPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/evals" element={<EvalsPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/:itemId" element={<ReviewDetailPage />} />
      </Routes>
    </AppShell>
  );
}
