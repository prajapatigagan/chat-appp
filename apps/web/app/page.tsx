"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdChat, MdAdd, MdLogin, MdVpnKey, MdArrowForward } from "react-icons/md";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center relative overflow-hidden px-4">

        {/* Ambient glows */}
        <div className="fixed top-[-15%] right-[-5%] w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[160px] pointer-events-none" />
        <div className="fixed bottom-[-15%] left-[-5%] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[160px] pointer-events-none" />
        <div className="fixed top-[40%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-[900px] relative z-10">
          {/* Main card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden">

            {/* Top gradient bar */}
            <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500" />

            <div className="flex flex-col md:flex-row">

              {/* Left side - Branding */}
              <div className="md:w-[45%] bg-gradient-to-br from-violet-600/20 to-blue-600/20 border-b md:border-b-0 md:border-r border-white/[0.06] p-10 flex flex-col justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20">
                  <MdChat size={28} />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
                  Chat Rooms
                </h1>
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                  Join or create rooms to start real-time conversations with anyone, anywhere.
                </p>

                <div className="flex items-center gap-6 mt-8">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">⚡</div>
                    <p className="text-[10px] text-gray-500 mt-1">Real-time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">🔒</div>
                    <p className="text-[10px] text-gray-500 mt-1">Secure</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">📸</div>
                    <p className="text-[10px] text-gray-500 mt-1">Media</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">🎙️</div>
                    <p className="text-[10px] text-gray-500 mt-1">Voice</p>
                  </div>
                </div>
              </div>

              {/* Right side - Form */}
              <div className="md:w-[55%] p-10 flex flex-col justify-center">
                <h2 className="text-xl font-semibold text-white mb-6">Get Started</h2>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-2 block uppercase tracking-wider">
                      Your Name
                    </label>
                    <div className="relative group">
                      <MdLogin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-500 outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Room ID */}
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-2 block uppercase tracking-wider">
                      Room ID
                    </label>
                    <div className="relative group">
                      <MdVpnKey className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="Enter room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-sm placeholder-gray-500 outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => router.push("/joinroom")}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                    >
                      <MdLogin size={18} />
                      Join Room
                    </button>
                    <button
                      onClick={() => router.push("/joinroom?mode=create")}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                    >
                      <MdAdd size={18} />
                      Create Room
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
