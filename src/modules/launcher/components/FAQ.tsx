import React from "react";

interface FAQProps {
  category?: "windows" | "java" | "dungeons";
}

const FAQ: React.FC<FAQProps> = ({ category = "java" }) => {
  const getCategoryTitle = () => {
    if (category === "windows") return "Minecraft: Bedrock Edition";
    if (category === "dungeons") return "Minecraft Dungeons";
    return "Minecraft: Java Edition";
  };

  const renderDungeonsFAQ = () => (
    <div className="space-y-10">
      {/* Question 1 */}
      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">What is included in the Minecraft Dungeons Season Pass?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              The Season Pass is a new offering that includes four exciting new DLC packs for Minecraft Dungeons as they become available,
              starting with Howling Peaks in December 2020. The Season Pass does not include content from the Hero Pass, and vice versa.
              These two passes are sold separately.
            </p>
          </div>
        </div>
      </div>

      {/* Question 2 */}
      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">If I own Dungeons, which version should be showing up in the Launcher?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Whether you have purchased Minecraft Dungeons via the Microsoft Store or Minecraft.net shouldn't matter; both versions should
              now be playable from within the Launcher. However, if you have bought from the Microsoft Store, you will need to get the new
              Minecraft Launcher from the Microsoft Store to access your game within the Launcher; the Launcher will otherwise tell you your
              Launcher is incompatible with your version of Dungeons. With the old Launcher, you can only play the version purchased through
              Minecraft.net, whereas with the new Launcher you can play both.
            </p>
          </div>
        </div>
      </div>

      {/* Question 3 */}
      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">Does the DLC have to be purchased for each platform?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <div className="space-y-4">
              <p className="text-[#cccccc] text-[14px] leading-relaxed">
                Each DLC pack must be purchased separately for each platform. Purchasing content on one platform will not grant access on
                another platform.
              </p>
              <p className="text-[#cccccc] text-[14px] leading-relaxed">
                If you purchased the Launcher version (Windows 7 and up) of the game, be sure to purchase the DLC for the same on
                <a href="https://www.minecraftdungeons.net" className="text-blue-400 hover:underline inline-flex items-center gap-1 ml-1">
                  https://www.minecraftdungeons.net <span className="text-[10px]">↗</span>
                </a>.
              </p>
              <p className="text-[#cccccc] text-[14px] leading-relaxed">
                If you purchased the game for Windows 10 from the Microsoft Store, be sure to purchase the DLC from there.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">Does everyone need to own the DLC in order to play DLC missions together?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              If the host of a game session owns Jungle Awakens, players that do not own it can still join the host and play the new missions. All players will still be able to obtain new gear that is dropped, even if they don't own the DLC. You will need to purchase Jungle Awakens if you want to play the new missions in your own game session.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">What are the Dungeons minimum specifications for gameplay?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <div className="text-[#cccccc] text-[14px] leading-relaxed space-y-1">
              <p className="font-bold text-white mb-2">Windows PC Requirements:</p>
              <p>OS: Windows 11, 10, 8 or 7 (64-bit with the latest updates; some functionality not supported on Windows 7 and 8).</p>
              <p>Processor: Core i5 2.8GHz or equivalent.</p>
              <p>GPU: NVIDIA GeForce GTX 660 or AMD Radeon HD 7870 or equivalent DX11 GPU.</p>
              <p>Memory: 8GB RAM, 2GB VRAM.</p>
              <p>Storage: 6GB.</p>
              <p>DirectX®: DirectX 11.</p>
              <p>Monitor: 800x600.</p>
              <p>Performance scales with higher end systems. Not supported on Windows 10S.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">How do I repair my game?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              The Launcher will detect if the installation is corrupted or modified. You will be asked to repair your installation before proceeding to play.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">Minecraft Dungeons doesn't start due to missing files. MSVCP140.dll and/or VCRUNTIME140.dll was not found.</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Navigate to Settings - General and press the Repair button under the Minecraft Dungeons Installation section. This will install the needed redistributables and repair the game. Once completed, try to start the game again. If the issue remains, please report a bug <a href="#" className="text-blue-400 hover:underline">here ↗</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBedrockFAQ = () => (
    <div className="space-y-10">
      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">What is the Minecraft Launcher?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              The Minecraft Launcher is the portal into the world of Minecraft. The Launcher can not only help you install and play Minecraft games, but you can also go to the Launcher to learn about important Minecraft news and events. Previously only including Minecraft: Java Edition and Minecraft Dungeons, the Launcher now also includes Minecraft: Bedrock Edition, making this the next big step in the Launcher team’s quest to create a unified experience for all Minecraft players! Read more about the Launcher at <a href="https://aka.ms/NewMinecraftLauncherFAQ" className="text-blue-400 hover:underline">https://aka.ms/NewMinecraftLauncherFAQ ↗</a> .
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">I'm having trouble signing in to Minecraft: Bedrock Edition. What can I do?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Go to <a href="https://aka.ms/SigninProblemsFAQ" className="text-blue-400 hover:underline">aka.ms/SigninProblemsFAQ ↗</a> for information that might help you resolve this.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">What are the differences between Minecraft: Java Edition and Minecraft: Bedrock Edition?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              While every version of Minecraft is still Minecraft, the differences between Minecraft: Bedrock Edition and Minecraft: Java Edition can be quite extensive. For instance, Minecraft: Java Edition is PC only, whereas Minecraft: Bedrock Edition is multi-platform, being available on console, via mobile, and on PC. Go to <a href="https://aka.ms/JavaBedrockDifferences" className="text-blue-400 hover:underline">https://aka.ms/JavaBedrockDifferences ↗</a> to find out more about the differences between the two games.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">How can I find out about what the most recent Minecraft for Windows update includes?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              You can check out <a href="https://aka.ms/MinecraftUpdate" className="text-blue-400 hover:underline">https://aka.ms/MinecraftUpdate ↗</a> for detail on the most recent main release, and <a href="https://aka.ms/MinecraftBeta" className="text-blue-400 hover:underline">https://aka.ms/MinecraftBeta ↗</a> for detail on the most recent Beta release.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">Do I need to have the Minecraft Launcher installed to play Minecraft games? Do I have to go through the Minecraft Launcher to play Minecraft games?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              You do not need to have the Minecraft Launcher installed to play Minecraft for Windows; you can still open your game directly! The same is true for Minecraft Dungeons. However, if you want to play Minecraft: Java Edition, you will need to have the Minecraft Launcher installed to get into the game.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">Do I need to install the Minecraft Launcher to play Minecraft games on Xbox Game Pass for PC?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              You do need the Launcher installed if you want to play Minecraft: Java Edition through Xbox Game Pass for PC. However, while the Launcher is the easiest way to install and play the Minecraft for Windows and Minecraft Dungeons games, it is possible to launch these games directly after installing by going directly to their respective Microsoft Store pages. As such, the Minecraft Launcher is probably the easiest and most straightforward way to install and play all Minecraft games via a Game Pass for PC subscription.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">I didn't receive an item that I purchased in the Marketplace. What should I do?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Go to <a href="https://aka.ms/MarketplaceHelpFAQ" className="text-blue-400 hover:underline">aka.ms/MarketplaceHelpFAQ ↗</a> for suggestions to help resolve this problem.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">I am having Multiplayer connection problems. What can I do?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Go to <a href="https://aka.ms/ConnectionProblemsFAQ" className="text-blue-400 hover:underline">aka.ms/ConnectionProblemsFAQ ↗</a> to find solutions to Multiplayer Connectivity problems. This includes not being able to join a friend’s world, not being able to communicate with friends, and a host of other potential issues.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">I'm having Realms Plus connection problems. What can I do to fix this?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Go to <a href="https://aka.ms/RealmsPlusConnectionFAQ" className="text-blue-400 hover:underline">aka.ms/RealmsPlusConnectionFAQ ↗</a> for information about how to address common Realms connection issues.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">I need to edit child account settings to fix a Realms connection issue. How do I do that?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Go to <a href="https://aka.ms/ManageChildSettingsFAQ" className="text-blue-400 hover:underline">aka.ms/ManageChildSettingsFAQ ↗</a> for information on how to edit these settings to help fix your problem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderJavaFAQ = () => (
    <div className="space-y-10">
      <div className="flex gap-4">
        <span className="text-2xl font-black text-white shrink-0">Q</span>
        <div>
          <h3 className="text-[16px] font-bold text-white mb-2">How do I install mods for Minecraft: Java Edition?</h3>
          <div className="flex gap-4 mt-4">
            <span className="text-2xl font-black text-white shrink-0">A</span>
            <p className="text-[#cccccc] text-[14px] leading-relaxed">
              Minecraft: Java Edition supports mods through various loaders like Forge or Fabric. You can create multiple installations in the Launcher to manage different modded versions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-10 bg-[#2e2e2e] min-h-full">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-extrabold text-white text-center mb-4 uppercase">
          Frequently asked questions
        </h2>
        <p className="text-gray-400 text-center mb-10 text-[14px]">
          {category === "dungeons"
            ? "Here follows a summary of frequently asked questions and a few tips and tricks on how to resolve the problems."
            : `Here are some frequently asked questions about ${category === "windows" ? "Minecraft: Bedrock Edition" : getCategoryTitle()} and the Minecraft Launcher.`
          }
        </p>

        {category === "windows" && renderBedrockFAQ()}
        {category === "dungeons" && renderDungeonsFAQ()}
        {category === "java" && renderJavaFAQ()}
      </div>
    </div>
  );
};

export default FAQ;
