import React, { useEffect, useState } from "react";
import { X, UserPlus, LogOut, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import PlayerAvatar from "@shared/components/PlayerAvatar";

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentAccountType: string;
  onSwitch: (account: any) => void;
  onAddAccount: () => void;
  onAddElyBy: () => void;
  refreshKey?: number;
}

const AccountsModal: React.FC<AccountsModalProps> = ({ isOpen, onClose, currentUsername, currentAccountType, onSwitch, onAddAccount, onAddElyBy, refreshKey = 0 }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const result: any[] = await invoke("get_all_accounts");
      setAccounts(result);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemove = async (e: React.MouseEvent, account: any) => {
    e.stopPropagation();
    try {
      await invoke("remove_account", { name: account.name, accountType: account.type });
      loadAccounts();
    } catch (err) {
      console.error("Failed to remove account:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#2e2e2e] animate-in slide-in-from-bottom-8 duration-300">
      {/* Header */}
      <div className="flex items-center justify-center py-5 border-b border-white/5 relative bg-[#2e2e2e]">
        <h2 className="text-white text-[15px] font-bold uppercase tracking-wider">Manage Accounts</h2>
        <button
          onClick={onClose}
          className="absolute right-10 hover:bg-white/10 p-1.5 rounded-full transition-colors text-gray-400 hover:text-white cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center custom-scrollbar">
        <div className="w-full max-w-[600px] flex flex-col gap-6 pb-20">

          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-extrabold text-[#999] uppercase tracking-tighter">Saved Accounts</h3>
            <div className="flex gap-2">
              <button
                onClick={onAddAccount}
                className="flex items-center gap-2 cursor-pointer bg-black/40 hover:bg-black/60 text-white border border-white/5 px-4 py-2 text-[12px] font-bold transition-colors"
                title="Add Offline Account"
              >
                <UserPlus size={14} />
                Offline
              </button>
              <button
                onClick={onAddElyBy}
                className="flex items-center gap-2 cursor-pointer bg-minecraft-green hover:bg-minecraft-green-hover text-white px-4 py-2 text-[12px] font-bold transition-colors"
                title="Add Ely.by Account"
              >
                <UserPlus size={14} />
                Ely.by
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-minecraft-green border-t-transparent animate-spin" />
                <span className="text-[12px] font-bold text-white/40 uppercase tracking-widest">Synchronizing...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4 border border-white/5 bg-black/10">
                <LogOut size={40} className="text-white/10" />
                <span className="text-[12px] font-bold text-white/40 uppercase tracking-widest">No Identities Found</span>
              </div>
            ) : (
              accounts.map((acc, idx) => {
                const isCurrent = acc.name === currentUsername && acc.type === currentAccountType;
                return (
                  <div
                    key={`${acc.name}-${acc.type}-${idx}`}
                    onClick={() => !isCurrent && onSwitch(acc)}
                    className={`group relative flex items-center justify-between p-4 border transition-all ${isCurrent
                      ? 'bg-white/10 border-white/20 cursor-default'
                      : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5 cursor-pointer'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black/40 overflow-hidden border border-white/10">
                        <PlayerAvatar
                          skinUrl={acc.avatar || "/user_icon.png"}
                          size={48}
                          className="rounded-sm"
                          refreshKey={refreshKey}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-extrabold text-white">{acc.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-extrabold bg-minecraft-green px-1.5 py-0.5 text-white uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#999] uppercase tracking-wider mt-0.5">
                          {acc.type}
                        </span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={(e) => handleRemove(e, acc)}
                        className="w-8 h-8 flex items-center justify-center text-[#999] hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                        title="Remove Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center">
            <button
              onClick={async () => {
                await invoke("logout_secure_user");
                window.location.reload();
              }}
              className="flex items-center gap-2 cursor-pointer text-[#999] hover:text-red-400 transition-colors text-[13px] font-bold"
            >
              <LogOut size={14} />
              Log out
            </button>
          </div>

        </div>
      </div>
    </div >
  );
};

export default AccountsModal;
