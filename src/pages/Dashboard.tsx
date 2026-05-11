import React, { lazy, Suspense } from "react";
import Sidebar from "@shared/components/Sidebar";
import MinecraftHeader from "@modules/launcher/components/MinecraftHeader";
import DownloadProgressBar from "@shared/components/DownloadProgressBar";
import LoadingOverlay from "@shared/components/LoadingOverlay";
import LogWindow from "@shared/components/LogWindow";
import { listen } from "@tauri-apps/api/event";
import AccountsModal from "@modules/auth/components/AccountsModal";
import OfflineLoginModal from "@modules/auth/components/OfflineLoginModal";
import ElyByLoginModal from "@modules/auth/components/ElyByLoginModal";
import HelpModal from "@modules/launcher/components/HelpModal";
import { invoke } from "@tauri-apps/api/core";

// Lazy load feature components
const GameHero = lazy(() => import("@modules/launcher/components/GameHero"));
const NewsSection = lazy(() => import("@modules/launcher/components/NewsSection"));
const Installations = lazy(() => import("@modules/launcher/components/Installations"));
const PatchNotes = lazy(() => import("@modules/launcher/components/PatchNotes"));
const Settings = lazy(() => import("@modules/launcher/components/Settings"));
const NewsFeed = lazy(() => import("@modules/launcher/components/NewsFeed"));
const Skins = lazy(() => import("@modules/launcher/components/Skins"));
const UpgradeBanner = lazy(() => import("@modules/launcher/components/UpgradeBanner"));
const FAQ = lazy(() => import("@modules/launcher/components/FAQ"));
const WhatNew = lazy(() => import("@modules/launcher/components/WhatNewModal"));

interface DashboardProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showUpgrade: boolean;
  setShowUpgrade: (show: boolean) => void;
  isLoggedIn: boolean;
  startDownload: () => void;
  isDownloading: boolean;
  downloadProgress: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  getTitle: () => string;
  tabs: string[];
  userData: { name: string, type: string, avatar: string };
}

