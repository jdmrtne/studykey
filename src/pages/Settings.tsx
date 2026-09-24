import { Button } from "../components/ui/Button";
import { useLessonsStore } from "../store/lessonsStore";
import { ThemeSelector } from "../components/ui/ThemeSelector";
import { InstallMemoraButton } from "../components/pwa/InstallMemoraButton";

export function Settings() {
  const lessons = useLessonsStore((s) => s.lessons);
  const removeLesson = useLessonsStore((s) => s.removeLesson);

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full mx-auto">
      <h1 className="text-2xl font-display font-bold">Settings</h1>

      <div className="flex flex-col divide-y divide-ink-3">
        <div className="pb-6 flex flex-col gap-3">
          <h2 className="font-display font-semibold">Appearance</h2>
          <p className="text-sm text-paper/60">Choose light, dark, or follow your device.</p>
          <ThemeSelector />
        </div>

        <div className="py-6 flex flex-col gap-3">
          <h2 className="font-display font-semibold">Install app</h2>
          <p className="text-sm text-paper/60">
            Install Memora for a full-screen, app-like experience. Your saved lessons open even when you're offline;
            AI generation and chat still need an internet connection.
          </p>
          <InstallMemoraButton />
        </div>

        <div className="py-6 flex flex-col gap-3">
          <h2 className="font-display font-semibold">Privacy</h2>
          <p className="text-sm text-paper/60 leading-relaxed">
            Your lesson content is sent directly to the AI provider you selected, only when you run a generation.
            Your API key belongs to you and is not provided by this app. Memora does not sell or share your API
            key, and adds no analytics or telemetry beyond what your browser already does.
          </p>
        </div>

        <div className="pt-6 flex flex-col gap-4">
          <h2 className="font-display font-semibold">Data on this device</h2>
          <p className="text-sm text-paper/60">
            {lessons.length} lesson{lessons.length === 1 ? "" : "s"} stored in this browser's local storage.
          </p>
          <Button
            variant="danger"
            className="w-full sm:w-auto sm:self-start"
            onClick={() => {
              if (confirm(`Delete all ${lessons.length} saved lessons from this device?`)) {
                lessons.forEach((l) => removeLesson(l.id));
              }
            }}
            disabled={lessons.length === 0}
          >
            Clear all lessons
          </Button>
        </div>
      </div>
    </div>
  );
}
