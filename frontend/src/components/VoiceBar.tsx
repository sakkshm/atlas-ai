import { useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface VoiceBarProps {
  onSendText: (text: string) => void;
  onSendAudio: (base64: string) => void;
  isRecording?: boolean;
  disabled: boolean;
}

export function VoiceBar({
  onSendText,
  onSendAudio,
  disabled,
}: VoiceBarProps) {
  const [textInput, setTextInput] = useState("");
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  function handleMicPress() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording((base64) => onSendAudio(base64));
    }
  }

  function handleSendText() {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setTextInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  const isBusy = disabled || isRecording;

  return (
    <div className="border-t border-white/[0.08] bg-transparent px-4 py-3 shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={handleMicPress}
          disabled={disabled}
          className="shrink-0 rounded-full size-10"
        >
          {isRecording ? (
            <MicOff className="size-4 text-current" />
          ) : (
            <Mic className="size-4 text-current" />
          )}
        </Button>

        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Listening..." : "Type a message..."}
          disabled={isBusy}
          className="flex-1 rounded-full glass px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-white/[0.15] transition-colors disabled:opacity-50"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={handleSendText}
          disabled={isBusy || !textInput.trim()}
          className="shrink-0 rounded-full size-10"
        >
          <Send className="size-4 text-current" />
        </Button>
      </div>
    </div>
  );
}