const Dashboard: React.FC<DashboardProps> = ({
  activeNav,
  setActiveNav,
  activeTab,
  setActiveTab,
  showUpgrade,
  setShowUpgrade,
  isLoggedIn,
  startDownload,
  isDownloading,
  downloadProgress,
  scrollRef,
  getTitle,
  tabs,
  userData
}) => {
  const [isLogOpen, setIsLogOpen] = React.useState(false);
  const [isWhatNewOpen, setIsWhatNewOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [showAccountsModal, setShowAccountsModal] = React.useState(false);
  const [showOfflineLogin, setShowOfflineLogin] = React.useState(false);
  const [showElyByLogin, setShowElyByLogin] = React.useState(false);
  const [launchStatus, setLaunchStatus] = React.useState<{ message: string, percentage: number, status: string } | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);
  const [globalRefreshKey, setGlobalRefreshKey] = React.useState(Date.now());

  const handleGlobalRefresh = () => {
    setGlobalRefreshKey(prev => prev + 1);
  };

  const handlePause = () => {
    console.log("Pause download requested");
    setIsPaused(true);
    // TODO: Call tauri command to pause download
  };

  const handleResume = () => {
    console.log("Resume download requested");
    setIsPaused(false);
    // TODO: Call tauri command to resume download
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel the download?")) {
      console.log("Cancel download requested");
      setLaunchStatus(null);
      setIsPaused(false);
      // TODO: Call tauri command to cancel download
      // For now, we just clear the status which hides the bar
    }
  };

  React.useEffect(() => {
    const unlisten = listen("launch-status", (event: any) => {
      setLaunchStatus(event.payload);

      // Auto open log window if enabled in settings
      if (event.payload.status === "starting") {
        invoke<any>("load_launcher_settings").then(config => {
          if (config && config.open_log_on_start) {
            setIsLogOpen(true);
          }
        }).catch(() => { });
      }

      if (event.payload.status === "success" || event.payload.status === "closed") {
        // Handle keep_launcher_open setting
        if (event.payload.status === "success") {
          invoke<any>("load_launcher_settings").then(config => {
            if (config && config.keep_launcher_open === false) {
              // Exit the launcher with a small delay for better UX
              setTimeout(() => {
                invoke("exit_launcher").catch(() => { });
              }, 2000);
            }
          }).catch(() => { });
        }

        setTimeout(() => setLaunchStatus(null), 1000);
      }
      if (event.payload.status === "error") {
        setTimeout(() => setLaunchStatus(null), 4000);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden relative">
      <Suspense fallback={null}>
        {showUpgrade && isLoggedIn && (
          <UpgradeBanner
            onCancel={() => setShowUpgrade(false)}
            onUpgrade={() => console.log("Upgrading...")}
          />
        )}
      </Suspense>
      <Sidebar
        activeTab={activeNav}
        setActiveTab={setActiveNav}
        onToggleLogs={() => setIsWhatNewOpen(true)}
        onOpenAccounts={() => setShowAccountsModal(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        userData={userData}
        refreshKey={globalRefreshKey}
      />

      <main className="flex-1 flex flex-col bg-main-bg overflow-hidden relative">
        <Suspense fallback={<LoadingOverlay />}>
          {activeNav !== "news" && activeNav !== "settings" && (
            <>
              <MinecraftHeader
                title={getTitle()}
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212] relative flex flex-col">
                {/* Play Tab */}
                <div className={activeTab === "Play" ? "block" : "hidden"}>
                  <GameHero activeNav={activeNav} />
                  <NewsSection category={activeNav} />
                </div>

                {/* Installations Tab */}
                <div className={activeTab === "Installations" ? "flex-1 flex flex-col" : "hidden"}>
                  <Installations activeNav={activeNav} onPlay={startDownload} />
                </div>

                {/* Skins Tab */}
                <div className={activeTab === "Skins" ? "flex-1 flex flex-col" : "hidden"}>
                  <Skins userData={userData} refreshKey={globalRefreshKey} onReload={handleGlobalRefresh} />
                </div>

                {/* Patch Notes Tab */}
                <div className={activeTab === "Patch notes" ? "flex-1 flex flex-col" : "hidden"}>
                  <PatchNotes category={activeNav as any} />
                </div>

                {/* FAQ Tab */}
                <div className={activeTab === "FAQ" ? "flex-1 flex flex-col" : "hidden"}>
                  <FAQ category={activeNav as any} />
                </div>

                {/* Default placeholder for unknown tabs */}
                {!tabs.includes(activeTab) && (
                  <div className="p-10 text-xl text-gray-500">{activeTab} section coming soon...</div>
                )}
              </div>
            </>
          )}

          {activeNav === "news" && <NewsFeed />}
          {activeNav === "settings" && <Settings onToggleLogs={() => setIsLogOpen(true)} />}
        </Suspense>

        <DownloadProgressBar
          isVisible={isDownloading || !!launchStatus}
          progress={launchStatus ? launchStatus.percentage : downloadProgress}
          message={launchStatus ? (isPaused ? `Paused: ${launchStatus.message}` : launchStatus.message) : (downloadProgress * 0.72).toFixed(2) + " MB / 72.04 MB"}
          status={launchStatus?.status}
          onClose={() => setLaunchStatus(null)}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          isPaused={isPaused}
        />

        <LogWindow isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
        {isWhatNewOpen && (
          <WhatNew onClose={() => setIsWhatNewOpen(false)} />
        )}

        <AccountsModal
          isOpen={showAccountsModal}
          onClose={() => setShowAccountsModal(false)}
          currentUsername={userData.name}
          currentAccountType={userData.type}
          refreshKey={globalRefreshKey}
          onSwitch={async (account) => {
            await invoke("save_secure_user", { userData: account });
            window.location.reload();
          }}
          onAddAccount={() => {
            setShowAccountsModal(false);
            setShowOfflineLogin(true);
          }}
          onAddElyBy={() => {
            setShowAccountsModal(false);
            setShowElyByLogin(true);
          }}
        />

        <OfflineLoginModal
          isOpen={showOfflineLogin}
          onClose={() => setShowOfflineLogin(false)}
          onConfirm={async (username) => {
            const newUser = {
              name: username,
              type: "Offline account",
              avatar: "/user_icon.png",
              token: null
            };
            await invoke("save_secure_user", { userData: newUser });
            setShowOfflineLogin(false);
            window.location.reload();
          }}
        />

        <ElyByLoginModal
          isOpen={showElyByLogin}
          onClose={() => setShowElyByLogin(false)}
          onSuccess={async () => {
            // ElyByLoginModal already saves the user via ely_by_authenticate, 
            // but we might need to refresh or just reload.
            setShowElyByLogin(false);
            window.location.reload();
          }}
        />

        {isHelpOpen && (
          <HelpModal onClose={() => setIsHelpOpen(false)} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
