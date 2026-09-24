import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageCircleQuestion, Upload } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { LessonPicker } from "../components/ai/LessonPicker";
import { ChatPanel } from "../components/chat/ChatPanel";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";

/** Setup states (no key / no lesson) sit in a centered column inside the full-width scroll area. */
function Centered({ children }: { children: ReactNode }) {
  return <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-4">{children}</div>;
}

export function Chat() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lessons = useLessonsStore((s) => s.lessons);
  const lesson = useLessonsStore(selectSelectedLesson);
  const showingPanel = isConfigured && lessons.length > 0 && !!lesson;

  return (
    // The page title lives in the app's top bar (see AppShell), so the whole area below it belongs to the chat.
    // The shell is locked to the viewport on this route; only the message list (or, for the
    // setup states below, this wrapper) scrolls.
    <div className={showingPanel ? "flex-1 min-h-0 flex flex-col" : "flex-1 min-h-0 overflow-y-auto"}>
      {!isConfigured ? (
        <Centered>
          <NotConfiguredBanner />
        </Centered>
      ) : lessons.length === 0 ? (
        <Centered>
          <Card className="p-10 flex flex-col items-center text-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-signal/10 text-signal flex items-center justify-center">
              <MessageCircleQuestion className="w-6 h-6" />
            </span>
            <div>
              <h2 className="font-display font-semibold">Upload a lesson to start chatting with it</h2>
              <p className="text-sm text-paper/50 mt-1 max-w-sm">
                Chat answers are grounded in a lesson you've added — add one first and I'll help you make sense of
                it.
              </p>
            </div>
            <Link to="/lessons">
              <Button variant="primary">
                <Upload className="w-4 h-4 mr-2 inline" />
                Upload Lesson
              </Button>
            </Link>
          </Card>
        </Centered>
      ) : !lesson ? (
        <Centered>
          <Card className="p-8 flex flex-col items-center text-center gap-4">
            <h2 className="font-display font-semibold">Select a lesson to chat about</h2>
            <div className="w-full max-w-sm">
              <LessonPicker />
            </div>
          </Card>
        </Centered>
      ) : (
        <ChatPanel lesson={lesson} config={config} />
      )}
    </div>
  );
}
