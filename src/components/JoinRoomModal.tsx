// src/components/JoinRoomModal.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
// relative path to your supabase client
import { supabase } from "../lib/supabaseClient";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function JoinRoomModal({ isOpen, onClose }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [isOpen]);

  const normalize = (s: string) => s.trim();

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const roomCode = normalize(code);
    if (!roomCode) {
      setError("Please enter a room code.");
      return;
    }

    setLoading(true);

    try {
      // 1) Find the room with this code
      const { data: roomsData, error: roomErr } = await supabase
        .from("rooms")
        .select("id, title")
        .eq("join_code", roomCode)
        .maybeSingle();

      if (roomErr) throw roomErr;
      if (!roomsData) {
        setError("Room not found. Please check the code.");
        setLoading(false);
        return;
      }

      const roomId = (roomsData as any).id as string;

      // 2) Get current user id (supports supabase-js v2)
      let userId: string | null = null;
      try {
        const { data: userRes, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr) throw getUserErr;
        userId = userRes?.user?.id ?? null;
      } catch {
        // fallback to older API shape (rare)
        // @ts-ignore
        const u = supabase.auth.user && supabase.auth.user();
        userId = u?.id ?? null;
      }

      if (!userId) {
        setError("Unable to determine user. Please login and try again.");
        setLoading(false);
        return;
      }

      // 3) Ensure not already a member
      const { data: existing, error: existingErr } = await supabase
        .from("room_members")
        .select("id")
        .eq("room_id", roomId)
        .eq("profile_id", userId)
        .limit(1)
        .maybeSingle();

      if (existingErr) throw existingErr;

      if (!existing) {
        const { error: insertErr } = await supabase.from("room_members").insert({
          room_id: roomId,
          profile_id: userId,
          role: "member",
          joined_at: new Date().toISOString(),
        });
        if (insertErr) throw insertErr;
      }

      setSuccess(`Joined "${(roomsData as any).title ?? "room"}". Redirecting...`);
      setLoading(false);

      // small delay so user sees success then navigate
      setTimeout(() => {
        onClose();
        navigate(`/room/${roomId}`);
      }, 550);
    } catch (err: any) {
      console.error("JoinRoomModal error:", err);
      setError(err?.message ?? "Unexpected error. Try again.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose()}
          />

          {/* Panel */}
          <motion.div
            onClick={(ev) => ev.stopPropagation()}
            initial={{ y: 8, opacity: 0, scale: 0.995 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.18, ease: [0.22, 0.9, 0.26, 1] }}
            className="relative z-50 w-full max-w-md rounded-2xl p-6 shadow-2xl backdrop-blur-md border border-white/6 bg-white/6 dark:bg-black/24"
          >
            <header className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Join room by code</h3>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-2 hover:bg-white/8"
                onClick={() => onClose()}
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground">Room code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. ABC123"
                  className="w-full rounded-lg border border-white/8 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && <div className="text-sm text-red-400">{error}</div>}
              {success && <div className="text-sm text-green-400">{success}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm hover:bg-white/8"
                  onClick={() => onClose()}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loading ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="3 3 18 18"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                    >
                      <path
                        d="M12 5v2M12 17v2M5 12H3M21 12h-2M7.758 7.758l-1.414-1.414M17.656 17.656l-1.414-1.414M7.758 16.242l-1.414 1.414M17.656 6.344l-1.414 1.414"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                  <span>{loading ? "Joining..." : "Join"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// also export named symbol to avoid import-style breakage elsewhere
export { JoinRoomModal };
