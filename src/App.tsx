import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { BebiThemeSync } from "./components/theme/BebiThemeSync";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { Lessons } from "./pages/Lessons";
import { LessonReader } from "./pages/LessonReader";
import { Quiz } from "./pages/Quiz";
import { Flashcards } from "./pages/Flashcards";
import { Reviewer } from "./pages/Reviewer";
import { Chat } from "./pages/Chat";
import { AISettings } from "./pages/AISettings";
import { Settings } from "./pages/Settings";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";

export default function App() {
  return (
    <ThemeProvider>
      <BebiThemeSync />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lessons" element={<Lessons />} />
            <Route path="/lessons/:id/read" element={<LessonReader />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/reviewer" element={<Reviewer />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/ai-settings" element={<AISettings />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <PWAUpdatePrompt />
    </ThemeProvider>
  );
}
