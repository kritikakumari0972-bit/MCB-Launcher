import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import PlayerAvatar from "@shared/components/PlayerAvatar";
import { Plus, X, Loader2, ExternalLink } from "lucide-react";
import LanguageSelector from "@shared/components/LanguageSelector";
import OfflineLoginModal from "./OfflineLoginModal";
import ElyByLoginModal from "./ElyByLoginModal";

interface LoginProps {
  onLogin: (name?: string, type?: string, avatar?: string, token?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedLang, setSelectedLang] = React.useState("English - United Kingdom");
  const [isOfflineModalOpen, setIsOfflineModalOpen] = React.useState(false);
  const [isElyByModalOpen, setIsElyByModalOpen] = React.useState(false);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [isAddingAccount, setIsAddingAccount] = React.useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = React.useState(true);
  const refreshKey = React.useMemo(() => Date.now(), []);

  React.useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data: any = await invoke("get_all_accounts");
      setAccounts(data);
      if (data.length === 0) {
        setIsAddingAccount(true);
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleOfflineConfirm = async (username: string) => {
    setIsOfflineModalOpen(false);
    try {
      await invoke("save_secure_user", { userData: { name: username, type: "Offline account", avatar: "/user_icon.png" } });
      onLogin(username, "Offline account", "/user_icon.png");
    } catch (err) {
      console.error("Failed to save offline user", err);
      onLogin(username, "Offline account", "/user_icon.png");
    }
  };

  const handleElyBySuccess = (user: { name: string; type: string; avatar: string; token: string }) => {
    setIsElyByModalOpen(false);
    onLogin(user.name, user.type, user.avatar, user.token);
  };

  const handleSelectAccount = async (account: any) => {
    try {
      await invoke("save_secure_user", { userData: account });
      onLogin(account.name, account.type, account.avatar, account.token);
    } catch (err) {
      console.error("Failed to select account", err);
    }
  };

  const handleRemoveAccount = async (e: React.MouseEvent, account: any) => {
    e.stopPropagation();
    try {
      await invoke("remove_account", { name: account.name, accountType: account.type });
      const updatedAccounts = accounts.filter(a => !(a.name === account.name && a.type === account.type));
      setAccounts(updatedAccounts);
      if (updatedAccounts.length === 0) {
        setIsAddingAccount(true);
      }
    } catch (err) {
      console.error("Failed to remove account", err);
    }
  };

  return (
    <div
      className="w-screen h-screen bg-cover bg-center flex items-center justify-center relative select-none"
      style={{ backgroundImage: "url('/firstlaunchbackground.jpg')" }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />
      {/* Language Selector */}
      <div className="absolute top-4 left-4 z-20">
        <LanguageSelector
          selectedLang={selectedLang}
          onSelect={setSelectedLang}
          className="w-[260px]"
        />
      </div>

      {/* Login Box */}
      <div className="relative flex flex-col items-center">
        {/* Logo */}
        <div className="mb-[-10px] z-10">
          <img
            src="/lflauncher_title.png"
            alt="Minecraft Logo"
            className="w-[450px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Content Box */}
        <div className="bg-main-bg/95 backdrop-blur-sm w-[480px] min-h-[200px] flex flex-col items-center shadow-2xl border border-white/5 rounded-[2px] overflow-hidden">
          {isLoadingAccounts ? (
            <div className="flex-1 flex items-center justify-center p-20">
              <Loader2 size={40} className="animate-spin text-white/20" />
            </div>
          ) : !isAddingAccount ? (
            <div className="w-full flex flex-col">
              <div className="p-4 flex flex-col gap-2">
                {accounts.map((account, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectAccount(account)}
                    className="group relative flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/10"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <PlayerAvatar
                        skinUrl={account.avatar || "/user_icon.png"}
                        size={40}
                        className="rounded-sm"
                        refreshKey={refreshKey}
                      />
                      {account.type === "Ely.by" && (
                        <div className="absolute -top-1 -left-1 bg-green-600 w-4 h-4 flex items-center justify-center rounded-[1px] border border-black/20">
                          <img src="https://ely.by/favicon.ico" className="w-2.5 h-2.5 brightness-200" alt="" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-white font-bold text-[15px] truncate">
                        {account.name}
                      </span>
                      <span className="text-[#a1a1a1] text-[12px] truncate opacity-60">
                        {account.type === "Ely.by" ? "ely.by@account" : "Offline account"}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleRemoveAccount(e, account)}
                      className="p-2 text-white/20 hover:text-white hover:bg-red-500/20 rounded-sm transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="h-[1px] bg-white/5 mx-4" />

              <button
                onClick={() => setIsAddingAccount(true)}
                className="flex items-center gap-3 p-6 text-white/80 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-colors">
                  <Plus size={18} />
                </div>
                <span className="font-bold text-[15px] cursor-pointer">Add your account</span>
              </button>
            </div>
          ) : (
            <div className="p-10 w-full flex flex-col items-center">
              <div className="flex flex-col gap-5 w-full mt-4">
                <button
                  onClick={() => setIsElyByModalOpen(true)}
                  className="play-button w-full font-mcten text-[22px] tracking-[3px] uppercase py-4"
                >
                  ELY.BY LOGIN
                </button>
                <button
                  onClick={() => setIsOfflineModalOpen(true)}
                  className="play-button w-full font-mcten text-[22px] tracking-[3px] uppercase py-4 opacity-80 hover:opacity-100"
                >
                  OFFLINE
                </button>
              </div>

              {accounts.length > 0 && (
                <button
                  onClick={() => setIsAddingAccount(false)}
                  className="mt-6 text-[13px] text-white/40 hover:text-white/80 hover:underline transition-colors"
                >
                  Cancel and go back
                </button>
              )}

              <a
                href="https://account.ely.by/register"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openUrl("https://account.ely.by/register");
                }}
                className="mt-8 text-[13px] font-bold text-white hover:underline flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
              >
                Create an Ely.by account
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Info Box Footer */}
        <div className="w-[480px] mt-6 bg-black/60 p-4 rounded-[2px] border border-white/5 flex flex-col items-center text-center">
          <p className="text-[11px] text-[#dedede] leading-relaxed">
            Sign in with your Ely.by account to access all features.<br />
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); openUrl("https://ely.by"); }}
              className="text-white font-bold hover:underline inline-flex items-center gap-1"
            >
              Learn more about Ely.by <ExternalLink size={10} />
            </a>
          </p>
        </div>
      </div>

      <OfflineLoginModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        onConfirm={handleOfflineConfirm}
      />

      <ElyByLoginModal
        isOpen={isElyByModalOpen}
        onClose={() => setIsElyByModalOpen(false)}
        onSuccess={handleElyBySuccess}
      />
    </div>
  );
};

export default Login;

