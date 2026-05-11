import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface ElyByLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; type: string; avatar: string; token: string }) => void;
}

const ElyByLoginModal: React.FC<ElyByLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const user: any = await invoke("ely_by_authenticate", { email, password });
      onSuccess({
        name: user.name,
        type: user.type,
        avatar: user.avatar,
        token: user.token,
      });
    } catch (err: any) {
      setError(typeof err === "string" ? err : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail("");
      setPassword("");
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        className="relative bg-[#2b2b2b] w-full max-w-[680px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col border border-white/5 rounded-[2px]"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header & Body Section */}
          <div className="p-8 pb-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-white text-[24px] font-bold">
                Sign in with Ely.by account
              </h2>
              <img
                src="https://ely.by/favicon.ico"
                alt="Ely.by"
                className="w-6 h-6 opacity-50"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            <div className="flex flex-col gap-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-[14px] text-red-400">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#a1a1a1] text-[11px] font-black tracking-wider uppercase mb-1">
                  EMAIL OR USERNAME:
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  spellCheck="false"
                  className="w-full bg-[#111111] border-2 border-[#444444] focus:border-white p-3 text-white text-[16px] outline-none transition-all disabled:opacity-50"
                />
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#a1a1a1] text-[11px] font-black tracking-wider uppercase mb-1">
                  PASSWORD:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full bg-[#111111] border-2 border-[#444444] focus:border-white p-3 text-white text-[16px] outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <p className="text-[#d0d0d0] text-[15px] opacity-90">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => openUrl("https://account.ely.by/register")}
                  className="text-[#187e3f] font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Register on Ely.by
                </button>
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-[#212121] p-5 flex justify-end gap-3.5 border-t border-white/5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-8 py-2.5 bg-[#444444] cursor-pointer hover:bg-[#555555] text-white font-bold text-[15px] transition-colors min-w-[130px] border border-transparent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="px-8 py-2.5 cursor-pointer bg-[#187e3f] hover:bg-[#1a8b46] text-white font-bold text-[15px] transition-colors min-w-[130px] border border-transparent flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Wait...
                </>
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ElyByLoginModal;
