import { useCallback, useRef, useState } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onCompleteRef = useRef<(base64: string) => void>(() => {});

  const startRecording = useCallback(
    (onComplete: (base64: string) => void) => {
      onCompleteRef.current = onComplete;

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        streamRef.current = stream;
        chunksRef.current = [];

        const mr = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mr.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            onCompleteRef.current(base64);
          };
          reader.readAsDataURL(blob);

          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setIsRecording(false);
        };

        mr.start();
        setIsRecording(true);
      });
    },
    []
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { isRecording, startRecording, stopRecording };
}
