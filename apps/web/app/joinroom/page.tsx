"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { MdLogin, MdVpnKey, MdArrowForward, MdChat, MdAdd } from "react-icons/md"
function JoinRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isCreateMode = mode === "create";

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);

    useEffect(() => {
    if (isCreateMode && !roomId) {
      // Generate a random room ID like chat-1a2b
      const randomId = "chat-" + Math.random().toString(36).substring(2, 6);
      setRoomId(randomId);
    }
  }, [isCreateMode]);

  const handleJoinRoom = async () => {
    if (!name.trim() || !roomId.trim()) return;

    setLoading(true);
    localStorage.setItem("username", name);
    router.push(`/chat/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center relative overflow-hidden px-4">

      {/* Ambient glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden">

          {/* Top gradient bar */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                <MdChat size={32} />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
               
                 {isCreateMode ? "Create a Room" : "Join a Room"}
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                {isCreateMode ? "Share your room ID with others" : "Enter your details to start chatting"}
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-gray-400 text-xs font-medium mb-2 block uppercase tracking-wider">
                  Your Name
                </label>
                <div className="relative group">
                  <MdLogin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Room ID */}
              <div>
                <label className="text-gray-400 text-xs font-medium mb-2 block uppercase tracking-wider">
                  Room ID
                </label>
                <div className="relative group">
                  <MdVpnKey className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder={isCreateMode ? "Generated room ID" : "Enter room ID"}
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-500 outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Join Button */}
              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isCreateMode ? "Creating..." : "Joining..."}
                     
                  </>
                ) : (
                  <>
                    <MdArrowForward size={18} />
                  </>
                )}
              </button>
            </div>

            {/* Back */}
            <button
              onClick={() => router.back()}
              className="w-full text-center text-gray-500 hover:text-gray-300 text-sm mt-5 transition-colors"
            >
              ← Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
  export default function JoinRoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <JoinRoomContent />
    </Suspense>
  );
}