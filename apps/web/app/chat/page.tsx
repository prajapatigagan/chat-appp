"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  connectSocket,
  subscribeToStatus,
  subscribeToRoom,
  sendMessage as socketSendMessage,
  disconnectSocket,
} from "@/lib/socket";
import { uploadFile } from "@/lib/upload";
import { api } from "@/lib/api";
import {
  MdSend,
  MdLogout,
  MdAttachFile,
  MdMic,
  MdStop,
  MdInsertEmoticon,
  MdCameraAlt,
  MdClose,
} from "react-icons/md";
import EmojiPicker, { Theme } from "emoji-picker-react";

// ── Types ──────────────────────────────────────────────────────
interface Message {
  sender: string;
  content: string;
  timeStamp: string;
  fileUrl?: string;
  fileType?: string;
  status?: "SENT" | "DELIVERED" | "SEEN";
}

interface UserStatus {
  userId: string;
  online: boolean;
}

// ── AudioPlayer component ──────────────────────────────────────
function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("--:--");

  const fmt = (s: number) => {
    if (!isFinite(s)) return "--:--";
    const sec = Math.floor(s % 60);
    return `${Math.floor(s / 60)}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setProgress((a.currentTime / a.duration) * 100 || 0);
    setCurrentTime(fmt(a.currentTime));
  };

  const onLoadedMetadata = () => {
    const a = audioRef.current;
    if (a) setDuration(fmt(a.duration));
  };

  const onEnded = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime("0:00");
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const trackBg = isOwn ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)";
  const fillColor = isOwn ? "#fff" : "#818cf8";
  const textColor = isOwn ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)";
  const btnBg = isOwn ? "rgba(255,255,255,0.2)" : "#4f46e5";

  return (
    <div className="mt-2" style={{ width: "100%", maxWidth: 240 }}>
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
      >
        <source src={src} type="audio/webm" />
        <source src={src} type="audio/mp4" />
      </audio>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            background: btnBg, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "#fff", fontSize: 14,
          }}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={seek}
            style={{
              height: 3, background: trackBg, borderRadius: 4,
              cursor: "pointer", marginBottom: 5, position: "relative",
            }}
          >
            <div
              style={{
                height: "100%", width: `${progress}%`,
                background: fillColor, borderRadius: 4,
                transition: "width 0.1s linear", pointerEvents: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: textColor }}>{currentTime}</span>
            <span style={{ fontSize: 10, color: textColor }}>{duration}</span>
          </div>
        </div>

        <span style={{ fontSize: 14, opacity: 0.45 }}>🎤</span>
      </div>
    </div>
  );
}

// ── Avatar color helper ────────────────────────────────────────

const AVATAR_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#dc2626",
  "#d97706", "#0891b2", "#be185d", "#4f46e5",
] as const;

function getAvatarColor(name: string): string {
  if (!name || name.length === 0) return "#4f46e5";
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return AVATAR_COLORS[sum % AVATAR_COLORS.length] as string;
}
// ── Main ChatPage ──────────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());
  const [currentUserId, setCurrentUserId] = useState("");
  const [roomId, setRoomId] = useState("general");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");

  // ── Init ────────────────────────────────────────────────────
  useEffect(() => {
    const userId = localStorage.getItem("userId") || "";
    const room = localStorage.getItem("roomId") || "general";
    setCurrentUserId(userId);
    setRoomId(room);
  }, []);

  // ── Socket ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    connectSocket(currentUserId, () => {
      subscribeToStatus((status: UserStatus) => {
        setOnlineUsers((prev) => {
          const updated = new Map(prev);
          updated.set(status.userId, status.online);
          return updated;
        });
      });

      subscribeToRoom(roomId, (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });
    });

    return () => {
      disconnectSocket();
    };
  }, [currentUserId, roomId]);

  // ── Auto scroll ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send ────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (fileOverride?: File) => {
      const fileToSend = fileOverride ?? selectedFile;

      let fileUrl = "";
      let fileType = "";

      if (fileToSend) {
        setIsSending(true);
        try {
          fileUrl = await uploadFile(fileToSend);
          if (fileToSend.type.startsWith("image/")) fileType = "image";
          else if (fileToSend.type.startsWith("video/")) fileType = "video";
          else if (fileToSend.type.startsWith("audio/")) fileType = "audio";
          else fileType = "file";
        } catch {
          alert("File upload failed. Please try again.");
          setIsSending(false);
          return;
        } finally {
          setIsSending(false);
        }
      }

      if (!inputText.trim() && !fileUrl) return;

      socketSendMessage(roomId, {
        sender: currentUserId,
        content: inputText.trim(),
        fileUrl,
        fileType,
      });

      setInputText("");
      setSelectedFile(null);
      setShowEmojiPicker(false);
    },
    [inputText, selectedFile, roomId, currentUserId]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── File ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  // ── Emoji ───────────────────────────────────────────────────
  const onEmojiClick = (emojiData: any) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

  // ── Voice recording ─────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data);
      };

      // FIX: pass audioFile directly to handleSend — avoids state race condition
      recorder.onstop = async () => {
        try {
          const type = mimeTypeRef.current || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type });
          if (blob.size === 0) {
            alert("Recording was empty. Please try again.");
            return;
          }
          const ext = type.includes("mp4") ? "mp4" : "webm";
          const audioFile = new File([blob], `voice-${Date.now()}.${ext}`, { type });
          await handleSend(audioFile);
        } finally {
          audioStreamRef.current?.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.onerror = (e) => console.error("Recorder error:", e);
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.error("Stop recording error:", e);
    } finally {
      setIsRecording(false);
    }
  };

  // ── Camera ──────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      alert("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `snap-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelectedFile(file);
      stopCamera();
    }, "image/jpeg");
  };

  // ── Logout ──────────────────────────────────────────────────
  const handleLeaveRoom = async () => {
    const token = localStorage.getItem("token");
    try {
      await api.post("/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    disconnectSocket();
    localStorage.removeItem("userId");
    localStorage.removeItem("roomId");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // ── Helpers ─────────────────────────────────────────────────
  const onlineCount = Array.from(onlineUsers.values()).filter(Boolean).length;

  const formatTime = (ts: string) =>
    ts
      ? new Date(ts).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
        .icon-btn { background: transparent; border: none; cursor: pointer; padding: 10px; border-radius: 12px; color: rgba(255,255,255,0.4); transition: color 0.15s, background 0.15s; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .icon-btn.active { color: #fff; background: rgba(255,255,255,0.1); }
      `}</style>

      <div className="min-h-screen text-white flex flex-col" style={{ background: "#0a0a0f" }}>

        {/* ── Header ── */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b"
          style={{
            background: "rgba(12,12,20,0.97)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: "#4f46e5" }}
            >
              #
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{roomId}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399" }} />
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {onlineCount} online · {currentUserId}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#fca5a5",
            }}
          >
            <MdLogout size={16} />
            Leave
          </button>
        </header>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Online users sidebar */}
          <aside
            className="hidden md:flex flex-col items-center py-4 gap-3 overflow-y-auto flex-shrink-0"
            style={{
              width: 68,
              background: "rgba(255,255,255,0.015)",
              borderRight: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span
              className="text-[9px] uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Online
            </span>
            {Array.from(onlineUsers.entries())
              .filter(([_, online]) => online)
              .map(([userId]) => (
                <div key={userId} className="flex flex-col items-center gap-1" title={userId}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold relative"
                    style={{ background: getAvatarColor(userId) }}
                  >
                    {userId.charAt(0).toUpperCase()}
                    <span
                      className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
                      style={{ background: "#34d399", border: "1.5px solid #0a0a0f" }}
                    />
                  </div>
                  <span
                    className="text-[9px] truncate max-w-[58px] text-center"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {userId}
                  </span>
                </div>
              ))}
          </aside>

          {/* Messages */}
          <main className="flex-1 overflow-y-auto chat-scroll pb-36 px-4 py-5">
            <div className="max-w-3xl mx-auto space-y-2">

              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: "rgba(79,70,229,0.12)" }}
                  >
                    💬
                  </div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                    No messages yet. Say hello!
                  </p>
                </div>
              )}

              {messages.map((msg, index) => {
                const isMine = msg.sender === currentUserId;
                return (
                  <div key={index} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold mr-2 mt-auto flex-shrink-0"
                        style={{ background: getAvatarColor(msg.sender) }}
                      >
                        {msg.sender.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
                      {!isMine && (
                        <span
                          className="text-[10px] mb-1 pl-1"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {msg.sender}
                        </span>
                      )}

                      <div
                        className="px-3.5 py-2.5 text-sm leading-relaxed"
                        style={
                          isMine
                            ? { background: "#4f46e5", borderRadius: "18px 18px 4px 18px" }
                            : {
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                borderRadius: "18px 18px 18px 4px",
                              }
                        }
                      >
                        {msg.content && (
                          <p className="break-words">{msg.content}</p>
                        )}

                        {msg.fileType === "image" && msg.fileUrl && (
                          <img
                            src={msg.fileUrl}
                            alt="shared"
                            className="mt-2 rounded-xl max-w-full max-h-72 object-cover"
                          />
                        )}

                        {msg.fileType === "video" && msg.fileUrl && (
                          <video controls className="mt-2 rounded-xl max-w-full max-h-52">
                            <source src={msg.fileUrl} type="video/mp4" />
                          </video>
                        )}

                        {/* FIX: custom AudioPlayer, not native <audio controls> */}
                        {msg.fileType === "audio" && msg.fileUrl && (
                          <AudioPlayer src={msg.fileUrl} isOwn={isMine} />
                        )}

                        {msg.fileType === "file" && msg.fileUrl && (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 mt-2 text-sm underline underline-offset-2"
                            style={{ color: isMine ? "rgba(255,255,255,0.8)" : "#818cf8" }}
                          >
                            <MdAttachFile size={14} />
                            Download File
                          </a>
                        )}
                      </div>

                      <span
                        className="text-[10px] mt-1 px-1"
                        style={{ color: "rgba(255,255,255,0.18)" }}
                      >
                        {formatTime(msg.timeStamp)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          </main>
        </div>

        {/* ── Camera overlay ── */}
        {showCamera && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
            style={{ background: "rgba(0,0,0,0.93)" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <div className="flex gap-3">
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
                style={{ background: "#4f46e5" }}
              >
                📸 Capture
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
                style={{ background: "rgba(239,68,68,0.65)" }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── Emoji Picker ── */}
        {showEmojiPicker && (
          <div className="fixed bottom-24 left-4 z-50">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={Theme.DARK}
              width={320}
              height={380}
              skinTonesDisabled
              searchPlaceholder="Search emoji..."
            />
          </div>
        )}

        {/* ── Input bar ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-8"
          style={{ background: "linear-gradient(to top, #0a0a0f 55%, transparent)" }}
        >
          <div className="max-w-3xl mx-auto">

            {/* File preview */}
            {selectedFile && (
              <div
                className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                <MdAttachFile size={14} />
                <span className="truncate flex-1">{selectedFile.name}</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}
                >
                  <MdClose size={16} />
                </button>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div
                className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  color: "#fca5a5",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#ef4444" }}
                />
                Recording… tap stop when done
              </div>
            )}

            {/* Input row */}
            <div
              className="flex items-center gap-1"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                padding: "6px 8px",
              }}
            >
              {/* Attach */}
              <label className="icon-btn" title="Attach file">
                <MdAttachFile size={20} />
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                  hidden
                  onChange={handleFileChange}
                />
              </label>

              {/* Camera */}
              <button
                type="button"
                onClick={startCamera}
                className="icon-btn"
                title="Take photo"
              >
                <MdCameraAlt size={20} />
              </button>

              {/* Mic / Stop */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`icon-btn ${isRecording ? "active" : ""}`}
                style={isRecording ? { color: "#f87171", background: "rgba(239,68,68,0.15)" } : {}}
                title={isRecording ? "Stop recording" : "Voice message"}
              >
                {isRecording ? <MdStop size={20} /> : <MdMic size={20} />}
              </button>

              {/* Emoji */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className={`icon-btn ${showEmojiPicker ? "active" : ""}`}
                title="Emoji"
              >
                <MdInsertEmoticon size={20} />
              </button>

              {/* Text */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="flex-1 bg-transparent outline-none text-sm px-2 min-w-0"
                style={{ color: "#fff" }}
              />

              {/* Send */}
              <button
                onClick={() => handleSend()}
                disabled={isSending}
                aria-label="Send message"
                className="flex items-center justify-center flex-shrink-0 transition"
                style={{
                  width: 36, height: 36,
                  borderRadius: 12,
                  background: isSending ? "rgba(79,70,229,0.5)" : "#4f46e5",
                  border: "none",
                  cursor: isSending ? "not-allowed" : "pointer",
                }}
              >
                {isSending ? (
                  <div
                    className="animate-spin"
                    style={{
                      width: 15, height: 15,
                      border: "2px solid rgba(255,255,255,0.25)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <MdSend size={18} color="#fff" />
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
