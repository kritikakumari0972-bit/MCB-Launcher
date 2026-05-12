import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import LoadingOverlay from "@shared/components/LoadingOverlay";
import SplashScreen from "@shared/components/SplashScreen";
import SecurityWarningModal from "@shared/components/SecurityWarningModal";
import "@shared/components/App.css";

// Lazy load heavy components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

import { invoke } from "@tauri-apps/api/core";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isFetchDone, setIsFetchDone] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("Checking for updates");
  const [showUpgrade, setShowUpgrade] = useState(true);
  const [activeNav, setActiveNav] = useState("news");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("Play");
  const [userData, setUserData] = useState({ name: "Anonymous", type: "No account", avatar: "/user_icon.png" });
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const setupDeepLink = async () => {
      await onOpenUrl((urls: string[]) => {
        console.log(" [DeepLink] Received urls:", urls);
        urls.forEach((url) => {
          console.log(" [DeepLink] Processing:", url);
          if (url.startsWith("lflauncher://auth")) {
            console.log(" [DeepLink] Auth success, switching to Dashboard");
            const urlObj = new URL(url);
            const name = urlObj.searchParams.get("name") || "Player";
            const typeValue = urlObj.searchParams.get("type") || "Microsoft account";
            const avatar = urlObj.searchParams.get("avatar") || "";
            const token = urlObj.searchParams.get("token") || "";
            handleLogin(name, typeValue, avatar, token);
          }
        });
      });
    };

    setupDeepLink();

    // Listen for single instance events (secondary instance focused)
    const setupSingleInstance = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      await listen("single-instance-auth", (event: any) => {
        const args = event.payload as string[];
        console.log("[SingleInstance] Received args:", args);
        args.forEach((arg) => {
          if (arg.startsWith("lflauncher://auth")) {
            console.log("[SingleInstance] Auth link detected");
            try {
              const urlObj = new URL(arg);
              const name = urlObj.searchParams.get("name") || "Player";
              const typeValue = urlObj.searchParams.get("type") || "Microsoft account";
              const avatar = urlObj.searchParams.get("avatar") || "";
              const token = urlObj.searchParams.get("token") || "";
              handleLogin(name, typeValue, avatar, token);
            } catch (e) {
              handleLogin();
            }
          }
        });
      });
    };
    setupSingleInstance();

    // Debug: Press F8 to force login
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        console.log("[Debug] F8 pressed: Forcing login...");
        handleLogin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setFetchMessage("Fetching Minecraft Versions");
        const result: any = await invoke("get_all_version_sources");
        if (result.status === "updated") {
          setFetchMessage("Versions Updated");
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        console.error("Failed to fetch version sources:", err);
      } finally {
        setIsFetchDone(true);
      }
    };
    fetchVersions();
  }, []);

  const startDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 5;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
        setTimeout(() => setIsDownloading(false), 2000);
      }
      setDownloadProgress(prog);
    }, 200);
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      // Load settings to apply accessibility options
      try {
        const config: any = await invoke("load_launcher_settings");
        if (config && config.big_text) {
          document.documentElement.classList.add("big-text");
        }
      } catch (err) {
        console.error("Failed to load settings on boot:", err);
      }

      // Skip login in development if configured in .env
      if (import.meta.env.DEV && import.meta.env.VITE_SKIP_LOGIN === 'true') {
        setIsLoggedIn(true);
        setIsAuthChecked(true);
        return;
      }

      try {
        const savedUser: any = await invoke("get_secure_user");
        if (savedUser) {
          setUserData(savedUser);
          setIsLoggedIn(true);
          try {
            const syncedUser: any = await invoke("sync_user_from_backend");
            setUserData(syncedUser);
          } catch (syncErr) {
            console.warn("[SecureAuth] Backend sync failed:", syncErr);
          }
        }
      } catch (err) {
        console.error("[SecureAuth] INTEGRITY CHECK FAILED:", err);
        await invoke("logout_secure_user");
        setIsLoggedIn(false);
        setShowSecurityAlert(true);
      } finally {
        setIsAuthChecked(true);
      }
    };
    checkAuthStatus();
  }, []);

  const handleLogin = (name?: string, type?: string, avatar?: string, token?: string) => {
    setIsLoading(true);
    setTimeout(async () => {
      setIsLoading(false);
      const user = {
        name: name || "Player",
        type: type || "Microsoft account",
        avatar: avatar || "/user_icon.png",
        token: token || null
      };

      try {
        await invoke("save_secure_user", { userData: user });
        setUserData(user);
        setIsLoggedIn(true);
        navigate("/dashboard");
      } catch (err) {
        console.error("[SecureAuth] Failed to save secure data:", err);
      }
    }, 600);
  };

  const getTabs = () => {
    if (activeNav === "dungeons" || activeNav === "windows") {
      return ["Play", "Installations", "Patch notes", "FAQ"];
    }
    return ["Play", "Installations", "Skins", "Patch notes"];
  };

  const tabs = getTabs();

  useEffect(() => {
    if (activeNav !== "news" && activeNav !== "settings") {
      setActiveTab("Play");
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeNav]);

  useEffect(() => {
    if (activeNav !== "news" && activeNav !== "settings" && !tabs.includes(activeTab)) {
      setActiveTab("Play");
    }
  }, [activeNav, tabs, activeTab]);

  const getTitle = () => {
    switch (activeNav) {
      case "java": return "MINECRAFT: JAVA EDITION";
      case "windows": return "MINECRAFT FOR WINDOWS";
      case "dungeons": return "MINECRAFT DUNGEONS";
      default: return "NOTIFICATIONS";
    }
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {!isFetchDone && !showSplash && (
        <div className="fixed inset-0 z-11000 animate-in fade-in duration-700">
          <img
            src="/firstlaunchbackground.jpg"
            className="absolute inset-0 w-full h-full object-cover"
            alt="Loading Background"
          />
          <div className="absolute inset-0 bg-black/40" />
          <LoadingOverlay message={fetchMessage} />
        </div>
      )}

      {isLoading && <LoadingOverlay />}

      <SecurityWarningModal
        isOpen={showSecurityAlert}
        onClose={() => setShowSecurityAlert(false)}
      />

      <Suspense fallback={<LoadingOverlay />}>
        {isFetchDone && !showSplash && isAuthChecked && (
          <Routes>
            <Route
              path="/login"
              element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />}
            />
            <Route
              path="/dashboard"
              element={
                isLoggedIn ? (
                  <Dashboard
                    activeNav={activeNav}
                    setActiveNav={setActiveNav}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    showUpgrade={showUpgrade}
                    setShowUpgrade={setShowUpgrade}
                    isLoggedIn={isLoggedIn}
                    startDownload={startDownload}
                    isDownloading={isDownloading}
                    downloadProgress={downloadProgress}
                    scrollRef={scrollRef}
                    getTitle={getTitle}
                    tabs={tabs}
                    userData={userData}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/"
              element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
        )}
      </Suspense>
    </>
  );
}

export default App;
