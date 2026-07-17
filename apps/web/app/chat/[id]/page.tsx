"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import { MdSend } from "react-icons/md";
import { uploadFile } from "@/lib/upload";
import EmojiPicker from "emoji-picker-react";
import { FaCamera, FaMicrophone, FaStop, FaPaperclip } from "react-icons/fa";
import { IoClose } from "react-icons/io5";

// ── Types ──────────────────────────────────────────────────────
type Message = {
  sender: string;
  content: string;
  roomId?: string;
  timeStamp: string;
  fileUrl?: string;
  fileType?: string;
  status?: "SENT" | "DELIVERED" | "SEEN";
};

// ── AudioPlayer Component ──────────────────────────────────────
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

  const trackBg = isOwn ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)";
  const fillColor = isOwn ? "#fff" : "#818cf8";
  const textColor = isOwn ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)";
  const btnBg = isOwn ? "rgba(255,255,255,0.2)" : "#4f46e5";

  return (
    <div className="mt-2" style={{ width: "100%", maxWidth: 240 }}>
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={onEnded} preload="metadata">
        <source src={src} type="audio/webm" />
        <source src={src} type="audio/mp4" />
        <source src={src} type="audio/ogg" />
      </audio>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} style={{ width: 34, height: 34, borderRadius: "50%", background: btnBg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 13 }}>
          {playing ? "⏸" : "▶"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div onClick={seek} style={{ height: 3, background: trackBg, borderRadius: 4, cursor: "pointer", marginBottom: 5, position: "relative" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: fillColor, borderRadius: 4, transition: "width 0.1s linear", pointerEvents: "none" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: textColor }}>{currentTime}</span>
            <span style={{ fontSize: 10, color: textColor }}>{duration}</span>
          </div>
        </div>
        <span style={{ fontSize: 13, opacity: 0.45 }}>🎤</span>
      </div>
    </div>
  );
}

// ── MessageTick Component ──────────────────────────────────────
function MessageTick({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "SENT") return <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginLeft: 2 }}>✓</span>;
  if (status === "DELIVERED") return <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: -4, marginLeft: 2, paddingRight: 4 }}>✓✓</span>;
  if (status === "SEEN") return <span style={{ fontSize: 13, color: "#60a5fa", letterSpacing: -4, marginLeft: 2, paddingRight: 4 }}>✓✓</span>;
  return null;
}

