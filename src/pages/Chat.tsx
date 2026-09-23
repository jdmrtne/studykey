import { Link } from "react-router-dom";
import { MessageCircleQuestion, Upload } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { NotConfiguredBanner } from "../components/ai/NotConfiguredBanner";
import { LessonPicker } from "../components/ai/LessonPicker";
import { ChatPanel } from "../components/chat/ChatPanel";
import { useAISettingsStore, selectIsConfigured } from "../store/aiSettingsStore";
import { useLessonsStore, selectSelectedLesson } from "../store/lessonsStore";

export function Chat() {
  const isConfigured = useAISettingsStore(selectIsConfigured);
  const config = useAISettingsStore((s) => s.config);
  const lessons = useLessonsStore((s) => s.lessons);
  const lesson = useLessonsStore(selectSelectedLesson);
  const showingPanel = isConfigured && lessons.length > 0 && !!lesson;

  return (
    <div className="flex flex-col gap-4 md:gap-6 h-full">
      {/* On mobile, once the chat panel itself is showing, its own header already
          says which lesson you're in and the bottom nav says "Chat" — a second
          page title would just eat space above the fold. */}
      <div className={showingPanel ? "hidden md:block" : undefined}>
        <h1 className="text-2xl font-display font-bold">Chat</h1>
        <p className="text-paper/60 text-sm mt-1">Ask questions about your lesson — answers stay grounded in it.</p>
      </div>

      {!isConfigured ? (
        <NotConfiguredBanner />
      ) : lessons.length === 0 ? (
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
      ) : !lesson ? (
        <Card className="p-8 flex flex-col items-center text-center gap-4">
          <h2 className="font-display font-semibold">Select a lesson to chat about</h2>
          <div className="w-full max-w-sm">
            <LessonPicker />
          </div>
        </Card>
      ) : (
        <ChatPanel lesson={lesson} config={config} />
      )}
    </div>
  );
}