// ── Main ChatPage ──────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id;

  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const stompClientRef = useRef<any>(null);
  const hasConnected = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const sendMessageRef = useRef<(fileOverride?: File) => Promise<void>>(async () => {});
  const seenSubscriptionRef = useRef<any>(null);
  const usernameRef = useRef<string>("");
  const [typingUser, setTypingUser] = useState<string>("");
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      usernameRef.current = storedUsername;
    } else {
      router.push("/joinroom");
    }
  }, [router]);

  useEffect(() => {
    if (!roomId || !username || hasConnected.current) return;
    hasConnected.current = true;

    // FIX: base URL trailing slash strip + explicit "/" before "ws/chat".
    // Old code (`${process.env.NEXT_PUBLIC_BACKEND_URL || '/'}ws/chat`) produced
    // "https://chat-app-k08c.onrender.comws/chat" — no slash — causing
    // net::ERR_NAME_NOT_RESOLVED.
    const wsBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
    const socket = new SockJS(`${wsBase}/ws/chat`);
    const stomp = Stomp.over(socket);
    stomp.debug = () => {};
    let roomSubscription: any = null;

    stomp.connect({}, () => {
      stompClientRef.current = stomp;

      roomSubscription = stomp.subscribe(`/topic/room/${roomId}`, (frame) => {
        const newMessage: Message = JSON.parse(frame.body);
        setMessages((prev) => [...prev, newMessage]);
        if (newMessage.sender !== usernameRef.current) {
          stomp.send(`/app/seen/${roomId}`, {}, JSON.stringify({ viewer: usernameRef.current }));
        }
      });

      seenSubscriptionRef.current = stomp.subscribe(`/topic/seen/${roomId}`, () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender === usernameRef.current ? { ...msg, status: "SEEN" as const } : msg
          )
        );
      });

      // Typing indicator subscribe
stomp.subscribe(`/topic/typing/${roomId}`, (frame) => {
  const data = JSON.parse(frame.body);
  if (data.username !== usernameRef.current) {
    setTypingUser(data.typing ? data.username : "");
  }
});

      stomp.send(`/app/seen/${roomId}`, {}, JSON.stringify({ viewer: username }));
    });

    return () => {
      roomSubscription?.unsubscribe();
      seenSubscriptionRef.current?.unsubscribe();
      if (stomp.connected) stomp.disconnect();
      stompClientRef.current = null;
      hasConnected.current = false;
    };
  }, [roomId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (fileOverride?: File) => {
    const stomp = stompClientRef.current;
    if (!stomp || !stomp.connected || !username) { alert("Not connected. Please wait."); return; }

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

    if (!input.trim() && !fileUrl) return;

    const message = { sender: username, content: input.trim(), roomId, fileUrl, fileType };

    try {
      stomp.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
    } catch (err) {
      console.error("Send error:", err);
      return;
    }

    setInput("");
    setSelectedFile(null);
    setShowEmojiPicker(false);
  }, [username, roomId, input, selectedFile]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const onEmojiClick = (emojiData: any) => setInput((prev) => prev + emojiData.emoji);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        try {
          const type = mimeTypeRef.current || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type });
          if (blob.size === 0) { alert("Recording empty."); return; }
          const ext = type.includes("mp4") ? "mp4" : "webm";
          const audioFile = new File([blob], `voice-${Date.now()}.${ext}`, { type });
          await sendMessageRef.current(audioFile);
        } finally {
          audioStreamRef.current?.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };
      recorder.onerror = (e) => console.error("Recorder error:", e);
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch { alert("Microphone access denied or unavailable."); }
  };

  const stopRecording = () => {
    try { if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop(); }
    catch (e) { console.error("Stop error:", e); }
    finally { setIsRecording(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch { alert("Camera access denied or unavailable."); }
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

  const leaveRoom = () => {
    localStorage.removeItem("username");
    if (stompClientRef.current?.connected) stompClientRef.current.disconnect();
    router.push("/joinroom");
  };

  const logout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    if (stompClientRef.current?.connected) stompClientRef.current.disconnect();
    router.push("/login");
  };

  const isUrl = (str: string) => str.startsWith("http://") || str.startsWith("https://");
  const formatTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
  const ft = (msg: Message) => msg.fileType?.toLowerCase() ?? "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-sm font-bold text-indigo-300">
            #
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Room</p>
            <p className="text-white font-semibold leading-none">{roomId}</p>
            
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ── AI Button ── */}
          <button
            onClick={() => router.push(`/ai-chat?from=${roomId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 transition"
            title="Chat with AI"
          >
            <span>🤖</span>
            <span className="hidden sm:inline">AI Chat</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mr-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/70">{username}</span>
          </div>
          <button onClick={leaveRoom} className="px-4 py-1.5 rounded-full text-sm bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition">
            Leave
          </button>
          <button onClick={logout} className="px-4 py-1.5 rounded-full text-sm bg-orange-500/20 border border-orange-400/30 text-orange-300 hover:bg-orange-500/30 transition">
            Logout
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-32">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((msg, i) => {
            const isOwn = msg.sender === username;
            return (
              <div key={i} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                {!isOwn && (
                  <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 mr-2 mt-1 flex-shrink-0">
                    {msg.sender[0]?.toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[72%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {!isOwn && <span className="text-xs text-white/40 pl-1">{msg.sender}</span>}
                  <div className={`px-4 py-3 rounded-2xl shadow-lg text-sm ${isOwn ? "bg-indigo-600 rounded-tr-sm text-white" : "bg-white/10 backdrop-blur-sm border border-white/10 rounded-tl-sm text-white/90"}`}>
                    {msg.content && (
                      <p className="break-words leading-relaxed">
                        {isUrl(msg.content) ? (
                          <a href={msg.content} target="_blank" rel="noopener noreferrer" className="text-yellow-300 underline underline-offset-2">{msg.content}</a>
                        ) : msg.content}
                      </p>
                    )}
                    {ft(msg) === "image" && msg.fileUrl && <img src={msg.fileUrl} alt="shared" className="mt-2 rounded-xl max-w-full max-h-64 object-cover" />}
                    {ft(msg) === "video" && msg.fileUrl && <video controls className="mt-2 rounded-xl max-w-full max-h-52"><source src={msg.fileUrl} type="video/mp4" /></video>}
                    {ft(msg) === "audio" && msg.fileUrl && <AudioPlayer src={msg.fileUrl} isOwn={isOwn} />}
                    {ft(msg) === "file" && msg.fileUrl && <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-yellow-300 underline underline-offset-2 text-sm">📄 Download File</a>}
                  </div>
                  <span className="text-[10px] text-white/30 px-1 flex items-center gap-1">
                    {formatTime(msg.timeStamp)}
                    {isOwn && <MessageTick status={msg.status} />}
                  </span>
                </div>
              </div>
            );
          })}


            {typingUser && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 mr-2 mt-1 flex-shrink-0">
                {typingUser[0]?.toUpperCase()}
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white/60 text-sm">
                <span className="animate-pulse">{typingUser} is typing...</span>
              </div>
            </div>
          )}
          
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Camera Overlay ── */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-2xl shadow-2xl border border-white/10" />
          <div className="flex gap-4">
            <button onClick={capturePhoto} className="px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition">📸 Capture</button>
            <button onClick={stopCamera} className="px-6 py-2.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white font-medium transition"><IoClose className="inline mr-1" /> Close</button>
          </div>
        </div>
      )}

      {/* ── Emoji Picker ── */}
      {showEmojiPicker && (
        <div className="fixed bottom-24 left-4 z-40">
          <EmojiPicker onEmojiClick={onEmojiClick} theme={"dark" as any} />
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm text-sm text-white/70">
              <span className="truncate flex-1">📎 {selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="text-white/40 hover:text-white transition"><IoClose size={16} /></button>
            </div>
          )}
          {isRecording && (
            <div className="mb-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-sm text-red-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              Recording... tap stop when done
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/8 backdrop-blur-xl border border-white/15 rounded-2xl px-3 py-2.5 shadow-2xl">
            <label className="cursor-pointer p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition flex-shrink-0" title="Attach file">
              <FaPaperclip size={16} />
              <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" hidden onChange={handleFileChange} />
            </label>
            <button type="button" onClick={startCamera} className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition flex-shrink-0" title="Take photo">
              <FaCamera size={16} />
            </button>
            <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`p-2.5 rounded-xl transition flex-shrink-0 ${isRecording ? "text-red-400 bg-red-500/20 animate-pulse" : "text-white/50 hover:text-white hover:bg-white/10"}`} title={isRecording ? "Stop recording" : "Voice message"}>
              {isRecording ? <FaStop size={15} /> : <FaMicrophone size={16} />}
            </button>
            <button type="button" onClick={() => setShowEmojiPicker((v) => !v)} className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition flex-shrink-0 text-base leading-none" title="Emoji">
              😊
            </button>
            <input
              type="text"
              placeholder="Message..."
              value={input}


              onChange={(e) => {
  setInput(e.target.value);

  // Typing event bhejo
  const stomp = stompClientRef.current;
  if (stomp?.connected) {
    stomp.send(`/topic/typing/${roomId}`, {}, JSON.stringify({
      username: usernameRef.current,
      typing: true,
    }));

    // 2 second baad typing stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stomp.send(`/topic/typing/${roomId}`, {}, JSON.stringify({
        username: usernameRef.current,
        typing: false,
      }));
    }, 2000);
  }
}}


              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="flex-1 bg-transparent outline-none text-white placeholder-white/30 text-sm px-2 min-w-0"
            />
            <button onClick={() => sendMessage()} disabled={isSending} aria-label="Send message" className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition shadow-lg flex-shrink-0">
              {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MdSend size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}