// Project 2100 - UI Controller
// Handles page rendering, animations, floaters, and user interactions.

const MAP_COORDINATES = {
  0: { x: 45, y: 44, name: "기지 본부" },
  1: { x: 70, y: 24 },
  2: { x: 16, y: 36 },
  3: { x: 86, y: 52 },
  4: { x: 28, y: 38 },
  5: { x: 24, y: 58 },
  6: { x: 12, y: 26 },
  7: { x: 72, y: 38 },
  8: { x: 38, y: 54 },
  9: { x: 24, y: 46 },
  10: { x: 22, y: 22 },
  11: { x: 58, y: 64 },
  12: { x: 32, y: 32 },
  13: { x: 19, y: 40 },
  14: { x: 66, y: 54 }
};

document.addEventListener("DOMContentLoaded", () => {
  // Load Game state first
  Game.loadGame();
  
  // Force enable JRPG sprite sheet mode for the active session
  if (Game.state && Game.state.character) {
    if (!Game.state.character.spriteSheetConfig) {
      Game.state.character.spriteSheetConfig = JSON.parse(JSON.stringify(Game.defaultState.character.spriteSheetConfig));
    }
    Game.state.character.spriteSheetConfig.enabled = true;
    if (!Game.state.character.spriteSheetConfig.url) {
      Game.state.character.spriteSheetConfig.url = "/player_sprite.png";
    }

    // All 10 hybrid JRPG sprites are exactly 10x4.
    Game.state.character.spriteSheetConfig.rows = 4;
    Game.state.character.spriteSheetConfig.cols = 10;
    Game.state.character.spriteSheetConfig.mappings = {
      idle: { row: 0, frames: 10 },
      walk: { row: 1, frames: 10 },
      attack: { row: 2, frames: 10 },
      special_attack: { row: 3, frames: 10 }
    };

    // Force transparentUrl = null to bypass localstorage cache and center with latest logic
    Game.state.character.spriteSheetConfig.transparentUrl = null;
    Game.saveGame();
  }
  
  // Setup sound mute state from preference
  const isMuted = localStorage.getItem("project2100_muted") === "true";
  if (isMuted) {
    sfx.muted = true;
    document.getElementById("btn-toggle-mute").textContent = "🔇 소리 꺼짐";
    const dialogMuteBtn = document.getElementById("btn-dialog-toggle-mute");
    if (dialogMuteBtn) dialogMuteBtn.textContent = "🔇 소리 꺼짐";
  }

  // Initialize UI components
  window.UI = {
    init() {
      this.setupTitleScreen();
      this.setupCharSelection();
      this.setupNavigation();
      this.setupBaseCamp();
      this.setupWorldMap();
      this.setupCombatControls();
      this.setupDevCheats();
      this.generateAshParticles();
      
      // Setup the Walkable Bunker Map
      this.setupBunkerMap();

      // Setup Style Customizer Modal
      this.setupCustomizeModal();

      // Start JRPG sprite animation loop
      this.startSpriteAnimationLoop();

      // Setup the Status page Training Room listener
      const trBtn = document.getElementById("btn-status-run-training");
      if (trBtn) {
        trBtn.addEventListener("click", () => {
          const xpCost = Math.max(20, Math.floor(Game.state.character.level * 40));
          const xpGain = Math.max(30, Math.floor(Game.state.character.xpNeeded * 0.4));
          if (Game.state.resources.radiation >= xpCost) {
            Game.state.resources.radiation -= xpCost;
            Game.gainXP(xpGain);
            if (window.sfx) window.sfx.playLevelUp();
            this.updateAll();
          }
        });
      }

      // Setup the Status page Level Up listener
      const lvlBtn = document.getElementById("btn-status-levelup");
      if (lvlBtn) {
        lvlBtn.addEventListener("click", () => {
          const c = Game.state.character;
          const cost = Math.max(50, Math.floor(c.level * 100));
          
          if (Game.state.resources.radiation >= cost) {
            Game.state.resources.radiation -= cost;
            c.level++;
            c.xp = 0;
            c.xpNeeded = Math.floor(100 * Math.pow(1.25, c.level - 1));
            Game.addLog(`⭐ 레벨 업! 요원이 Lv.${c.level}에 도달했습니다! (소모: ${cost} Rad)`);
            if (window.sfx) window.sfx.playLevelUp();
            
            // Floating text effect
            this.spawnTextEffect(true, "LEVEL UP! ⭐", "var(--yellow)");
            
            this.updateAll();
          } else {
            Game.addLog(`⚠️ 방사능 재화가 부족합니다! (필요: ${cost} Rad / 보유: ${Game.state.resources.radiation} Rad)`);
            this.showCustomDialog({
              title: "⚠️ 전술 통제실 안내",
              message: `즉시 레벨업에 필요한 방사능이 부족합니다.<br>필요: <span style="color:var(--green); font-weight:bold;">${cost} Rad</span><br>보유: <span style="color:var(--yellow); font-weight:bold;">${Game.state.resources.radiation} Rad</span>`
            });
          }
        });
      }

      // Initial loot grid population
      this.renderLootGrid();
      
      this.updateAll();
      Game.addLog("기지 시스템이 온라인 상태입니다.");
    },

    getMapElement(id) {
      const modal = document.getElementById("bunker-terminal-modal");
      if (modal && modal.style.display !== "none") {
        const el = modal.querySelector(`#${id}`);
        if (el) return el;
      }
      return document.getElementById(id);
    },

    toggleNavigationForCombat(inCombat) {
      const navTabs = document.querySelector(".nav-tabs");
      if (navTabs && navTabs.style) {
        navTabs.style.display = "flex";
      }

      const tabs = document.querySelectorAll(".tab-btn");
      tabs.forEach(tab => {
        const target = tab.getAttribute("data-tab");
        if (target === "tab-shelter") {
          tab.style.display = inCombat ? "none" : "block";
        } else if (target === "tab-combat") {
          tab.style.display = "none";
        } else {
          tab.style.display = "block";
        }
      });
    },

    showCustomDialog({ title, message, type, placeholder, value, onConfirm, onCancel }) {
      const modal = document.getElementById("custom-dialog-modal");
      const titleEl = document.getElementById("custom-dialog-title");
      const bodyEl = document.getElementById("custom-dialog-body");
      const buttonsEl = document.getElementById("custom-dialog-buttons");
      if (!modal || !bodyEl || !buttonsEl) return;

      if (titleEl) titleEl.textContent = title || "📡 시스템 전술 안내";

      bodyEl.innerHTML = "";
      buttonsEl.innerHTML = "";

      if (type === "prompt") {
        const textMsg = document.createElement("div");
        textMsg.innerHTML = message;
        bodyEl.appendChild(textMsg);

        const input = document.createElement("textarea");
        input.id = "custom-dialog-input";
        input.value = value || "";
        input.placeholder = placeholder || "";
        input.style.width = "100%";
        input.style.height = "100px";
        input.style.marginTop = "10px";
        input.style.background = "#111";
        input.style.color = "#fff";
        input.style.border = "1px solid var(--grey)";
        input.style.borderRadius = "4px";
        input.style.padding = "8px";
        input.style.fontFamily = "monospace";
        input.style.fontSize = "11px";
        input.style.resize = "none";
        bodyEl.appendChild(input);

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn-dev";
        cancelBtn.style.flex = "1";
        cancelBtn.style.borderColor = "var(--grey)";
        cancelBtn.style.color = "var(--text-muted)";
        cancelBtn.textContent = "취소";
        cancelBtn.onclick = () => {
          modal.style.display = "none";
          if (onCancel) onCancel();
        };

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn-dev";
        confirmBtn.style.flex = "1";
        confirmBtn.textContent = "확인";
        confirmBtn.onclick = () => {
          modal.style.display = "none";
          if (onConfirm) onConfirm(input.value);
        };

        buttonsEl.appendChild(cancelBtn);
        buttonsEl.appendChild(confirmBtn);

      } else if (type === "confirm") {
        bodyEl.innerHTML = message;

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn-dev";
        cancelBtn.style.flex = "1";
        cancelBtn.style.borderColor = "var(--red)";
        cancelBtn.style.color = "var(--red)";
        cancelBtn.textContent = "취소 (새로 시작)";
        cancelBtn.onclick = () => {
          modal.style.display = "none";
          if (onCancel) onCancel();
        };

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn-dev";
        confirmBtn.style.flex = "1";
        confirmBtn.textContent = "확인 (이어서 하기)";
        confirmBtn.onclick = () => {
          modal.style.display = "none";
          if (onConfirm) onConfirm();
        };

        buttonsEl.appendChild(cancelBtn);
        buttonsEl.appendChild(confirmBtn);

      } else if (type === "general-confirm") {
        bodyEl.innerHTML = message;

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn-dev";
        cancelBtn.style.flex = "1";
        cancelBtn.style.borderColor = "var(--grey)";
        cancelBtn.style.color = "var(--text-muted)";
        cancelBtn.textContent = "취소";
        cancelBtn.onclick = () => {
          modal.style.display = "none";
          if (onCancel) onCancel();
        };

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn-dev";
        confirmBtn.style.flex = "1";
        confirmBtn.textContent = "확인";
        confirmBtn.onclick = () => {
          modal.style.display = "none";
          if (onConfirm) onConfirm();
        };

        buttonsEl.appendChild(cancelBtn);
        buttonsEl.appendChild(confirmBtn);

      } else {
        bodyEl.innerHTML = message;

        const okBtn = document.createElement("button");
        okBtn.className = "btn-dev";
        okBtn.style.flex = "1";
        okBtn.textContent = "확인";
        okBtn.onclick = () => {
          modal.style.display = "none";
          if (onConfirm) onConfirm();
        };

        buttonsEl.appendChild(okBtn);
      }

      modal.style.display = "flex";
      if (window.sfx) window.sfx.playClick();
    },

    updateAll() {
      this.updateGlobalHeader();
      this.updateSidebar();
      this.renderShelter();
      this.renderWorldMap();
      this.updateLogs();
      this.renderBossDatabase();

      // Update Training Room Info
      const xpCost = Math.max(20, Math.floor(Game.state.character.level * 40));
      const xpGain = Math.max(30, Math.floor(Game.state.character.xpNeeded * 0.4));
      const trInfo = document.getElementById("lbl-training-info");
      const trBtn = document.getElementById("btn-status-run-training");
      if (trInfo && trBtn) {
        trInfo.innerHTML = `소모 비용: <span style="color:var(--green); font-weight:bold;">${xpCost} Rad</span> | 획득 경험치: <span style="color:var(--cyan); font-weight:bold;">+${xpGain} XP</span>`;
        if (Game.state.resources.radiation >= xpCost) {
          trBtn.disabled = false;
        } else {
          trBtn.disabled = true;
        }
      }

      // Update Level Up Button
      const lvlBtn = document.getElementById("btn-status-levelup");
      if (lvlBtn) {
        const cost = Math.max(50, Math.floor(Game.state.character.level * 100));
        lvlBtn.textContent = `⭐ 즉시 레벨업 (${cost} Rad)`;
        if (Game.state.resources.radiation >= cost) {
          lvlBtn.disabled = false;
          lvlBtn.style.opacity = "1";
          lvlBtn.style.cursor = "pointer";
        } else {
          lvlBtn.disabled = true;
          lvlBtn.style.opacity = "0.5";
          lvlBtn.style.cursor = "not-allowed";
        }
      }
      
      // Populate and update the 5x4 Loot Grid
      this.renderLootGrid();
      
      // Check if transparentUrl is null and background cleaning is needed
      const char = Game.state.character;
      if (char && char.spriteSheetConfig && char.spriteSheetConfig.enabled && !char.spriteSheetConfig.transparentUrl && !this._isCleaningBackground) {
        this._isCleaningBackground = true;
        const s = char.spriteSheetConfig;
        this.cleanSpriteBackground(s.url || "/player_sprite.png", s.cols || 10, s.rows || 4, (dataUrl, activeFrames) => {
          s.transparentUrl = dataUrl;
          s.activeFrames = activeFrames;
          this._isCleaningBackground = false;
          // Refresh avatar rendering once transparency is ready
          const avatar = document.getElementById("bunker-player-avatar");
          if (avatar) avatar.innerHTML = SVGRenderer.renderPlayer(char);
          const battleAvatar = document.getElementById("battle-player-avatar");
          if (battleAvatar) battleAvatar.innerHTML = SVGRenderer.renderPlayer(char);
        });
      }

      // Sync walkable player avatar visuals to reflect current equipment/mutations
      const avatar = document.getElementById("bunker-player-avatar");
      if (avatar) avatar.innerHTML = SVGRenderer.renderPlayer(Game.state.character);
    },

    // 2D Walkable Bunker Lobby Setup
    setupBunkerMap() {
      this.bunkerPlayer = {
        px: 50.0, // percentage x (0-100)
        py: 50.0, // percentage y (0-100)
        targetPx: 50.0,
        targetPy: 50.0,
        isWalking: false,
        facingRight: true,
        activeTerminal: null
      };

      const mapArea = document.getElementById("bunker-map-area");
      const avatar = document.getElementById("bunker-player-avatar");

      if (!mapArea || !avatar) return;

      // Render player sprite inside bunker
      avatar.innerHTML = SVGRenderer.renderPlayer(Game.state.character);

      // 1. Mouse/Tap click to move
      mapArea.addEventListener("click", (e) => {
        const rect = mapArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert to percentage coordinates responsively
        this.bunkerPlayer.targetPx = Math.max(5, Math.min(95, (clickX / rect.width) * 100));
        this.bunkerPlayer.targetPy = Math.max(15, Math.min(85, (clickY / rect.height) * 100));
        
        if (window.sfx) window.sfx.playClick();
      });

      // 2. Keyboard W, A, S, D, Arrow keys movement
      window.addEventListener("keydown", (e) => {
        const activeTab = document.querySelector(".tab-btn.active");
        if (!activeTab || activeTab.getAttribute("data-tab") !== "tab-shelter") return;

        let step = 4.5; // move 4.5% per press
        let moved = false;

        if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
          this.bunkerPlayer.targetPy = Math.max(15, this.bunkerPlayer.targetPy - step);
          moved = true;
        }
        if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
          this.bunkerPlayer.targetPy = Math.min(85, this.bunkerPlayer.targetPy + step);
          moved = true;
        }
        if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          this.bunkerPlayer.targetPx = Math.max(5, this.bunkerPlayer.targetPx - step);
          moved = true;
        }
        if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          this.bunkerPlayer.targetPx = Math.min(95, this.bunkerPlayer.targetPx + step);
          moved = true;
        }

        if (moved) {
          this.bunkerPlayer.targetPx = Math.max(5, Math.min(95, this.bunkerPlayer.targetPx));
          this.bunkerPlayer.targetPy = Math.max(15, Math.min(85, this.bunkerPlayer.targetPy));
          e.preventDefault();
        }
      });

      // 3. Station click to walk directly to them
      const stations = [
        { id: "station-shelter", px: 15, py: 45, type: "shelter" },
        { id: "station-shop", px: 45, py: 70, type: "shop" },
        { id: "station-training", px: 78, py: 50, type: "training" },
        { id: "station-database", px: 60, py: 25, type: "database" },
        { id: "station-shuttle", px: 30, py: 20, type: "shuttle" }
      ];

      stations.forEach(st => {
        const el = document.getElementById(st.id);
        if (el) {
          el.addEventListener("click", (e) => {
            e.stopPropagation(); // prevent mapArea click from overriding target
            this.bunkerPlayer.targetPx = st.px;
            this.bunkerPlayer.targetPy = st.py;
            if (window.sfx) window.sfx.playClick();
          });
        }
      });

      // Close terminal modal handler
      const terminalModal = document.getElementById("bunker-terminal-modal");
      const closeTerminalBtn = document.getElementById("btn-close-terminal-modal");
      if (closeTerminalBtn && terminalModal) {
        closeTerminalBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          terminalModal.style.display = "none";
          // Shift coordinates slightly down by 14% to avoid instant re-triggering
          const bp = this.bunkerPlayer;
          if (bp) {
            bp.py = Math.min(85, bp.py + 14);
            bp.targetPy = bp.py;
            bp.activeTerminal = null;
          }
        });
      }

      // Start the animation frame loop
      this.startBunkerLoop();
    },

    startBunkerLoop() {
      const avatar = document.getElementById("bunker-player-avatar");
      if (!avatar) return;

      const update = () => {
        const activeTab = document.querySelector(".tab-btn.active");
        if (activeTab && activeTab.getAttribute("data-tab") === "tab-shelter") {
          const bp = this.bunkerPlayer;
          const dx = bp.targetPx - bp.px;
          const dy = bp.targetPy - bp.py;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist > 1.2) {
            bp.isWalking = true;
            bp.facingRight = dx > 0;
            
            // Move speed coefficient
            const speed = 1.8; 
            bp.px += (dx / dist) * speed;
            bp.py += (dy / dist) * speed;

            avatar.classList.add("walking");
          } else {
            bp.px = bp.targetPx;
            bp.py = bp.targetPy;
            bp.isWalking = false;
            avatar.classList.remove("walking");
          }

          // Apply coordinates in CSS percentage
          avatar.style.left = bp.px + "%";
          avatar.style.top = bp.py + "%";
          avatar.style.transform = `translate(-50%, -100%) ${bp.facingRight ? "scaleX(1)" : "scaleX(-1)"}`;

          // Check proximity to terminals
          this.checkTerminalProximity();
        }
        
        requestAnimationFrame(update);
      };
      
      requestAnimationFrame(update);
    },

    checkTerminalProximity() {
      const bp = this.bunkerPlayer;
      const stations = [
        { id: "station-shelter", px: 15, py: 45, type: "shelter" },
        { id: "station-shop", px: 45, py: 70, type: "shop" },
        { id: "station-training", px: 78, py: 50, type: "training" },
        { id: "station-database", px: 60, py: 25, type: "database" },
        { id: "station-shuttle", px: 30, py: 20, type: "shuttle" }
      ];

      let nearTerminal = null;
      
      stations.forEach(st => {
        const dist = Math.sqrt((bp.px - st.px)**2 + (bp.py - st.py)**2);
        const el = document.getElementById(st.id);
        
        if (dist < 12.0) { // Within 12% distance
          nearTerminal = st.type;
          if (el) el.classList.add("active-glow");
        } else {
          if (el) el.classList.remove("active-glow");
        }
      });

      if (bp.activeTerminal !== nearTerminal) {
        bp.activeTerminal = nearTerminal;
        this.openTerminalPanel(nearTerminal);
      }
    },

    openTerminalPanel(type) {
      const modal = document.getElementById("bunker-terminal-modal");
      const placeholder = document.getElementById("terminal-content-placeholder");
      const titleEl = document.getElementById("terminal-modal-title");
      if (!placeholder || !modal) return;

      if (!type) {
        modal.style.display = "none";
        placeholder.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 35px;">
            <span style="font-size: 40px; display: block; margin-bottom: 10px;">👤</span>
            바닥을 터치하여 요원을 각 단말기로 이동시키면 상호작용 패널이 열립니다.
          </div>
        `;
        return;
      }

      // Display centralized modal popup
      modal.style.display = "flex";

      if (window.sfx) window.sfx.playEvolve();

      if (type === "shelter") {
        if (titleEl) titleEl.textContent = "🧬 세포 격리실 (신체 개조 진화)";
        placeholder.innerHTML = `
          <div style="font-size:12px; color:var(--text-muted); margin-bottom: 10px;">
            안전 격리 캡슐 안에서 방사능 변이 리스크를 강제로 제어하고 신체를 개량합니다.
          </div>
          <div class="evo-tree-container" id="evo-tree-list"></div>
        `;
        this.renderShelter(); // render actual evolve nodes inside it!
      } else if (type === "shop") {
        if (titleEl) titleEl.textContent = "🛒 암시장 상인 (장비 보급 단말기)";
        placeholder.innerHTML = `
          <div style="font-size:12px; color:var(--text-muted); margin-bottom: 10px;">
            수집한 방사능 화폐를 거래하여 고화력 무기, 특수 방호복 및 최신 AI 보조 칩셋을 구매합니다.
          </div>
          <div class="shop-grid" id="shop-items-list"></div>
        `;
        this.renderShelter(); // renders shop list inside it!
      } else if (type === "training") {
        if (titleEl) titleEl.textContent = "🏋️ 신체 훈련실 (전투 자극 트레이닝)";
        const xpCost = Math.max(20, Math.floor(Game.state.character.level * 40));
        const xpGain = Math.max(30, Math.floor(Game.state.character.xpNeeded * 0.4));
        placeholder.innerHTML = `
          <div style="font-size:12px; color:var(--text-muted); margin-bottom: 15px;">
            격리 훈련기 안에서 오염물질을 주입하며 모의 전술 훈련을 실시해 고속 레벨 업을 도모합니다.
          </div>
          <div class="panel-container" style="background:rgba(0,0,0,0.3); border:1px solid var(--grey); border-radius:6px; padding:15px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:bold; font-family:var(--font-cyber); font-size:14px; color:#fff;">모의 실전 훈련 프로그램</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">소모 비용: <span style="color:var(--green); font-weight:bold;">${xpCost} Rad</span> | 획득 경험치: <span style="color:var(--cyan); font-weight:bold;">+${xpGain} XP</span></div>
            </div>
            <button class="btn-shop" id="btn-run-training" ${Game.state.resources.radiation >= xpCost ? "" : "disabled"}>훈련 개시</button>
          </div>
        `;
        document.getElementById("btn-run-training").addEventListener("click", () => {
          if (Game.state.resources.radiation >= xpCost) {
            Game.state.resources.radiation -= xpCost;
            Game.gainXP(xpGain);
            if (window.sfx) window.sfx.playLevelUp();
            this.updateAll();
            this.openTerminalPanel("training"); // reload
          }
        });
      } else if (type === "database") {
        if (titleEl) titleEl.textContent = "🖥️ 데이터 터미널 (기지 메인 로그)";
        placeholder.innerHTML = `
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
            중앙 양자 데이터 센터에서 내려받은 과거 기록 보관소 및 몬스터화 보스 식별 현황입니다.
          </div>
          <div class="lore-box" style="margin-bottom:15px;">
            <strong>🚨 오염 변종 보스 추적 데이터:</strong>
            <div class="boss-database-grid" id="boss-db-grid" style="margin-top:10px;"></div>
          </div>
          <div id="db-system-logs-container" class="panel-container" style="margin-top:10px;"></div>
        `;
        this.renderBossDatabase();
        this.updateLogs();
      } else if (type === "shuttle") {
        if (titleEl) titleEl.textContent = "🚀 대륙 수송선 단말기";
        // Continental travel launcher
        const currentRegId = Game.state.currentRegionId || 1;
        const isCompleted = Game.state.completedRegions.includes(currentRegId);
        
        // Allowed if completed current, or initial launch (0 regions completed)
        const canTravel = isCompleted || Game.state.completedRegions.length === 0;

        if (canTravel) {
          placeholder.innerHTML = `
            <div style="font-size:12px; color:var(--text-muted); margin-bottom: 12px;">
              대륙 간 전송을 위한 수송선 항법 장치가 정식 인가되었습니다. 이동할 대륙을 지도에서 클릭하십시오.
            </div>
            <div class="tactical-map-layout">
              <div class="tactical-map-wrapper" id="tactical-map-wrapper">
                <svg class="tactical-map-svg" viewBox="0 0 1000 500" width="100%" height="100%">
                  <defs>
                    <pattern id="tactical-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(139, 224, 16, 0.04)" stroke-width="0.8"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#tactical-grid)" />
                  <path class="map-landmass" d="M 80 180 L 150 100 L 250 80 L 450 70 L 680 60 L 850 80 L 940 120 L 960 210 L 920 280 L 840 330 L 780 430 L 710 420 L 680 340 L 600 410 L 550 380 L 530 320 L 450 310 L 390 340 L 320 280 L 220 250 L 120 260 Z" fill="none" stroke="rgba(139, 224, 16, 0.15)" stroke-width="1.5" />
                </svg>
                <div id="map-markers-container" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index:5;"></div>
                <div class="map-player-avatar" id="map-player-avatar"></div>
                <div class="map-transition-overlay" id="map-transition-overlay">
                  <div class="transition-msg">🛸 정찰 수송선 전송 시뮬레이션 중...</div>
                </div>
              </div>
              <div class="map-region-detail-panel" id="map-region-detail-panel">
                <div class="detail-placeholder">
                  <span style="font-size: 32px; display: block; margin-bottom: 8px;">🗺️</span>
                  지도 위의 탐험 점(Dot)을 클릭하면 정찰 위성 데이터 분석 정보가 표시됩니다.
                </div>
              </div>
            </div>
          `;
          // Initialize map design & logic inside the modal directly
          this.setupWorldMap();
          this.renderWorldMap();
        } else {
          const regionName = REGIONS_DATA[currentRegId]?.name || "현재 지역";
          placeholder.innerHTML = `
            <div class="panel-container" style="border-color:var(--red) !important; background:rgba(255,0,85,0.03); margin-top:5px; gap:8px;">
              <h4 style="color:var(--red); font-weight:bold;">🚨 경보: 대륙 간 추진 동력 봉인 잠금</h4>
              <p style="font-size:11px; line-height:1.4; color:var(--text-muted);">
                수송선의 보호막 추진 동력을 활성화하려면 현재 배속 대륙 <strong>[${regionName}]</strong>의 최종 숙주 괴수(10라운드 보스 스테이지)를 완전히 격퇴하여 탈출 인증 코드를 서버에 등록해야 합니다.
              </p>
              <div style="font-size:10px; color:var(--yellow); font-weight:bold; margin-top:5px;">
                미션: ${regionName}의 최종 10라운드 10전투 보스를 격파하십시오.
              </div>
            </div>
          `;
        }
      }
    },

    // Navigation Tabs Switching
    setupNavigation() {
      const tabs = document.querySelectorAll(".tab-btn");
      const panels = document.querySelectorAll(".tab-panel");
      
      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          const targetTab = tab.getAttribute("data-tab");
          
          // If in combat, open Status, Inventory, Traits as MODALS!
          if (Game.state.currentExploration) {
            if (targetTab === "tab-status" || targetTab === "tab-inventory" || targetTab === "tab-traits") {
              this.openCombatModal(targetTab);
              return;
            }
          }
          
          // Check if combat is active. If not, prevent manual entry unless exploring
          if (targetTab === "tab-combat" && !Game.state.currentExploration) {
            this.showCustomDialog({
              title: "⚠️ 대기실 경보",
              message: "현재 오염지 대륙에 진입하지 않았습니다. 대륙 탈출 수송선 단말기에서 탐험 지역을 먼저 선택하십시오!"
            });
            return;
          }

          // Force Shuttle interaction constraints for world map tab entry
          if (targetTab === "tab-map") {
            const currentRegId = Game.state.currentRegionId || 1;
            const isCompleted = Game.state.completedRegions.includes(currentRegId);
            const canTravel = isCompleted || Game.state.completedRegions.length === 0;

            if (!canTravel) {
              this.showCustomDialog({
                title: "⚠️ 추진 장치 잠금",
                message: `현재 구역 [${REGIONS_DATA[currentRegId].name}]의 최종 숙주를 격퇴해야 수송선 항법 지도가 가동됩니다.`
              });
              return;
            }
          }
          
          tabs.forEach(t => t.classList.remove("active"));
          panels.forEach(p => p.classList.remove("active"));
          
          tab.classList.add("active");
          const targetPanel = document.getElementById(targetTab);
          if (targetPanel) targetPanel.classList.add("active");

          // Pause/resume combat loop based on active tab
          if (targetTab === "tab-combat") {
            Game.resumeCombat();
          } else if (targetTab === "tab-status" || targetTab === "tab-inventory" || targetTab === "tab-traits" || targetTab === "tab-shelter") {
            Game.pauseCombat();
          }
          
          if (window.sfx) window.sfx.playClick();
        });
      });

      // Register combat modal close listeners
      const closeCombatModalBtn = document.getElementById("btn-close-combat-modal");
      if (closeCombatModalBtn) {
        closeCombatModalBtn.addEventListener("click", () => {
          this.closeCombatModal();
        });
      }

      const combatModalOverlay = document.getElementById("combat-tab-modal");
      if (combatModalOverlay) {
        combatModalOverlay.addEventListener("click", (e) => {
          if (e.target === combatModalOverlay) {
            this.closeCombatModal();
          }
        });
      }
    },

    openCombatModal(tabId) {
      const modal = document.getElementById("combat-tab-modal");
      const titleEl = document.getElementById("combat-modal-title");
      const bodyEl = document.getElementById("combat-modal-body");
      if (!modal || !titleEl || !bodyEl) return;

      // Pause combat
      Game.pauseCombat();

      // Clear any previous tab panel from the modal body back to main content
      this.closeCombatModal(true); // silent close to reset state

      // Find the tab panel element
      const panel = document.getElementById(tabId);
      if (!panel) return;

      // Set Title
      const titles = {
        "tab-status": "📊 요원 전술 상태창 (STATUS)",
        "tab-inventory": "🎒 전리품 보관소 & 상점 (INVENTORY)",
        "tab-traits": "🧬 세포 격리실 신체 개조 (TRAITS)"
      };
      titleEl.textContent = titles[tabId] || "시스템 분석 단말기";

      // Move panel into the modal body
      bodyEl.appendChild(panel);
      panel.classList.add("active"); // ensure it is visible inside the modal
      panel.style.display = "block"; // override any flex display issues inside modal

      // Show modal
      modal.style.display = "flex";
      this.activeCombatModalTab = tabId;

      if (window.sfx) window.sfx.playClick();
      this.updateAll();
    },

    closeCombatModal(silent = false) {
      const modal = document.getElementById("combat-tab-modal");
      const bodyEl = document.getElementById("combat-modal-body");
      if (!modal || !bodyEl) return;

      if (this.activeCombatModalTab) {
        const panel = document.getElementById(this.activeCombatModalTab);
        if (panel) {
          panel.classList.remove("active");
          panel.style.display = ""; // restore original display
          
          // Append back to main content area
          const mainContent = document.querySelector(".main-content");
          if (mainContent) {
            // Put it before tab-combat to preserve tab order
            const combatPanel = document.getElementById("tab-combat");
            if (combatPanel) {
              mainContent.insertBefore(panel, combatPanel);
            } else {
              mainContent.appendChild(panel);
            }
          }
        }
        this.activeCombatModalTab = null;
      }

      modal.style.display = "none";

      if (!silent) {
        if (window.sfx) window.sfx.playClick();
        // Resume combat!
        Game.resumeCombat();
      }
    },

    // Global Header labels updates
    updateGlobalHeader() {
      document.getElementById("lbl-global-rad").textContent = `${Game.state.resources.radiation} Rad`;
      const stats = Game.getStats();
      document.getElementById("lbl-global-capacity").textContent = `${stats.radCapacity} Rad`;
      
      // Calculate risk
      let riskPercent = 0;
      if (Game.state.currentExploration) {
        riskPercent = Game.getMonsterizationProb(Game.state.currentExploration.radGathered);
      }
      const lblRisk = document.getElementById("lbl-global-risk");
      lblRisk.textContent = `${riskPercent}%`;
      
      // Trigger warning pulse if risk is high
      if (riskPercent > 40) {
        lblRisk.classList.add("glow-pulse");
      } else {
        lblRisk.classList.remove("glow-pulse");
      }
    },

    // Sidebar panel updates
    updateSidebar() {
      const c = Game.state.character;
      const stats = Game.getStats();

      // Render player sprite
      const spriteContainer = document.getElementById("sidebar-sprite");
      spriteContainer.innerHTML = SVGRenderer.renderPlayer(c);

      document.getElementById("sidebar-char-name").textContent = c.name;
      
      // Compute subclass title based on tier
      const tierTitles = { 1: "낙진 생존자", 2: "변이 척후요원", 3: "세포 적응자", 4: "하이브리드 생명", 5: "융합 개체", 6: "초월 돌연변이", 7: "멸망의 주신" };
      document.getElementById("sidebar-char-level").textContent = `Lv.${c.level} ${tierTitles[c.evolutionTier]}`;

      // XP percentage
      const xpPercent = Math.min(100, Math.floor((c.xp / c.xpNeeded) * 100));
      document.getElementById("sidebar-xp-fill").style.width = `${xpPercent}%`;

      // Stats
      document.getElementById("stat-val-hp").textContent = `${stats.maxHp} / ${stats.maxHp}`;
      document.getElementById("stat-val-atk").textContent = stats.atk;
      document.getElementById("stat-val-def").textContent = stats.def;
      document.getElementById("stat-val-spd").textContent = stats.spd;

      // Gear names
      document.getElementById("gear-val-weapon").textContent = ITEMS_DATA.weapons[c.weapon]?.name || "기본 무기";
      document.getElementById("gear-val-armor").textContent = ITEMS_DATA.armors[c.armor]?.name || "기본 방호복";
      document.getElementById("gear-val-core").textContent = ITEMS_DATA.cores[c.core]?.name || "기본 전지";
      document.getElementById("gear-val-ai").textContent = ITEMS_DATA.ais[c.ai]?.name || "없음";
    },

    renderLootGrid() {
      const grid = document.getElementById("inventory-loot-grid");
      if (!grid) return;
      grid.innerHTML = "";

      const loots = [
        { name: "고농도 방사능 원광", icon: "💎", rarity: "Common", desc: "원자로 폭발지 근처에서 추출한 고농도 방사성 광석. 세포 변이를 자극하는 핵심 원료입니다.", val: 50 },
        { name: "폐회로 양자 보드", icon: "💾", rarity: "Rare", desc: "메가시티 폐허에서 수습한 손상된 양자 컴퓨터의 연산 회로 기판. 복원 시 희귀 AI 알고리즘을 해독할 수 있습니다.", val: 120 },
        { name: "오염된 괴수의 심장", icon: "❤️‍🔥", rarity: "Epic", desc: "시베리아 황무지 보스 거수의 심장. 여전히 강력한 방사열 에너지가 고동치고 있습니다.", val: 350 },
        { name: "티타늄 합금 기어", icon: "⚙️", rarity: "Common", desc: "벙커의 파괴된 기계 수색체에서 추출한 단단한 강철 합금 톱니바퀴.", val: 30 },
        { name: "액체 플라즈마 연료", icon: "🧪", rarity: "Rare", desc: "전투 수송선의 예비 추진제. 높은 연소 효율을 지닌 고농도 하이브리드 연료 화학물.", val: 150 },
        { name: "변이 융합 DNA 샘플", icon: "🧬", rarity: "Epic", desc: "자가 세포 복제를 반복하는 고도로 안정된 돌연변이 유전자 배열 데이터.", val: 300 },
        { name: "방쇄 차폐 나노 섬유", icon: "🕸️", rarity: "Rare", desc: "특수 방호복 강화에 쓰이는 방사능 차단용 인조 나노 고분자 직물.", val: 90 },
        { name: "유라시아 전술 위성 칩", icon: "📡", rarity: "Legendary", desc: "종말 이전 궤도상에 띄워진 전술 정찰 위성군 통제 마스터 칩. 낙진 아래 숨겨진 지하 쉘터 경로를 스캔합니다.", val: 800 },
        { name: "안전 격리 캡슐 잠금장치", icon: "🔒", rarity: "Common", desc: "안전 격리 쉘터에서 세포 고정을 유지하는 유압식 고강도 체결 걸쇠 파츠.", val: 20 },
        { name: "초전도 플라스마 코일", icon: "🌀", rarity: "Rare", desc: "과충전 제네레이터 내부에 장착되어 높은 자성을 유지하는 전기 추진 장치.", val: 180 },
        { name: "오염된 늑대의 발톱", icon: "🐾", rarity: "Common", desc: "외피를 찢을 정도로 날카롭게 진화한 야생 늑대의 생체 뼈 돌출 발톱.", val: 25 },
        { name: "핵분열 연료봉 폐기물", icon: "🔋", rarity: "Rare", desc: "서유럽 데드존 원전에서 방출된 소모 완료된 우라늄 핵연료봉 슬러그.", val: 140 },
        { name: "보조 AI 데이터 메모리", icon: "🧠", rarity: "Rare", desc: "파괴된 안드로이드의 자아 잔류 데이터가 포함된 소형 플래시 메모리 카드.", val: 110 },
        { name: "독성 촉수 점액 분비샘", icon: "💧", rarity: "Common", desc: "그리스 오염 생물들에게서 수집한 강력한 산성 마비독 점액샘.", val: 40 },
        { name: "전자기 펄스 유도 장치", icon: "🎛️", rarity: "Rare", desc: "일정 반경 내의 기계 유닛을 즉시 셧다운시키는 고주파 전자기 유도 코일.", val: 160 },
        { name: "나노 로봇 혈청 백신", icon: "💉", rarity: "Epic", desc: "세포 오염 리스크를 억제하여 영구 몬스터화를 일시적으로 면하게 해주는 나노 면역 주사.", val: 400 },
        { name: "알프스 지하 벙커 키카드", icon: "💳", rarity: "Epic", desc: "스위스 정찰 중 획득한 고성능 암호화 무선 마스터 보안 인증 키 카드.", val: 500 },
        { name: "최종 보스 빅풋의 털", icon: "👑", rarity: "Legendary", desc: "에베레스트 최후의 군주 빅풋의 온몸을 뒤덮고 있던 정전기 반응 차폐 모피 섬유 샘플.", val: 1000 },
        null,
        null
      ];

      loots.forEach((loot) => {
        const cell = document.createElement("div");
        cell.className = "loot-grid-cell";
        cell.style.background = "rgba(0, 0, 0, 0.4)";
        cell.style.border = "1px solid rgba(255, 255, 255, 0.08)";
        cell.style.borderRadius = "6px";
        cell.style.display = "flex";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        cell.style.cursor = loot ? "pointer" : "default";
        cell.style.fontSize = "22px";
        cell.style.aspectRatio = "1";
        cell.style.transition = "all 0.2s ease";

        const isCollected = Game.state.inventory.collectedLoots && Game.state.inventory.collectedLoots.includes(loot?.name);

        if (loot && isCollected) {
          cell.textContent = loot.icon;
          cell.title = loot.name;
          cell.addEventListener("mouseenter", () => {
            cell.style.borderColor = "var(--cyan)";
            cell.style.boxShadow = "0 0 8px rgba(139, 224, 16, 0.25)";
          });
          cell.addEventListener("mouseleave", () => {
            cell.style.borderColor = "rgba(255, 255, 255, 0.08)";
            cell.style.boxShadow = "none";
          });
          cell.addEventListener("click", () => {
            let color = "var(--text-main)";
            if (loot.rarity === "Rare") color = "var(--cyan)";
            if (loot.rarity === "Epic") color = "var(--purple)";
            if (loot.rarity === "Legendary") color = "var(--yellow)";

            this.showCustomDialog({
              title: `${loot.icon} ${loot.name}`,
              message: `
                <div style="font-size:12px; color:var(--text-muted); margin-bottom: 10px;">등급: <span style="color:${color}; font-weight:bold;">${loot.rarity}</span></div>
                <div style="font-size:13px; line-height:1.5; color:#fff; margin-bottom: 12px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 4px;">${loot.desc}</div>
                <div style="font-size:12px; color:var(--green); font-weight:bold;">💰 전술 감정 가치: ${loot.val} Rad</div>
              `
            });
          });
        } else {
          cell.innerHTML = `<span style="font-size: 10px; color: rgba(255,255,255,0.03);">EMPTY</span>`;
          cell.style.cursor = "default";
        }

        grid.appendChild(cell);
      });
    },

    // Evolution Tree & Shop render
    setupBaseCamp() {
      // Setup base listeners, if any. Clicking elements handles inside render
    },

    renderShelter() {
      const c = Game.state.character;
      const rad = Game.state.resources.radiation;
      const evoList = document.getElementById("evo-tree-list");
      
      if (evoList) {
        evoList.innerHTML = "";

        // Tier groups
        const tiers = {
          "1단계: 기초 세포 활성화": ["body_str", "body_vit", "body_spd"],
          "2단계: 신체 변이 발현": ["mut_claw", "mut_wings", "mut_tentacles"],
          "5단계: 복합 융합 진화 (2지역 완파 보상 조합)": [
            "plasma_beast", "quantum_destroyer", "nano_vampire", "undead_immortal", "ash_lord",
            "lava_tsunami", "illusion_goblin", "aurora_sprite", "steel_raider", "mechanic_titan"
          ],
          "6단계: 심화 초월 진화 (융합 특성 조합)": ["leviathan", "death_star", "nosferatu_lord", "ragnarok", "cosmic_fairy"],
          "7단계: 궁극 네메시스 탈피": ["nemesis"]
        };

        for (const [tierTitle, nodes] of Object.entries(tiers)) {
          const row = document.createElement("div");
          row.className = "evo-tier-row";
          row.innerHTML = `<div class="tier-label">${tierTitle}</div>`;

          const grid = document.createElement("div");
          grid.className = "evo-nodes";

          nodes.forEach(nodeId => {
            const t = TRAITS_DATA[nodeId];
            if (!t) return;

            const card = document.createElement("div");
            card.className = "evo-node";
            
            const isEvolved = c.evolvedTraits.includes(nodeId);
            let isLocked = false;
            
            // Prereq check
            if (t.req) {
              const hasReqRegions = t.req.every(rNum => Game.state.completedRegions.includes(parseInt(rNum)));
              if (!hasReqRegions) isLocked = true;
            }
            if (t.reqTraits) {
              const hasReqTraits = t.reqTraits.every(trId => c.evolvedTraits.includes(trId));
              if (!hasReqTraits) isLocked = true;
            }

            if (isEvolved) {
              card.classList.add("active-evolved");
            } else if (isLocked) {
              card.classList.add("locked");
            } else {
              card.classList.add("unlocked");
            }

            let reqText = "";
            if (t.req) {
              const names = t.req.map(num => REGIONS_DATA[num].name.split(" ")[0]).join("+");
              reqText = `<br><span style="color:var(--text-muted)">요구: ${names} 완파</span>`;
            }
            if (t.reqTraits) {
              const trNames = t.reqTraits.map(tid => TRAITS_DATA[tid].name.substring(0,4)).join("+");
              reqText = `<br><span style="color:var(--text-muted)">요구특성: ${trNames}</span>`;
            }

            card.innerHTML = `
              <div class="node-name">${t.name}</div>
              <div class="node-desc">${t.desc}${reqText}</div>
              <div class="node-cost">${isEvolved ? "진화 완료" : `${t.cost} Rad`}</div>
            `;

            if (!isEvolved && !isLocked) {
              card.addEventListener("click", () => {
                if (rad >= t.cost) {
                  Game.buyTrait(nodeId);
                  this.updateAll();
                } else {
                  this.showCustomDialog({
                    title: "☢️ 에너지 부족 경보",
                    message: "방사능 에너지가 부족하여 신체 세포 개조에 실패했습니다! 전투 아레나에서 오염수를 더 사냥하십시오."
                  });
                }
              });
            }

            grid.appendChild(card);
          });

          row.appendChild(grid);
          evoList.appendChild(row);
        }
      }

      // Render Shop items
      const shopList = document.getElementById("shop-items-list");
      if (shopList) {
        shopList.innerHTML = "";

        const shopCategories = [
          { title: "[무기] 근거리/원거리 전투 장비", type: "weapons", data: ITEMS_DATA.weapons },
          { title: "[방호복] 전술 납 차폐 방호복", type: "armors", data: ITEMS_DATA.armors },
          { title: "[핵전지] 소형 핵발전기 코어", type: "cores", data: ITEMS_DATA.cores },
          { title: "[보조 AI] 전도용 동맹 보조 AI", type: "ais", data: ITEMS_DATA.ais }
        ];

        shopCategories.forEach(cat => {
          const catHeader = document.createElement("div");
          catHeader.style.fontWeight = "bold";
          catHeader.style.fontSize = "12px";
          catHeader.style.color = "var(--cyan)";
          catHeader.style.marginTop = "10px";
          catHeader.textContent = cat.title;
          shopList.appendChild(catHeader);

          for (const [itemId, item] of Object.entries(cat.data)) {
            if (cat.type === "ais" && !["gpt", "claude", "gemini", "siri", "grok"].includes(itemId)) {
              if (!Game.state.inventory.ais.includes(itemId)) {
                let regionCleared = false;
                for (const [rNum, rData] of Object.entries(REGIONS_DATA)) {
                  if (rData.rewardAI === itemId && Game.state.completedRegions.includes(parseInt(rNum))) {
                    regionCleared = true;
                  }
                }
                if (!regionCleared) continue;
              }
            }

            const card = document.createElement("div");
            card.className = "shop-card";

            const isEquipped = c[cat.type === "weapons" ? "weapon" : cat.type === "armors" ? "armor" : cat.type === "cores" ? "core" : "ai"] === itemId;
            const isOwned = Game.state.inventory[cat.type].includes(itemId);

            if (isEquipped) card.classList.add("equipped");

            let priceText = "";
            let actionBtn = "";

            if (isEquipped) {
              actionBtn = `<button class="btn-shop owned" disabled>장착 중</button>`;
            } else if (isOwned) {
              actionBtn = `<button class="btn-shop equip" onclick="Game.equipItem('${cat.type}', '${itemId}'); window.UI.updateAll();">장비 장착</button>`;
            } else {
              priceText = `<div style="color:var(--green); font-size:11px; font-weight:bold;">${item.price} Rad</div>`;
              const canBuy = rad >= item.price;
              actionBtn = `<button class="btn-shop" ${canBuy ? "" : "disabled"} onclick="Game.buyUpgrade('${cat.type}', '${itemId}'); window.UI.updateAll();">장비 구매</button>`;
            }

            card.innerHTML = `
              <div class="shop-card-info">
                <div class="item-name">${item.name}</div>
                <div class="item-desc">${item.desc}</div>
                ${priceText}
              </div>
              <div class="shop-card-action">
                ${actionBtn}
              </div>
            `;
            shopList.appendChild(card);
          }
        });
      }
    },

    // World Map rendering
    setupWorldMap() {
      this.worldMapPlayer = {
        px: 45.0, // Ural base camp starting position
        py: 44.0,
        targetPx: 45.0,
        targetPy: 44.0,
        isMoving: false,
        facingRight: true,
        targetRegionId: null
      };
      this.selectedRegionId = null;

      // Render the player avatar inside map
      const avatar = this.getMapElement("map-player-avatar");
      if (avatar) {
        avatar.innerHTML = SVGRenderer.renderPlayer(Game.state.character);
      }

      // Generate the 14 region dot markers
      const container = this.getMapElement("map-markers-container");
      if (container) {
        container.innerHTML = "";
        for (let rId = 1; rId <= 14; rId++) {
          const coords = MAP_COORDINATES[rId];
          if (!coords) continue;

          // Marker Point
          const marker = document.createElement("div");
          marker.className = "map-marker";
          marker.id = `map-marker-${rId}`;
          marker.style.left = `${coords.x}%`;
          marker.style.top = `${coords.y}%`;

          // Label
          const label = document.createElement("div");
          label.className = "map-marker-label";
          label.id = `map-marker-label-${rId}`;
          label.textContent = REGIONS_DATA[rId].name.split(" ")[0]; // e.g. "시베리아", "서유럽"
          label.style.left = `${coords.x}%`;
          label.style.top = `${coords.y}%`;

          // Select Region on Click
          marker.addEventListener("click", () => {
            this.selectRegion(rId);
          });

          container.appendChild(marker);
          container.appendChild(label);
        }
      }

      // Start the frame animation loop for world map player walking
      this.startWorldMapLoop();
    },

    renderWorldMap() {
      // Sync map player avatar design to reflect current equipment/mutations
      const avatar = this.getMapElement("map-player-avatar");
      if (avatar) {
        avatar.innerHTML = SVGRenderer.renderPlayer(Game.state.character);
        avatar.style.left = this.worldMapPlayer.px + "%";
        avatar.style.top = this.worldMapPlayer.py + "%";
      }

      // Update region markers styles based on locked/unlocked/boss states
      for (let rId = 1; rId <= 14; rId++) {
        const marker = this.getMapElement(`map-marker-${rId}`);
        if (!marker) continue;

        const isUnlocked = Game.state.unlockedRegions.includes(rId);
        const isCompleted = Game.state.completedRegions.includes(rId);
        const hasBoss = !!Game.state.monsterizedBosses[rId];

        marker.className = "map-marker"; // reset
        if (!isUnlocked) {
          marker.classList.add("locked");
        } else if (hasBoss) {
          marker.classList.add("boss-active");
        } else if (isCompleted) {
          marker.classList.add("completed");
        } else {
          marker.classList.add("unlocked");
        }

        if (rId === this.selectedRegionId) {
          marker.classList.add("selected");
        }
      }
    },

    selectRegion(rId) {
      if (this.worldMapPlayer.isMoving) return;

      const isUnlocked = Game.state.unlockedRegions.includes(rId);
      if (!isUnlocked) {
        this.showCustomDialog({
          title: "🔒 영역 전송 거부",
          message: "선택한 오염 대륙의 좌표가 확보되지 않았습니다. 인접한 활성 대륙을 먼저 완파해 해금하십시오."
        });
        return;
      }

      this.selectedRegionId = rId;

      // Toggle active visual states
      for (let i = 1; i <= 14; i++) {
        const m = this.getMapElement(`map-marker-${i}`);
        if (m) m.classList.remove("selected");
      }
      const activeMarker = this.getMapElement(`map-marker-${rId}`);
      if (activeMarker) activeMarker.classList.add("selected");

      const region = REGIONS_DATA[rId];
      const isCompleted = Game.state.completedRegions.includes(rId);
      const hasBoss = !!Game.state.monsterizedBosses[rId];

      // Calculate levels
      let lvlText = "";
      const index = Game.state.selectionOrder.indexOf(rId);
      if (index !== -1) {
        lvlText = `Lv.${1 + index * 10}`;
      } else {
        lvlText = `Lv.${1 + Game.state.selectionOrder.length * 10}`;
      }
      if (rId === 14) lvlText = "최종 보스 Lv.130";

      const compText = isCompleted ? `<span style="color:var(--green); font-weight:bold;">[완파 완료]</span>` : "";
      const rewardText = rId === 14 ? "보스 처치 시 아포칼립스 엔딩" : `AI 파트너: ${region.aiName}<br>변이 훈련 특성: ${region.rewardTrait}`;

      let actionHtml = "";
      if (Game.state.currentExploration) {
        actionHtml = `<button class="btn-enter-region" style="background:#555; color:#888;" disabled>이미 탐험 중입니다</button>`;
      } else {
        actionHtml = `<button class="btn-enter-region" onclick="window.UI.startTravelToRegion(${rId});">탐험 개시 (수송선 전송)</button>`;
      }

      const detailPanel = this.getMapElement("map-region-detail-panel");
      if (detailPanel) {
        detailPanel.innerHTML = `
          <div class="panel-container" style="height:100%; justify-content: space-between;">
            <div>
              <h3>📡 [위성 데이터 분석]</h3>
              <div style="font-family: var(--font-cyber); font-size: 15px; font-weight: bold; margin-top: 10px;">
                지역 0${rId}: ${region.name} ${compText}
              </div>
              <div style="font-size: 12px; color: var(--yellow); margin-top: 5px; font-weight: bold;">
                ⚠️ 경보 등급: ${lvlText} ${hasBoss ? "(타락 요원 탐지됨!)" : ""}
              </div>
              
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                ${region.desc}
              </div>
              
              <div class="region-rewards" style="margin-top: 15px; font-size: 11px;">
                <div style="color: var(--text-muted); margin-bottom: 5px;">🎁 정복 시 보상 데이터:</div>
                <div style="color: var(--cyan); font-weight: bold; line-height: 1.4;">${rewardText}</div>
              </div>
            </div>
            
            ${actionHtml}
          </div>
        `;
      }

      if (window.sfx) window.sfx.playClick();
    },

    startTravelToRegion(rId) {
      const wmp = this.worldMapPlayer;
      const coords = MAP_COORDINATES[rId];
      if (!coords) return;

      wmp.targetPx = coords.x;
      wmp.targetPy = coords.y;
      wmp.targetRegionId = rId;
      wmp.isMoving = true;

      // Display travel status in details panel
      const detailPanel = this.getMapElement("map-region-detail-panel");
      if (detailPanel) {
        detailPanel.innerHTML = `
          <div class="panel-container traveling-status">
            <h3>🛸 [정찰 수송선 전송 중]</h3>
            <p>요원이 현재 <strong>${REGIONS_DATA[rId].name}</strong>(으)로 육로 이동 중입니다...</p>
            <div style="font-size: 11px; color: var(--cyan); margin-top: 5px;">목표 도달 시 전술 아레나 자동 진입</div>
            <div class="travel-progress-dots">...</div>
          </div>
        `;
      }
      if (window.sfx) window.sfx.playClick();
    },

    startWorldMapLoop() {
      const update = () => {
        const modal = document.getElementById("bunker-terminal-modal");
        const isModalVisible = modal && modal.style.display !== "none";
        const bp = this.bunkerPlayer;
        if (isModalVisible && bp && bp.activeTerminal === "shuttle") {
          const avatar = this.getMapElement("map-player-avatar");
          if (avatar) {
            const wmp = this.worldMapPlayer;
            
            if (wmp.isMoving) {
              const dx = wmp.targetPx - wmp.px;
              const dy = wmp.targetPy - wmp.py;
              const dist = Math.sqrt(dx*dx + dy*dy);

              if (dist > 1.0) {
                wmp.facingRight = dx > 0;
                const speed = 1.0; // movement speed on world map
                wmp.px += (dx / dist) * speed;
                wmp.py += (dy / dist) * speed;
                avatar.classList.add("walking");
              } else {
                wmp.px = wmp.targetPx;
                wmp.py = wmp.targetPy;
                wmp.isMoving = false;
                avatar.classList.remove("walking");
                
                // On arrival: trigger combat enter sequence!
                this.onArrivalAtRegion(wmp.targetRegionId);
              }
              
              avatar.style.left = wmp.px + "%";
              avatar.style.top = wmp.py + "%";
              avatar.style.transform = `translate(-50%, -100%) ${wmp.facingRight ? "scaleX(1)" : "scaleX(-1)"}`;
            }
          }
        }
        requestAnimationFrame(update);
      };
      
      requestAnimationFrame(update);
    },

    onArrivalAtRegion(rId) {
      if (!rId) return;

      const overlay = this.getMapElement("map-transition-overlay");
      if (overlay) {
        overlay.classList.add("active");
      }

      if (window.sfx) window.sfx.playEvolve();

      setTimeout(() => {
        // Run core game enter region logic
        Game.enterRegion(rId);

        // Update current region ID inside state
        Game.state.currentRegionId = rId;

        // Update all elements
        this.updateAll();

        // Restore travel positions back to basecamp after jump is completed
        this.worldMapPlayer.px = 45.0;
        this.worldMapPlayer.py = 44.0;
        this.worldMapPlayer.targetPx = 45.0;
        this.worldMapPlayer.targetPy = 44.0;
        this.worldMapPlayer.targetRegionId = null;

        // Reset details panel back to empty placeholder
        const detailPanel = this.getMapElement("map-region-detail-panel");
        if (detailPanel) {
          detailPanel.innerHTML = `
            <div class="detail-placeholder">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">🗺️</span>
              지도 위의 탐험 점(Dot)을 클릭하면 정찰 위성 데이터 분석 정보가 표시됩니다.
            </div>
          `;
        }
        this.selectedRegionId = null;

        setTimeout(() => {
          if (overlay) overlay.classList.remove("active");
        }, 600);
      }, 1200);
    },

    // Combat setup
    setupCombatControls() {
      // Active skill click
      document.getElementById("btn-combat-skill").addEventListener("click", () => {
        if (Game.combatState && Game.combatState.player.skillCooldown === 0) {
          Game.usePlayerSkill();
        }
      });

      // AI Ult click
      document.getElementById("btn-combat-ai-ult").addEventListener("click", () => {
        if (Game.combatState && Game.combatState.player.aiUltimateCharge >= 100) {
          Game.useAiUltimate();
        }
      });

      // Auto check
      document.getElementById("chk-auto-combat").addEventListener("change", (e) => {
        Game.autoCombat = e.target.checked;
      });

      // Speed selection buttons
      const speedBtns = document.querySelectorAll(".btn-speed");
      speedBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          speedBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const spd = parseInt(btn.getAttribute("data-speed"));
          Game.setCombatSpeed(spd);
        });
      });

      // Overlay modal close
      document.getElementById("btn-overlay-close").addEventListener("click", () => {
        const overlay = document.getElementById("battle-result-overlay");
        overlay.style.display = "none";
        
        // Restore base navigation tabs
        this.toggleNavigationForCombat(false);

        // Return to map or continue
        const tabs = document.querySelectorAll(".tab-btn");
        const panels = document.querySelectorAll(".tab-panel");
        
        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));
        
        // Go back to Safety Shelter Panel
        const shelterTab = document.querySelector('[data-tab="tab-shelter"]');
        if (shelterTab) shelterTab.classList.add("active");
        const shelterPanel = document.getElementById("tab-shelter");
        if (shelterPanel) shelterPanel.classList.add("active");
        
        if (window.sfx) window.sfx.playClick();
        this.updateAll();
      });
    },

    initCombatScreen() {
      // Hide base navigation tabs and show combat tab
      this.toggleNavigationForCombat(true);

      // Force switch to Combat Tab UI
      const tabs = document.querySelectorAll(".tab-btn");
      const panels = document.querySelectorAll(".tab-panel");
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      
      document.getElementById("tab-nav-combat").classList.add("active");
      document.getElementById("tab-combat").classList.add("active");

      // Set titles
      const exp = Game.state.currentExploration;
      document.getElementById("lbl-combat-region-name").textContent = REGIONS_DATA[exp.regionId].name;
      document.getElementById("lbl-combat-battle-counter").textContent = `라운드 ${exp.round}/10 | 전투 ${exp.battle}/10`;
      
      // Dynamic combat background
      const stage = document.getElementById("combat-arena-stage");
      if (stage && window.BackgroundRenderer) {
        window.BackgroundRenderer.applyBackground(stage, exp.regionId);
        stage.style.backgroundSize = "cover";
        stage.style.backgroundPosition = "center";
        stage.style.backgroundRepeat = "no-repeat";
      }

      const progVal = ((exp.round - 1) * 10 + exp.battle) / 100 * 100;
      document.getElementById("lbl-combat-progress-bar").style.width = `${progVal}%`;

      // Set initial loot value
      const lootEl = document.getElementById("lbl-combat-loot");
      if (lootEl) {
        lootEl.textContent = `${exp.radGathered} Rad`;
      }

      document.getElementById("combat-player-name").textContent = Game.state.character.name;
      document.getElementById("combat-enemy-name").textContent = Game.combatState.enemy.name;

      document.getElementById("combat-player-sprite").innerHTML = SVGRenderer.renderPlayer(Game.state.character);
      document.getElementById("combat-enemy-sprite").innerHTML = SVGRenderer.renderEnemy(Game.combatState.enemy.type, Game.combatState.enemy.config);

      // Clean combat log UI
      document.getElementById("combat-log-list").innerHTML = "<div>연속 전투 수송이 시작되었습니다.</div>";

      // Runner Style Combat Animations
      const pSpriteContainer = document.getElementById("sprite-container-player");
      const eSpriteContainer = document.getElementById("sprite-container-enemy");
      
      if (pSpriteContainer) {
        pSpriteContainer.classList.add("combat-jogging");
      }
      
      if (eSpriteContainer) {
        eSpriteContainer.classList.remove("combat-jogging", "enemy-death-slide");
        eSpriteContainer.classList.add("enemy-entering");
        
        if (this.enemyEnteringTimeout) clearTimeout(this.enemyEnteringTimeout);
        this.enemyEnteringTimeout = setTimeout(() => {
          eSpriteContainer.classList.remove("enemy-entering");
          if (Game.combatState && !Game.combatState.isFinished) {
            eSpriteContainer.classList.add("combat-jogging");
          }
        }, 1200);
      }
      
      // Start Footprint Interval
      if (this.footprintInterval) clearInterval(this.footprintInterval);
      this.footprintInterval = setInterval(() => {
        const container = document.getElementById("combat-arena-stage");
        if (!container) return;
        
        const footprint = document.createElement("div");
        footprint.className = "bunker-footprint";
        const randX = 26 + Math.random() * 4;
        const randY = 78 + Math.random() * 4;
        footprint.style.left = `${randX}%`;
        footprint.style.top = `${randY}%`;
        
        container.appendChild(footprint);
        setTimeout(() => footprint.remove(), 2000);
      }, 350);
    },

    updateCombatLog() {
      if (!Game.combatState) return;
      const logList = document.getElementById("combat-log-list");
      logList.innerHTML = "";
      
      Game.combatState.combatLog.forEach(line => {
        const d = document.createElement("div");
        d.textContent = line;
        logList.appendChild(d);
      });
      
      // Auto Scroll to bottom
      logList.scrollTop = logList.scrollHeight;
    },

    updateSpeedControls() {
      const speedBtns = document.querySelectorAll(".btn-speed");
      speedBtns.forEach(btn => {
        const spd = parseInt(btn.getAttribute("data-speed"));
        if (spd === Game.combatSpeed) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    },

    renderCombatArena() {
      if (!Game.combatState) return;
      
      const p = Game.combatState.player;
      const e = Game.combatState.enemy;

      // Update HP bars
      const pPercent = Math.max(0, (p.hp / p.maxHp) * 100);
      const ePercent = Math.max(0, (e.hp / e.maxHp) * 100);

      document.getElementById("combat-player-hp-fill").style.width = `${pPercent}%`;
      document.getElementById("combat-enemy-hp-fill").style.width = `${ePercent}%`;

      // Update Shield bar overlay
      const shieldPercent = Math.max(0, (p.shield / p.maxHp) * 100);
      document.getElementById("combat-player-shield-fill").style.width = `${shieldPercent}%`;

      // Update Action meters timeline info
      document.getElementById("lbl-player-meter-percent").textContent = `${Math.floor(p.actionMeter)}%`;
      document.getElementById("timeline-player-fill").style.width = `${Math.min(100, p.actionMeter)}%`;

      // Skills trigger button settings
      const btnSkill = document.getElementById("btn-combat-skill");
      if (p.skillCooldown > 0) {
        btnSkill.disabled = true;
        btnSkill.textContent = `⏳ 스킬 대기 (${p.skillCooldown}턴)`;
      } else {
        btnSkill.disabled = false;
        btnSkill.textContent = `🔥 스킬 사용 가능!`;
      }

      const btnAi = document.getElementById("btn-combat-ai-ult");
      btnAi.textContent = `🤖 AI 궁극기 (${Math.floor(p.aiUltimateCharge)}%)`;
      if (p.aiUltimateCharge >= 100 && p.aiUltimateCooldown === 0) {
        btnAi.disabled = false;
        btnAi.classList.add("glow-pulse");
      } else {
        btnAi.disabled = true;
        btnAi.classList.remove("glow-pulse");
        if (p.aiUltimateCooldown > 0) {
          btnAi.textContent = `🤖 AI 대기 (${p.aiUltimateCooldown}턴)`;
        }
      }

      // Update real-time loot (radiation) gathered
      const exp = Game.state.currentExploration;
      const lootEl = document.getElementById("lbl-combat-loot");
      if (lootEl && exp) {
        lootEl.textContent = `${exp.radGathered} Rad`;
      }

      this.updateGlobalHeader();
    },

    // Combat Visual FX Animations
    spawnTextEffect(isPlayerSide, text, color) {
      const container = document.getElementById("combat-arena-stage");
      const floater = document.createElement("div");
      floater.className = "floating-text";
      floater.style.color = color;
      floater.textContent = text;
      
      // Position offset
      const sideOffset = isPlayerSide ? "25%" : "75%";
      floater.style.left = sideOffset;
      floater.style.top = "40%";

      container.appendChild(floater);
      setTimeout(() => floater.remove(), 800);
    },

    triggerActionAnimation(side, animationType) {
      const sprite = document.getElementById(side === "player" ? "sprite-container-player" : "sprite-container-enemy");
      if (!sprite) return;

      if (animationType === "attack" || animationType === "skill") {
        const isPlayer = side === "player";
        const hasSpriteConfig = isPlayer && Game.state.character.spriteSheetConfig && Game.state.character.spriteSheetConfig.enabled;

        const anim = isPlayer ? "attack-dash-left" : "attack-dash-right";
        sprite.classList.add(anim);

        if (hasSpriteConfig) {
          const s = Game.state.character.spriteSheetConfig;
          const state = animationType === "skill" ? (s.mappings.special_attack ? "special_attack" : "attack") : "attack";
          const map = s.mappings[state] || s.mappings.idle;
          const row = map.row;
          
          // Determine the frame indices that are active for this row
          const activeRowFrames = (s.activeFrames && s.activeFrames[row] && s.activeFrames[row].length > 0)
            ? s.activeFrames[row]
            : Array.from({length: map.frames || 10}, (_, i) => i);

          // Pause normal idle loop
          if (window.spriteIntervalId) {
            clearInterval(window.spriteIntervalId);
            window.spriteIntervalId = null;
          }

          // Abort any active action animation playing
          if (window.activeActionTimeoutId) {
            clearTimeout(window.activeActionTimeoutId);
            window.activeActionTimeoutId = null;
          }

          s.currentState = state;
          let frameIdx = 0;

          const playNextFrame = () => {
            if (frameIdx >= activeRowFrames.length) {
              // Action animation complete. Revert state to idle and restart idle loop
              s.currentState = "idle";
              s.currentFrameIndex = 0;
              s.currentFrame = (s.activeFrames && s.activeFrames[0] && s.activeFrames[0][0]) || 0;
              this.restartSpriteInterval();
              
              // Force background position sync to idle frame 0
              const sprites = document.querySelectorAll(".sprite-sheet-player:not(.selection-origin-player):not(.selection-preview-player)");
              sprites.forEach(el => {
                const frame = s.currentFrame;
                const pctX = s.cols > 1 ? (frame / (s.cols - 1)) * 100 : 0;
                const pctY = s.rows > 1 ? (0 / (s.rows - 1)) * 100 : 0; // Row 0
                el.style.backgroundPosition = `${pctX}% ${pctY}%`;
              });
              sprite.classList.remove(anim);
              window.activeActionTimeoutId = null;
              return;
            }

            s.currentFrame = activeRowFrames[frameIdx];
            const sprites = document.querySelectorAll(".sprite-sheet-player:not(.selection-origin-player):not(.selection-preview-player)");
            sprites.forEach(el => {
              const frame = s.currentFrame;
              const pctX = s.cols > 1 ? (frame / (s.cols - 1)) * 100 : 0;
              const pctY = s.rows > 1 ? (row / (s.rows - 1)) * 100 : 0;
              el.style.backgroundPosition = `${pctX}% ${pctY}%`;
              const bgUrl = `url("${s.transparentUrl || s.url}")`;
              if (!el.style.backgroundImage.includes(s.transparentUrl || s.url)) {
                el.style.backgroundImage = bgUrl;
              }
            });

            frameIdx++;
            const frameDelay = animationType === "skill" ? 80 : 60;
            // Scale delay by combatSpeed (e.g. 1, 2, 4) to stay in sync with combat speed settings
            const speedFactor = (Game.combatSpeed && Game.combatSpeed !== 999) ? Game.combatSpeed : 1;
            window.activeActionTimeoutId = setTimeout(playNextFrame, frameDelay / speedFactor);
          };

          // Start the fluid frame playback
          playNextFrame();
        } else {
          // If no sprite config (or enemy side), just use default timeout to remove dash class
          const duration = animationType === "skill" ? 500 : 300;
          const speedFactor = (Game.combatSpeed && Game.combatSpeed !== 999) ? Game.combatSpeed : 1;
          setTimeout(() => sprite.classList.remove(anim), duration / speedFactor);
        }
      } else if (animationType === "hit") {
        sprite.classList.add("hit-shake");
        setTimeout(() => sprite.classList.remove("hit-shake"), 200);
      }
    },

    spawnBloodEffect() {
      const container = document.getElementById("combat-arena-stage");
      for (let i = 0; i < 6; i++) {
        const drop = document.createElement("div");
        drop.className = "blood-splatter";
        const dx = (Math.random() * 80 - 40) + "px";
        const dy = (Math.random() * -60 - 20) + "px";
        drop.style.setProperty("--dx", dx);
        drop.style.setProperty("--dy", dy);
        drop.style.left = "25%";
        drop.style.top = "60%";
        container.appendChild(drop);
        setTimeout(() => drop.remove(), 1200);
      }
    },

    spawnLaserEffect() {
      const container = document.getElementById("combat-arena-stage");
      const beam = document.createElement("div");
      beam.className = "laser-beam-effect";
      container.appendChild(beam);
      setTimeout(() => beam.remove(), 400);
    },

    spawnExplosionEffect() {
      const container = document.getElementById("combat-arena-stage");
      const ring = document.createElement("div");
      ring.className = "explosion-ring";
      ring.style.left = "75%";
      ring.style.top = "50%";
      container.appendChild(ring);
      setTimeout(() => ring.remove(), 500);
    },

    // Results panel overlay
    showBattleResultOverlay(success, isFinalChapterClear, radGatheredFallback, playerNameFallback) {
      // Clear Footprint Intervals & Jogging Styles
      if (this.footprintInterval) {
        clearInterval(this.footprintInterval);
        this.footprintInterval = null;
      }
      if (this.enemyEnteringTimeout) {
        clearTimeout(this.enemyEnteringTimeout);
        this.enemyEnteringTimeout = null;
      }
      
      const pSpriteContainer = document.getElementById("sprite-container-player");
      const eSpriteContainer = document.getElementById("sprite-container-enemy");
      if (pSpriteContainer) {
        pSpriteContainer.classList.remove("combat-jogging");
      }
      if (eSpriteContainer) {
        eSpriteContainer.classList.remove("combat-jogging", "enemy-entering", "enemy-death-slide");
      }

      const overlay = document.getElementById("battle-result-overlay");
      const title = document.getElementById("battle-overlay-title");
      const desc = document.getElementById("battle-overlay-desc");
      const buttonsContainer = document.getElementById("battle-overlay-buttons");
      
      overlay.className = "battle-overlay"; // reset
      overlay.style.display = "flex";

      const exp = Game.state.currentExploration;
      const radGatheredVal = exp ? exp.radGathered : (radGatheredFallback || 0);
      const regionIdVal = exp ? exp.regionId : (Game.state.currentRegionId || 1);
      const roundVal = exp ? exp.round : 10;
      const pNameVal = Game.combatState ? Game.combatState.player.name : (playerNameFallback || Game.state.character.name);

      if (success) {
        overlay.classList.add("victory");
        title.textContent = isFinalChapterClear ? "🏆 지역 완전 정복 완료!" : "🎉 챕터 전투 완패 돌파!";
        
        let rewardDesc = `축하합니다! 이번 챕터 연속 파이널 연전에서 기사회생하여 안전하게 복귀했습니다.<br><br>`;
        rewardDesc += `<span style="color:var(--green); font-weight:bold;">획득 방사능 정수: +${radGatheredVal} Rad</span><br>`;
        
        if (isFinalChapterClear) {
          const reward = REGIONS_DATA[regionIdVal];
          rewardDesc += `<span style="color:var(--cyan); font-weight:bold;">🔓 새로운 보조 AI 파트너 잠금 해제!</span><br>`;
          rewardDesc += `<span style="color:var(--yellow); font-weight:bold;">🔓 새로운 변이 훈련 노드 개방: ${reward.rewardTrait}</span><br>`;
          
          if (regionIdVal === 14) {
            rewardDesc += `<br><br><span style="color:var(--green); font-size:18px; font-weight:bold;">[인류 해방 엔딩 달성!]</span><br>유라시아 최후의 고유 숙주 [빅풋]을 억제하고 세계를 정화했습니다!`;
          }
        }

        desc.innerHTML = rewardDesc;

        if (isFinalChapterClear) {
          // Final clear -> return to shelter only
          buttonsContainer.innerHTML = `<button class="btn-overlay-close" id="btn-overlay-close-final" style="width:100%; font-weight:bold;">기지로 복귀 (대륙 정화 완료)</button>`;
          document.getElementById("btn-overlay-close-final").addEventListener("click", () => {
            overlay.style.display = "none";
            this.toggleNavigationForCombat(false);
            const tabs = document.querySelectorAll(".tab-btn");
            const panels = document.querySelectorAll(".tab-panel");
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            const shelterTab = document.querySelector('[data-tab="tab-shelter"]');
            if (shelterTab) shelterTab.classList.add("active");
            const shelterPanel = document.getElementById("tab-shelter");
            if (shelterPanel) shelterPanel.classList.add("active");
            if (window.sfx) window.sfx.playClick();
            this.updateAll();
          });
        } else {
          // Chapter cleared -> select Town or Continue
          buttonsContainer.innerHTML = `
            <button class="btn-overlay-close" id="btn-overlay-go-town" style="background:#4a5568; color:#fff; border:1px solid #fff; flex:1; min-width:120px;">마을로 가기</button>
            <button class="btn-overlay-continue" id="btn-overlay-continue" style="background:var(--green); color:#000; border:1px solid #000; font-weight:bold; flex:1; min-width:120px;">전투 계속 진행</button>
          `;

          document.getElementById("btn-overlay-go-town").addEventListener("click", () => {
            overlay.style.display = "none";
            this.toggleNavigationForCombat(false);
            const tabs = document.querySelectorAll(".tab-btn");
            const panels = document.querySelectorAll(".tab-panel");
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            const shelterTab = document.querySelector('[data-tab="tab-shelter"]');
            if (shelterTab) shelterTab.classList.add("active");
            const shelterPanel = document.getElementById("tab-shelter");
            if (shelterPanel) shelterPanel.classList.add("active");
            if (window.sfx) window.sfx.playClick();
            this.updateAll();
          });

          document.getElementById("btn-overlay-continue").addEventListener("click", () => {
            overlay.style.display = "none";
            if (window.sfx) window.sfx.playClick();
            if (Game.state.currentExploration) {
              Game.startBattle();
            }
          });
        }
      } else {
        overlay.classList.add("defeat");
        
        if (isFinalChapterClear) {
          title.textContent = "🚨 오염 유도 한계 초과: 아군 몬스터화!";
          let descText = `<span style="color:var(--red); font-weight:bold;">치명적인 세포 변이가 뇌까지 가득 찼습니다!</span><br><br>`;
          descText += `요원 [${pNameVal}]이 자아를 상실하고 폭주하여, 해당 오염지 대륙의 <span style="color:var(--red);">고유 몬스터화 보스</span>로 고착되었습니다.<br>`;
          descText += `소지하고 가던 모든 재산(${radGatheredVal} Rad)이 소실되었습니다.<br><br>`;
          descText += `기지 본부는 전력 보강을 위해 대체 예비 요원을 새로 영입합니다.`;
          desc.innerHTML = descText;
        } else {
          title.textContent = "💀 아군 전투 불능 (챕터 재시도)";
          let descText = `요원이 빈사 상태에 빠져 전투 불능이 되었습니다.<br>`;
          descText += `방사능 복합 수치가 다행히 임계점을 넘지 않아 자아를 유지한 채 퇴각하는 데 성공했습니다.<br><br>`;
          descText += `마을로 돌아가지 않고 현재 챕터(라운드 ${roundVal})의 전투 1부터 재도전합니다.`;
          desc.innerHTML = descText;
        }

        if (isFinalChapterClear) {
          // Monsterized: return to base and select a new character/origin
          buttonsContainer.innerHTML = `<button class="btn-overlay-close" id="btn-overlay-close-fail" style="width:100%; font-weight:bold;">기지로 복귀</button>`;
          document.getElementById("btn-overlay-close-fail").addEventListener("click", () => {
            overlay.style.display = "none";
            this.toggleNavigationForCombat(false);
            
            // Show character selection overlay so player can choose another origin
            const charSelOverlay = document.getElementById("char-selection-screen");
            if (charSelOverlay) {
              charSelOverlay.style.display = "flex";
            }
            if (window.sfx) window.sfx.playClick();
            this.updateAll();
          });
        } else {
          // Normal defeat: restart chapter
          buttonsContainer.innerHTML = `<button class="btn-overlay-close" id="btn-overlay-close-fail" style="width:100%; font-weight:bold;">챕터 재도전</button>`;
          document.getElementById("btn-overlay-close-fail").addEventListener("click", () => {
            overlay.style.display = "none";
            if (window.sfx) window.sfx.playClick();
            Game.restartCurrentChapter();
          });
        }
      }
      this.updateAll();
    },

    triggerEnemyDeathSlide() {
      const sprite = document.getElementById("sprite-container-enemy");
      if (sprite) {
        sprite.classList.remove("combat-jogging", "enemy-entering");
        sprite.classList.add("enemy-death-slide");
      }
    },

    // Rendering DB/Logs Page
    renderBossDatabase() {
      const grid = document.getElementById("boss-db-grid");
      if (!grid) return;
      grid.innerHTML = "";

      let hasBosses = false;

      for (const [rId, boss] of Object.entries(Game.state.monsterizedBosses)) {
        if (!boss) continue;
        hasBosses = true;

        const card = document.createElement("div");
        card.className = "boss-db-card";
        
        // Generate custom boss avatar SVG mini
        const miniSvg = SVGRenderer.renderPlayer(boss);

        card.innerHTML = `
          <div class="boss-db-avatar">${miniSvg}</div>
          <div class="boss-db-info">
            <div class="boss-db-name">${boss.name} (Lv.${boss.level})</div>
            <div style="color:var(--text-muted);">오염 배회지: ${REGIONS_DATA[rId].name}</div>
            <div style="color:var(--red); font-weight:bold;">HP: ${boss.hp} | ATK: ${boss.atk} | DEF: ${boss.def}</div>
            <div style="font-size:9px; color:var(--text-muted);">특성: ${boss.traits.slice(0, 3).map(tid => TRAITS_DATA[tid]?.name.substring(0,4)).join(", ") || "없음"}</div>
          </div>
        `;
        grid.appendChild(card);
      }

      if (!hasBosses) {
        grid.innerHTML = `<div style="color:var(--text-muted); font-size: 13px;">현재 각 지역에 몬스터화된 아군 요원이 없습니다. 안전한 상태입니다.</div>`;
      }
    },

    updateLogs() {
      const logsList = document.getElementById("combat-log-list");
      
      const systemLogPanel = document.getElementById("db-system-logs-container");
      if (systemLogPanel) {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "4px";
        container.style.fontFamily = "monospace";
        container.style.fontSize = "12px";
        
        Game.state.logs.forEach(l => {
          const row = document.createElement("div");
          row.textContent = l;
          container.appendChild(row);
        });

        systemLogPanel.innerHTML = "<h3>⚙️ 기지 전역 시스템 로그</h3>";
        systemLogPanel.appendChild(container);
      }
    },

    // Falling Fallout ash particle generator
    generateAshParticles() {
      const container = document.getElementById("ash-particle-layer");
      if (!container) return;
      container.innerHTML = "";

      for (let i = 0; i < 35; i++) {
        const flake = document.createElement("div");
        flake.className = "ash-flake";
        
        // Random sizes, speeds and positions
        const size = Math.random() * 4 + 2;
        const left = Math.random() * 100;
        const duration = Math.random() * 5 + 3;
        const delay = Math.random() * -5;

        flake.style.width = `${size}px`;
        flake.style.height = `${size}px`;
        flake.style.left = `${left}%`;
        flake.style.animationDuration = `${duration}s`;
        flake.style.animationDelay = `${delay}s`;

        container.appendChild(flake);
      }
    },

    // Cheats panel hooking
    setupDevCheats() {
      const consoleEl = document.getElementById("dev-testing-console");
      
      // Collapsible toggle
      document.getElementById("btn-toggle-dev").addEventListener("click", () => {
        consoleEl.classList.toggle("collapsed");
        document.getElementById("dev-toggle-icon").textContent = consoleEl.classList.contains("collapsed") ? "▲" : "▼";
      });

      // Mute toggle
      document.getElementById("btn-toggle-mute").addEventListener("click", (e) => {
        const isMuted = sfx.toggleMute();
        e.target.textContent = isMuted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐";
        localStorage.setItem("project2100_muted", isMuted ? "true" : "false");
      });

      // Save game
      document.getElementById("btn-save-game").addEventListener("click", () => {
        Game.saveGame();
        this.showCustomDialog({
          title: "💾 데이터 백업 완료",
          message: "요원의 전술 시뮬레이션 상태가 로컬 브라우저 저장소(LocalStorage)에 기록되었습니다."
        });
      });

      // Cheats
      document.getElementById("dev-cheat-rad").addEventListener("click", () => {
        Game.state.resources.radiation += 500;
        Game.addLog("[개발자 치트] 방사능 +500 Rad 획득");
        this.updateAll();
        if (window.sfx) window.sfx.playLevelUp();
      });

      document.getElementById("dev-cheat-lvl").addEventListener("click", () => {
        Game.gainXP(Game.state.character.xpNeeded - Game.state.character.xp);
        this.updateAll();
      });

      document.getElementById("dev-cheat-unlock").addEventListener("click", () => {
        for (let i = 1; i <= 14; i++) {
          if (!Game.state.unlockedRegions.includes(i)) Game.state.unlockedRegions.push(i);
        }
        Game.addLog("[개발자 치트] 전 대륙 탐험 지역 강제 잠금 해제");
        this.updateAll();
      });

      document.getElementById("dev-cheat-clear").addEventListener("click", () => {
        for (let i = 1; i <= 14; i++) {
          if (!Game.state.completedRegions.includes(i)) Game.state.completedRegions.push(i);
          if (!Game.state.inventory.ais.includes(REGIONS_DATA[i].rewardAI) && REGIONS_DATA[i].rewardAI) {
            Game.state.inventory.ais.push(REGIONS_DATA[i].rewardAI);
          }
        }
        Game.addLog("[개발자 치트] 전 대륙 지역 강제 완파 설정 완료");
        this.updateAll();
      });

      document.getElementById("dev-cheat-kill").addEventListener("click", () => {
        if (Game.combatState) {
          Game.combatState.player.hp = 0;
          Game.checkCombatVictory();
          Game.addLog("[개발자 치트] 아군 요원 강제 빈사 상태 유도");
        } else {
          this.showCustomDialog({ title: "⚠️ 디버그 에러", message: "시뮬레이션 전술 전투가 구동 중이 아닙니다!" });
        }
      });

      document.getElementById("dev-reset-save").addEventListener("click", () => {
        this.showCustomDialog({
          title: "🚨 시스템 포맷 확인",
          message: "정말 모든 기지 데이터와 진행 정보를 완벽히 파괴하고 처음부터 시작하시겠습니까?",
          type: "general-confirm",
          onConfirm: () => {
            Game.resetGame();
            location.reload();
          }
        });
      });
    },

    cleanSpriteBackground(imgUrl, cols, rows, callback) {
      if (typeof cols === "function") {
        callback = cols;
        cols = 10;
        rows = 4;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
        srcCtx.drawImage(img, 0, 0);

        try {
          const imgData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
          const data = imgData.data;
          
          // Sample background color by scanning diagonally from (0,0) to (16,16)
          // to skip dark border grid lines and find the true background color.
          let bgR = data[0];
          let bgG = data[1];
          let bgB = data[2];
          let bgA = data[3];
          
          for (let i = 0; i <= 16; i++) {
            const idx = (i * img.width + i) * 4;
            if (idx + 3 < data.length) {
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              const a = data[idx+3];
              if (a < 50 || (r > 200 && g > 200 && b > 200)) {
                bgR = r;
                bgG = g;
                bgB = b;
                bgA = a;
                break;
              }
            }
          }
          const hasBackground = bgA > 10; // Only key out if the background is opaque
          
          // 1. Key out background color dynamically
          if (hasBackground) {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              
              const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
              if (diff < 20) {
                data[i+3] = 0; // Make transparent
              }
            }
          }
          srcCtx.putImageData(imgData, 0, 0);

          // 2. Align and center characters on a new clean canvas
          const destCanvas = document.createElement("canvas");
          destCanvas.width = img.width;
          destCanvas.height = img.height;
          const destCtx = destCanvas.getContext("2d");

          const cellW = img.width / cols;
          const cellH = img.height / rows;

          // Create a temporary canvas for cell drawing to prevent spillover
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = Math.ceil(cellW);
          tempCanvas.height = Math.ceil(cellH);
          const tempCtx = tempCanvas.getContext("2d");

          const activeFrames = {};

          // Pass 1: Scan all cells to find their bounding boxes and locate the maximum baseline Y (lowest ground level)
          const cellBoxes = {};
          let baselineY = 0;

          for (let r = 0; r < rows; r++) {
            cellBoxes[r] = {};
            for (let c = 0; c < cols; c++) {
              const startX = Math.min(img.width - 1, Math.max(0, Math.round(c * cellW)));
              const startY = Math.min(img.height - 1, Math.max(0, Math.round(r * cellH)));
              const w = Math.min(img.width - startX, Math.round(cellW));
              const h = Math.min(img.height - startY, Math.round(cellH));

              if (w <= 0 || h <= 0) continue;

              const cellData = srcCtx.getImageData(startX, startY, w, h);
              const cellPixels = cellData.data;

              const scanCell = (mX, mY) => {
                let minX = w;
                let maxX = 0;
                let minY = h;
                let maxY = 0;
                let sumX = 0;
                let pixelCount = 0;
                let hasPixels = false;
                for (let y = mY; y < h - mY; y++) {
                  for (let x = mX; x < w - mX; x++) {
                    const idx = (y * w + x) * 4;
                    const alpha = cellPixels[idx + 3];
                    if (alpha > 5) {
                      if (x < minX) minX = x;
                      if (x > maxX) maxX = x;
                      if (y < minY) minY = y;
                      if (y > maxY) maxY = y;
                      sumX += x;
                      pixelCount++;
                      hasPixels = true;
                    }
                  }
                }
                return { hasPixels, minX, maxX, minY, maxY, sumX, pixelCount };
              };

              let scan = scanCell(16, 6);
              if (!scan.hasPixels) {
                scan = scanCell(4, 4);
              }

              if (scan.hasPixels) {
                cellBoxes[r][c] = scan;
                if (scan.maxY > baselineY) {
                  baselineY = scan.maxY;
                }
              }
            }
          }

          if (baselineY === 0) {
            baselineY = cellH - 12; // Fallback baseline Y
          }

          // Pass 2: Draw the centered and vertically grounded frames
          for (let r = 0; r < rows; r++) {
            activeFrames[r] = [];
            for (let c = 0; c < cols; c++) {
              const scan = cellBoxes[r][c];
              if (!scan) continue;

              activeFrames[r].push(c);

              const startX = Math.min(img.width - 1, Math.max(0, Math.round(c * cellW)));
              const startY = Math.min(img.height - 1, Math.max(0, Math.round(r * cellH)));

              const charW = scan.maxX - scan.minX + 1;
              const charH = scan.maxY - scan.minY + 1;
              const centroidX = scan.sumX / scan.pixelCount;
              const minX = scan.minX;
              const minY = scan.minY;

              // Clear temporary canvas
              tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

              // Centroid-based centering: align character so its centroid is at cellW / 2
              const shiftX = Math.round(cellW / 2 - centroidX);
              const destX = minX + shiftX;

              // Vertical alignment: ground the character by aligning maxY to baselineY
              const shiftY = baselineY - scan.maxY;
              const destY = minY + shiftY;

              tempCtx.drawImage(
                srcCanvas,
                startX + minX,
                startY + minY,
                charW,
                charH,
                destX,
                destY,
                charW,
                charH
              );

              // Copy clean, centered, and grounded frame to destCanvas
              destCtx.drawImage(
                tempCanvas,
                0,
                0,
                cellW,
                cellH,
                startX,
                startY,
                cellW,
                cellH
              );
            }
          }

          callback(destCanvas.toDataURL("image/png"), activeFrames);
        } catch (e) {
          console.error("Auto-align and clean background failed due to canvas security", e);
          callback(imgUrl, {});
        }
      };
      img.onerror = () => {
        callback(imgUrl, {});
      };
      img.src = imgUrl + (imgUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    },

    startSpriteAnimationLoop() {
      // Clean background on startup if enabled
      const char = Game.state.character;
      if (char && char.spriteSheetConfig && char.spriteSheetConfig.enabled) {
        const urlToClean = char.spriteSheetConfig.url || "/player_sprite.png";
        const cols = char.spriteSheetConfig.cols || 10;
        const rows = char.spriteSheetConfig.rows || 4;
        this.cleanSpriteBackground(urlToClean, cols, rows, (dataUrl, activeFrames) => {
          char.spriteSheetConfig.transparentUrl = dataUrl;
          char.spriteSheetConfig.activeFrames = activeFrames;
          this.updateAll();
        });
      }

      this.restartSpriteInterval();
    },

    restartSpriteInterval() {
      if (window.spriteIntervalId) {
        clearInterval(window.spriteIntervalId);
      }
      const char = Game.state.character;
      const interval = (char && char.spriteSheetConfig && char.spriteSheetConfig.frameInterval) || 250;
      window.spriteIntervalId = setInterval(() => {
        this.tickSpriteAnimations();
      }, interval);
    },

    tickSpriteAnimations() {
      const char = Game.state.character;
      if (!char || !char.spriteSheetConfig || !char.spriteSheetConfig.enabled) return;

      const s = char.spriteSheetConfig;
      
      let currentState = s.currentState || "idle";
      
      // Update state based on active combat element classes
      if (currentState !== "attack") {
        const playerContainer = document.getElementById("sprite-container-player");
        if (playerContainer) {
          if (playerContainer.classList.contains("combat-jogging")) {
            currentState = "walk";
          } else {
            currentState = "idle";
          }
        } else {
          currentState = "idle";
        }
      }
      
      s.currentState = currentState;
      
      const map = s.mappings[currentState] || s.mappings.idle;
      const row = map.row;
      const activeRowFrames = (s.activeFrames && s.activeFrames[row] && s.activeFrames[row].length > 0)
        ? s.activeFrames[row]
        : Array.from({length: map.frames || 10}, (_, i) => i);
      
      // Calculate current frame index in the active list
      s.currentFrameIndex = ((s.currentFrameIndex || 0) + 1) % activeRowFrames.length;
      s.currentFrame = activeRowFrames[s.currentFrameIndex];
      
      // Update DOM elements rendering this sprite sheet (excluding character selection map and preview card avatars)
      const sprites = document.querySelectorAll(".sprite-sheet-player:not(.selection-origin-player):not(.selection-preview-player)");
      sprites.forEach(el => {
        const frame = s.currentFrame;
        
        const pctX = s.cols > 1 ? (frame / (s.cols - 1)) * 100 : 0;
        const pctY = s.rows > 1 ? (row / (s.rows - 1)) * 100 : 0;
        
        el.style.backgroundPosition = `${pctX}% ${pctY}%`;
        
        // Make sure it uses the transparent URL
        const bgUrl = `url("${s.transparentUrl || s.url}")`;
        if (!el.style.backgroundImage.includes(s.transparentUrl || s.url)) {
          el.style.backgroundImage = bgUrl;
        }
      });
    },

    setupSpriteConfigurator() {
      const chkEnabled = document.getElementById("chk-sprite-enabled");
      const configPanel = document.getElementById("sprite-config-panel");
      const numCols = document.getElementById("num-sprite-cols");
      const numRows = document.getElementById("num-sprite-rows");
      const numRowIdle = document.getElementById("num-row-idle");
      const numFramesIdle = document.getElementById("num-frames-idle");
      const numRowWalk = document.getElementById("num-row-walk");
      const numFramesWalk = document.getElementById("num-frames-walk");
      const numRowAttack = document.getElementById("num-row-attack");
      const numFramesAttack = document.getElementById("num-frames-attack");
      const numSpeed = document.getElementById("num-sprite-speed");
      const previewContainer = document.getElementById("sprite-config-preview-container");
      
      const btnIdle = document.getElementById("btn-preview-state-idle");
      const btnWalk = document.getElementById("btn-preview-state-walk");
      const btnAttack = document.getElementById("btn-preview-state-attack");

      if (!chkEnabled) return;

      const char = Game.state.character;
      if (!char.spriteSheetConfig) {
        char.spriteSheetConfig = {
          enabled: true,
          url: "/player_sprite.png",
          cols: 10,
          rows: 4,
          frameInterval: 250,
          currentFrame: 0,
          currentState: "idle",
          mappings: {
            idle: { row: 0, frames: 10 },
            walk: { row: 1, frames: 10 },
            attack: { row: 2, frames: 10 },
            special_attack: { row: 3, frames: 10 }
          }
        };
      }
      
      const s = char.spriteSheetConfig;
      
      // Load current state into inputs
      chkEnabled.checked = s.enabled;
      configPanel.style.display = s.enabled ? "flex" : "none";
      numCols.value = s.cols;
      numRows.value = s.rows;
      if (numSpeed) numSpeed.value = s.frameInterval || 250;
      
      numRowIdle.value = s.mappings.idle.row;
      numFramesIdle.value = s.mappings.idle.frames;
      numRowWalk.value = s.mappings.walk.row;
      numFramesWalk.value = s.mappings.walk.frames;
      numRowAttack.value = s.mappings.attack.row;
      numFramesAttack.value = s.mappings.attack.frames;

      let previewState = "idle";
      let previewFrame = 0;
      let previewInterval = null;

      const updatePreviewElement = () => {
        const cols = parseInt(numCols.value) || 4;
        const rows = parseInt(numRows.value) || 4;
        
        let row = 0;
        let framesCount = 1;
        if (previewState === "idle") {
          row = parseInt(numRowIdle.value) || 0;
          framesCount = parseInt(numFramesIdle.value) || 1;
        } else if (previewState === "walk") {
          row = parseInt(numRowWalk.value) || 0;
          framesCount = parseInt(numFramesWalk.value) || 1;
        } else if (previewState === "attack") {
          row = parseInt(numRowAttack.value) || 0;
          framesCount = parseInt(numFramesAttack.value) || 1;
        }
        
        const frame = previewFrame % framesCount;
        const pctX = cols > 1 ? (frame / (cols - 1)) * 100 : 0;
        const pctY = rows > 1 ? (row / (rows - 1)) * 100 : 0;
        
        previewContainer.innerHTML = `
          <div style="
            width: 64px;
            height: 64px;
            background-image: url('${s.transparentUrl || s.url}');
            background-size: ${cols * 100}% ${rows * 100}%;
            background-position: ${pctX}% ${pctY}%;
            background-repeat: no-repeat;
            image-rendering: pixelated;
          "></div>
        `;
      };

      const startPreviewLoop = () => {
        if (previewInterval) clearInterval(previewInterval);
        const interval = numSpeed ? (parseInt(numSpeed.value) || 250) : 250;
        previewInterval = setInterval(() => {
          previewFrame++;
          updatePreviewElement();
        }, interval);
      };

      const saveConfig = () => {
        s.enabled = chkEnabled.checked;
        const newCols = parseInt(numCols.value) || 10;
        const newRows = parseInt(numRows.value) || 4;
        
        // Clear transparency cache if dimensions change so it re-cleans on updateAll()
        if (s.cols !== newCols || s.rows !== newRows) {
          s.transparentUrl = null;
        }

        s.cols = newCols;
        s.rows = newRows;
        if (numSpeed) s.frameInterval = parseInt(numSpeed.value) || 250;
        s.mappings.idle.row = parseInt(numRowIdle.value) || 0;
        s.mappings.idle.frames = parseInt(numFramesIdle.value) || 1;
        s.mappings.walk.row = parseInt(numRowWalk.value) || 0;
        s.mappings.walk.frames = parseInt(numFramesWalk.value) || 1;
        s.mappings.attack.row = parseInt(numRowAttack.value) || 0;
        s.mappings.attack.frames = parseInt(numFramesAttack.value) || 1;
        
        char.spriteSheetConfig = s;
        Game.saveGame();
        
        // Restart the game's actual animation interval with new speed
        this.restartSpriteInterval();
        
        // Force rendering refresh of player sprites on UI
        this.updateAll();
      };

      chkEnabled.addEventListener("change", () => {
        configPanel.style.display = chkEnabled.checked ? "flex" : "none";
        saveConfig();
        if (chkEnabled.checked) {
          const colsVal = parseInt(numCols.value) || 10;
          const rowsVal = parseInt(numRows.value) || 4;
          this.cleanSpriteBackground(s.url || "/player_sprite.png", colsVal, rowsVal, (dataUrl) => {
            s.transparentUrl = dataUrl;
            saveConfig();
            updatePreviewElement();
            startPreviewLoop();
          });
        } else {
          if (previewInterval) clearInterval(previewInterval);
        }
      });

      const inputElements = [numCols, numRows, numRowIdle, numFramesIdle, numRowWalk, numFramesWalk, numRowAttack, numFramesAttack];
      if (numSpeed) inputElements.push(numSpeed);

      inputElements.forEach(el => {
        el.addEventListener("input", () => {
          saveConfig();
          updatePreviewElement();
        });
      });

      if (numSpeed) {
        numSpeed.addEventListener("change", () => {
          startPreviewLoop();
        });
      }

      btnIdle.addEventListener("click", () => {
        previewState = "idle";
        previewFrame = 0;
        updatePreviewElement();
      });
      btnWalk.addEventListener("click", () => {
        previewState = "walk";
        previewFrame = 0;
        updatePreviewElement();
      });
      btnAttack.addEventListener("click", () => {
        previewState = "attack";
        previewFrame = 0;
        updatePreviewElement();
      });

      if (s.enabled) {
        // If we don't have transparent url yet, generate it
        if (!s.transparentUrl) {
          const colsVal = parseInt(numCols.value) || 10;
          const rowsVal = parseInt(numRows.value) || 4;
          this.cleanSpriteBackground(s.url || "/player_sprite.png", colsVal, rowsVal, (dataUrl) => {
            s.transparentUrl = dataUrl;
            saveConfig();
            updatePreviewElement();
          });
        }
        updatePreviewElement();
        startPreviewLoop();
      }
    },

    setupTitleScreen() {
      const titleOverlay = document.getElementById("main-title-screen");
      const gameStartBtn = document.getElementById("btn-game-start");
      const googleLoginBtn = document.getElementById("btn-google-login");
      const dataImportBtn = document.getElementById("btn-data-import");
      const dataExportBtn = document.getElementById("btn-data-export");
      const settingsBtn = document.getElementById("btn-title-settings");
      const settingsCloseBtn = document.getElementById("btn-settings-close");
      const settingsDialog = document.getElementById("settings-dialog");

      const dialogMuteBtn = document.getElementById("btn-dialog-toggle-mute");
      const dialogResetBtn = document.getElementById("btn-dialog-reset-save");

      // Game Start
      if (gameStartBtn) {
        gameStartBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          
          const saveExists = localStorage.getItem("project2100_save");
          if (saveExists) {
            this.showCustomDialog({
              title: "💾 기존 전술 데이터 발견",
              message: "기지에 기존 요원의 기록이 백업되어 있습니다. 이어서 기지 작전을 계속하시겠습니까?<br><br><span style='color:var(--red)'>※ 취소(새로 시작)를 선택하면 기존 전술 데이터가 포맷됩니다.</span>",
              type: "confirm",
              onConfirm: () => {
                if (titleOverlay) titleOverlay.style.display = "none";
                
                // If they were mid-exploration, redirect to combat tab!
                if (Game.state.currentExploration) {
                  Game.resumeCombat();
                  this.initCombatScreen();
                } else {
                  // Go to Safety Shelter
                  const tabs = document.querySelectorAll(".tab-btn");
                  const panels = document.querySelectorAll(".tab-panel");
                  tabs.forEach(t => t.classList.remove("active"));
                  panels.forEach(p => p.classList.remove("active"));
                  
                  const shelterTab = document.querySelector('[data-tab="tab-shelter"]');
                  if (shelterTab) shelterTab.classList.add("active");
                  const shelterPanel = document.getElementById("tab-shelter");
                  if (shelterPanel) shelterPanel.classList.add("active");
                  
                  // Restore navigation tabs
                  this.toggleNavigationForCombat(false);
                }
                
                this.updateAll();
              },
              onCancel: () => {
                Game.resetGame();
                if (titleOverlay) titleOverlay.style.display = "none";
                const charSelOverlay = document.getElementById("char-selection-screen");
                if (charSelOverlay) charSelOverlay.style.display = "flex";
                this.updateAll();
              }
            });
          } else {
            if (titleOverlay) titleOverlay.style.display = "none";
            const charSelOverlay = document.getElementById("char-selection-screen");
            if (charSelOverlay) charSelOverlay.style.display = "flex";
          }
        });
      }

      // Google Login Simulation
      if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          this.showCustomDialog({
            title: "🔑 Google Cloud 동기화 완료",
            message: "기지 시스템과 안전하게 구글 클라우드 계정이 연동되었습니다. 요원 복원 데이터 업로드가 작동합니다."
          });
        });
      }

      // Data Import
      if (dataImportBtn) {
        dataImportBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          this.showCustomDialog({
            title: "📥 전술 데이터 복원",
            message: "이전에 백업(내보내기)한 텍스트 코드를 아래에 입력하십시오:",
            type: "prompt",
            placeholder: "데이터 코드를 붙여넣으십시오...",
            onConfirm: (val) => {
              if (val) {
                try {
                  const parsed = JSON.parse(val);
                  if (parsed && parsed.character && parsed.resources) {
                    localStorage.setItem("project2100_save", val);
                    this.showCustomDialog({
                      title: "📥 복원 성공",
                      message: "백업 데이터 복원이 완료되었습니다. 기지 시스템을 재부팅합니다.",
                      onConfirm: () => location.reload()
                    });
                  } else {
                    this.showCustomDialog({ title: "⚠️ 데이터 형식 비정상", message: "데이터 손상 혹은 비정상적인 백업 코드 포맷입니다." });
                  }
                } catch (e) {
                  this.showCustomDialog({ title: "⚠️ 복원 실패", message: "데이터 해독에 실패했습니다. 올바른 텍스트인지 다시 확인하십시오." });
                }
              }
            }
          });
        });
      }

      // Data Export
      if (dataExportBtn) {
        dataExportBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          const saveData = localStorage.getItem("project2100_save");
          if (saveData) {
            const exportStr = JSON.stringify(JSON.parse(saveData));
            this.showCustomDialog({
              title: "📤 전술 데이터 백업 코드",
              message: "아래의 백업 텍스트 코드를 복사(Ctrl+C)하여 안전한 장소에 저장해 두십시오:",
              type: "prompt",
              value: exportStr
            });
          } else {
            this.showCustomDialog({
              title: "⚠️ 백업 데이터 없음",
              message: "백업할 게임 진행 정보가 없습니다. 먼저 게임 요원을 영입하고 챕터를 완수해 보십시오!"
            });
          }
        });
      }

      // Settings Modal
      if (settingsBtn && settingsDialog) {
        settingsBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          settingsDialog.style.display = "flex";
        });
      }

      if (settingsCloseBtn && settingsDialog) {
        settingsCloseBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          settingsDialog.style.display = "none";
        });
      }

      // Settings Sound Toggle
      if (dialogMuteBtn) {
        dialogMuteBtn.addEventListener("click", () => {
          const isMuted = sfx.toggleMute();
          dialogMuteBtn.textContent = isMuted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐";
          const globalMuteBtn = document.getElementById("btn-toggle-mute");
          if (globalMuteBtn) globalMuteBtn.textContent = isMuted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐";
          localStorage.setItem("project2100_muted", isMuted ? "true" : "false");
        });
      }

      // Reset Save
      if (dialogResetBtn) {
        dialogResetBtn.addEventListener("click", () => {
          this.showCustomDialog({
            title: "🚨 시스템 포맷 확인",
            message: "정말 모든 기지 데이터와 진행 정보를 완벽히 파괴하고 처음부터 시작하시겠습니까?",
            type: "general-confirm",
            onConfirm: () => {
              Game.resetGame();
              location.reload();
            }
          });
        });
      }

      // Initialize Sprite Sheet Configurator
      this.setupSpriteConfigurator();
    },

    setupCharSelection() {
      const siberiaMarker = document.getElementById("origin-siberia");
      const europeMarker = document.getElementById("origin-w-europe");
      const eastAsiaMarker = document.getElementById("origin-e-asia");

      if (siberiaMarker) siberiaMarker.addEventListener("click", () => this.selectOrigin(1));
      if (europeMarker) europeMarker.addEventListener("click", () => this.selectOrigin(2));
      if (eastAsiaMarker) eastAsiaMarker.addEventListener("click", () => this.selectOrigin(3));

      // Close character preview modal listener
      const previewCloseBtn = document.getElementById("btn-char-preview-close");
      const previewModal = document.getElementById("char-selection-preview-modal");
      if (previewCloseBtn && previewModal) {
        previewCloseBtn.addEventListener("click", () => {
          if (window.sfx) window.sfx.playClick();
          previewModal.style.display = "none";
          if (window.selectionPreviewIntervalId) {
            clearInterval(window.selectionPreviewIntervalId);
            window.selectionPreviewIntervalId = null;
          }
        });
      }

      // Render 3 starting point characters on the selection map
      const selectionAvatars = [
        {
          id: "siberia",
          originId: 1,
          baseX: 70.0,
          baseY: 24.0,
          px: 70.0,
          py: 24.0,
          targetPx: 73.0,
          isMoving: true,
          facingRight: true,
          spriteUrl: "/plasma_beast_sprite.png",
          elId: "selection-avatar-siberia",
          cols: 10,
          rows: 4,
          currentFrame: 0,
          transparentUrl: null
        },
        {
          id: "w-europe",
          originId: 2,
          baseX: 16.0,
          baseY: 36.0,
          px: 16.0,
          py: 36.0,
          targetPx: 19.0,
          isMoving: true,
          facingRight: true,
          spriteUrl: "/quantum_destroyer_sprite.png",
          elId: "selection-avatar-w-europe",
          cols: 10,
          rows: 4,
          currentFrame: 0,
          transparentUrl: null
        },
        {
          id: "e-asia",
          originId: 3,
          baseX: 86.0,
          baseY: 52.0,
          px: 86.0,
          py: 52.0,
          targetPx: 89.0,
          isMoving: true,
          facingRight: true,
          spriteUrl: "/nano_vampire_sprite.png",
          elId: "selection-avatar-e-asia",
          cols: 10,
          rows: 4,
          currentFrame: 0,
          transparentUrl: null
        }
      ];

      // Key-out transparent background for the 3 selection sprites
      selectionAvatars.forEach(av => {
        this.cleanSpriteBackground(av.spriteUrl, 10, av.rows || 4, (dataUrl, activeFrames) => {
          av.transparentUrl = dataUrl;
          av.activeFrames = activeFrames;
          const container = document.getElementById(av.elId);
          if (container) {
            container.innerHTML = `
              <div class="sprite-sheet-player selection-origin-player" id="sprite-sheet-${av.id}" style="
                width: 100%;
                height: 100%;
                background-image: url('${dataUrl}');
                background-size: ${av.cols * 100}% ${av.rows * 100}%;
                background-position: 0% 0%;
                background-repeat: no-repeat;
                image-rendering: pixelated;
              "></div>
            `;
          }
        });
      });

      // Pacing and Animation Tick loop for selection avatars
      let lastSelectionTick = Date.now();
      const selectionUpdate = () => {
        const charSelScreen = document.getElementById("char-selection-screen");
        if (charSelScreen && charSelScreen.style.display !== "none") {
          const now = Date.now();
          const tickFrame = now - lastSelectionTick >= 250;
          if (tickFrame) {
            lastSelectionTick = now;
          }

          selectionAvatars.forEach(av => {
            const container = document.getElementById(av.elId);
            const spriteEl = document.getElementById(`sprite-sheet-${av.id}`);
            if (!container) return;

            // Pacing movement logic (move back and forth 3% coordinates)
            if (av.isMoving) {
              const dx = av.targetPx - av.px;
              const dist = Math.abs(dx);
              const speed = 0.05; // slow speed

              if (dist > 0.1) {
                av.px += Math.sign(dx) * speed;
              } else {
                av.px = av.targetPx;
                if (av.facingRight) {
                  av.targetPx = av.baseX - 3.0;
                  av.facingRight = false;
                } else {
                  av.targetPx = av.baseX + 3.0;
                  av.facingRight = true;
                }
              }
              container.style.left = av.px + "%";
              container.style.transform = `translate(-50%, -100%) ${av.facingRight ? "scaleX(1)" : "scaleX(-1)"}`;
            }

            // Frame animation tick (Walk mode - row 1 since they are moving)
            if (spriteEl && tickFrame) {
              const row = 1; // Walk row
              const activeRowFrames = (av.activeFrames && av.activeFrames[row] && av.activeFrames[row].length > 0)
                ? av.activeFrames[row]
                : Array.from({length: 10}, (_, i) => i);
              av.currentFrameIndex = ((av.currentFrameIndex || 0) + 1) % activeRowFrames.length;
              av.currentFrame = activeRowFrames[av.currentFrameIndex];
              const pctX = av.cols > 1 ? (av.currentFrame / (av.cols - 1)) * 100 : 0;
              const pctY = av.rows > 1 ? (row / (av.rows - 1)) * 100 : 0;
              spriteEl.style.backgroundPosition = `${pctX}% ${pctY}%`;
            }
          });
        }
        requestAnimationFrame(selectionUpdate);
      };
      requestAnimationFrame(selectionUpdate);
    },

    selectOrigin(originId) {
      const modal = document.getElementById("char-selection-preview-modal");
      const content = document.getElementById("char-selection-preview-content");
      if (!modal || !content) return;

      if (window.sfx) window.sfx.playClick();

      // Remove active highlights
      const markers = ["origin-siberia", "origin-w-europe", "origin-e-asia"];
      markers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("selected");
      });

      const activeId = originId === 1 ? "origin-siberia" : originId === 2 ? "origin-w-europe" : "origin-e-asia";
      const activeEl = document.getElementById(activeId);
      if (activeEl) activeEl.classList.add("selected");

      let title = "";
      let desc = "";
      let hp = 100;
      let atk = 10;
      let def = 2;
      let spd = 10;
      let skill = "레이저 참격";

      if (originId === 1) {
        title = "시베리아 황무지 (대지 거수)";
        desc = "혹독한 눈보라와 야생 변이 개수들이 지배하는 북방 툰드라 수색대원. 뛰어난 세포 강인함과 생명력을 물려받았습니다.";
        hp = 120; atk = 11; def = 2; spd = 10;
      } else if (originId === 2) {
        title = "서유럽 원전지 (체르노빌 방출체)";
        desc = "원자로 방사능 파동 누적에 유전자 결착을 버텨낸 특수 세포 방출 요원. 강력한 전기 에너지 공격 스파이크가 돋보입니다.";
        hp = 100; atk = 14; def = 1; spd = 10;
      } else if (originId === 3) {
        title = "동아시아 메가시티 (사이버 해커)";
        desc = "양자 메인프레임 글리치 신호와 오차 나노 봇을 제어하는 고속 요원. 탁월한 반사 신경과 방어 차폐 능력을 가집니다.";
        hp = 100; atk = 10; def = 3; spd = 12;
      }

      let spriteUrl = "/player_sprite.png";
      if (originId === 1) {
        spriteUrl = "/plasma_beast_sprite.png";
      } else if (originId === 2) {
        spriteUrl = "/quantum_destroyer_sprite.png";
      } else if (originId === 3) {
        spriteUrl = "/nano_vampire_sprite.png";
      }

      const spriteSvg = `<div class="sprite-sheet-player selection-preview-player" style="
        width: 100%;
        height: 100%;
        background-image: url('${spriteUrl}');
        background-size: 1000% 400%;
        background-position: 0% 0%;
        background-repeat: no-repeat;
        image-rendering: pixelated;
      "></div>`;

      const prefixes = ["수색자", "방출병", "글리치", "사이퍼", "생존병"];
      const suffixes = ["알파", "베타", "감마", "오메가", "제타"];
      const defaultName = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${suffixes[Math.floor(Math.random() * suffixes.length)]}`;

      content.innerHTML = `
        <div>
          <h3 style="color:var(--yellow); font-size:14px; text-shadow:0 0 5px rgba(255,235,59,0.2);">${title}</h3>
          <div class="selection-char-sprite" style="margin-top:12px;">${spriteSvg}</div>
          
          <p style="font-size:11px; color:var(--text-muted); line-height:1.4; margin-top:8px;">
            ${desc}
          </p>

          <div class="selection-stats-grid">
            <div>HP: <strong style="color:var(--red); font-size:12px;">${hp}</strong></div>
            <div>공격력: <strong style="color:var(--green); font-size:12px;">${atk}</strong></div>
            <div>방어력: <strong style="color:var(--cyan); font-size:12px;">${def}</strong></div>
            <div>속도: <strong style="color:var(--yellow); font-size:12px;">${spd}</strong></div>
          </div>

          <div style="font-size:11px; margin-top:10px; color:var(--purple); font-weight:bold;">
            🌌 기원 스킬: [${skill}] 발동
          </div>

          <div style="margin-top:15px;">
            <label style="font-size:11px; display:block; color:var(--text-muted); margin-bottom:4px;">요원 이름 지정</label>
            <input type="text" id="txt-char-selection-name" value="${defaultName}" style="width:100%; padding:6px; background:#111; color:#fff; border:1px solid var(--grey); border-radius:4px; font-size:12px; font-family:var(--font-cyber);">
          </div>
        </div>

        <button class="btn-shop" id="btn-recruit-confirm" style="width:100%; background:var(--yellow); color:#000; border:1px solid #000; margin-top:20px; font-weight:bold; font-size:12px;">🧬 요원 임무 투입 승인</button>
      `;

      // Clear previous preview interval
      if (window.selectionPreviewIntervalId) {
        clearInterval(window.selectionPreviewIntervalId);
        window.selectionPreviewIntervalId = null;
      }

      // Clean the background for the preview card sprite sheet
      this.cleanSpriteBackground(spriteUrl, 10, 4, (dataUrl, activeFrames) => {
        const previewSprite = document.querySelector(".selection-preview-player");
        if (previewSprite) {
          previewSprite.style.backgroundImage = `url('${dataUrl}')`;
          previewSprite.activeFrames = activeFrames;
        }
      });

      // Animate the preview card sprite sheet (Idle cycle: Row 0)
      let previewFrameIndex = 0;
      window.selectionPreviewIntervalId = setInterval(() => {
        const previewSprite = document.querySelector(".selection-preview-player");
        if (previewSprite) {
          const activeRowFrames = (previewSprite.activeFrames && previewSprite.activeFrames[0] && previewSprite.activeFrames[0].length > 0)
            ? previewSprite.activeFrames[0]
            : Array.from({length: 10}, (_, i) => i);
          previewFrameIndex = (previewFrameIndex + 1) % activeRowFrames.length;
          const frame = activeRowFrames[previewFrameIndex];
          const pctX = (frame / 9) * 100;
          const pctY = 0; // Row 0 (Idle)
          previewSprite.style.backgroundPosition = `${pctX}% ${pctY}%`;
        }
      }, 250);

      // Show modal preview
      modal.style.display = "flex";

      document.getElementById("btn-recruit-confirm").addEventListener("click", () => {
        const nameInput = document.getElementById("txt-char-selection-name").value.trim() || defaultName;
        
        if (window.selectionPreviewIntervalId) {
          clearInterval(window.selectionPreviewIntervalId);
          window.selectionPreviewIntervalId = null;
        }

        Game.recruitNewCharacter(nameInput, originId);
        
        Game.state.currentRegionId = originId;
        if (!Game.state.unlockedRegions.includes(originId)) {
          Game.state.unlockedRegions.push(originId);
        }
        
        Game.saveGame();

        modal.style.display = "none";
        document.getElementById("char-selection-screen").style.display = "none";
        
        // Enter combat directly!
        Game.enterRegion(originId);
        
        if (window.sfx) window.sfx.playLevelUp();
        
        // Initialize sprite loop for the newly recruited character
        this.startSpriteAnimationLoop();

        // Transition to combat screen visually!
        this.initCombatScreen();
        this.updateAll();
      });
    },

    setupCustomizeModal() {
      const customizeBtn = document.getElementById("btn-status-customize");
      const modal = document.getElementById("customize-modal");
      const closeBtn = document.getElementById("btn-close-customize-modal");
      const confirmBtn = document.getElementById("btn-customize-confirm");
      const nameInput = document.getElementById("customize-name-input");
      const previewAvatar = document.getElementById("customize-preview-avatar");
      const headsGrid = document.getElementById("customize-heads-grid");
      const bodiesGrid = document.getElementById("customize-bodies-grid");

      if (!customizeBtn || !modal || !closeBtn) return;

      let tempHead = 1;
      let tempBody = 1;
      let tempName = "";

      const updatePreview = () => {
        const charConfig = {
          ...Game.state.character,
          name: tempName,
          headPart: tempHead,
          bodyPart: tempBody,
          weapon: "none",
          activeMutations: [],
          spriteSheetConfig: {
            ...Game.state.character.spriteSheetConfig,
            enabled: false // Force disable JRPG mode for SVG preview inside makeover modal
          }
        };
        previewAvatar.innerHTML = SVGRenderer.renderPlayer(charConfig);
      };

      const selectHead = (hId) => {
        tempHead = hId;
        updatePreview();
        
        const cards = headsGrid.querySelectorAll(".customize-item-card");
        cards.forEach((card, idx) => {
          if (idx + 1 === hId) {
            card.classList.add("active-selected");
          } else {
            card.classList.remove("active-selected");
          }
        });
        if (window.sfx) window.sfx.playClick();
      };

      const selectBody = (bId) => {
        tempBody = bId;
        updatePreview();

        const cards = bodiesGrid.querySelectorAll(".customize-item-card");
        cards.forEach((card, idx) => {
          if (idx + 1 === bId) {
            card.classList.add("active-selected");
          } else {
            card.classList.remove("active-selected");
          }
        });
        if (window.sfx) window.sfx.playClick();
      };

      customizeBtn.addEventListener("click", () => {
        if (window.sfx) window.sfx.playClick();
        Game.pauseCombat();
        
        const c = Game.state.character;
        tempHead = c.headPart || 1;
        tempBody = c.bodyPart || 1;
        tempName = c.name || "";

        nameInput.value = tempName;

        // Display/hide JRPG mode warning banner
        const jrpgWarning = document.getElementById("customize-jrpg-warning");
        if (jrpgWarning) {
          jrpgWarning.style.display = (c.spriteSheetConfig && c.spriteSheetConfig.enabled) ? "block" : "none";
        }

        headsGrid.innerHTML = "";
        const headNames = {
          1: "반짝 눈물별",
          2: "흐뭇한 미소 (Heh)",
          3: "동공 지진",
          4: "글썽글썽 🥺",
          5: "비장한 야옹 (Smug)",
          6: "새근새근 💤"
        };
        for (let h = 1; h <= 6; h++) {
          const card = document.createElement("div");
          card.className = "customize-item-card";
          if (h === tempHead) card.classList.add("active-selected");

          const spriteWrapper = document.createElement("div");
          spriteWrapper.className = "customize-item-sprite";
          spriteWrapper.innerHTML = SVGRenderer.renderPlayer({
            headPart: h,
            bodyPart: tempBody,
            weapon: "none",
            activeMutations: [],
            spriteSheetConfig: {
              enabled: false // Force disable JRPG mode for SVG options previews
            }
          });

          const nameEl = document.createElement("div");
          nameEl.className = "customize-item-name";
          nameEl.textContent = headNames[h];

          card.appendChild(spriteWrapper);
          card.appendChild(nameEl);
          card.addEventListener("click", () => selectHead(h));
          headsGrid.appendChild(card);
        }

        bodiesGrid.innerHTML = "";
        const bodyNames = {
          1: "에덴 특수교복",
          2: "소풍 핑크드레스"
        };
        for (let b = 1; b <= 2; b++) {
          const card = document.createElement("div");
          card.className = "customize-item-card";
          if (b === tempBody) card.classList.add("active-selected");

          const spriteWrapper = document.createElement("div");
          spriteWrapper.className = "customize-item-sprite";
          spriteWrapper.innerHTML = SVGRenderer.renderPlayer({
            headPart: tempHead,
            bodyPart: b,
            weapon: "none",
            activeMutations: [],
            spriteSheetConfig: {
              enabled: false // Force disable JRPG mode for SVG options previews
            }
          });

          const nameEl = document.createElement("div");
          nameEl.className = "customize-item-name";
          nameEl.textContent = bodyNames[b];

          card.appendChild(spriteWrapper);
          card.appendChild(nameEl);
          card.addEventListener("click", () => selectBody(b));
          bodiesGrid.appendChild(card);
        }

        updatePreview();
        modal.style.display = "flex";
      });

      nameInput.addEventListener("input", (e) => {
        tempName = e.target.value.trim();
        updatePreview();
      });

      closeBtn.addEventListener("click", () => {
        if (window.sfx) window.sfx.playClick();
        modal.style.display = "none";
        if (Game.state.currentExploration) {
          Game.resumeCombat();
        }
      });

      confirmBtn.addEventListener("click", () => {
        const finalName = nameInput.value.trim();
        if (!finalName) {
          this.showCustomDialog({
            title: "⚠️ 유효하지 않은 이름",
            message: "요원의 이름을 입력해 주십시오."
          });
          return;
        }

        Game.state.character.headPart = tempHead;
        Game.state.character.bodyPart = tempBody;
        Game.state.character.name = finalName;
        Game.saveGame();

        modal.style.display = "none";
        this.updateAll();
        if (window.sfx) window.sfx.playLevelUp();
        Game.addLog(`요원의 스타일 코디를 성공적으로 업데이트했습니다: [${finalName}]`);
        if (Game.state.currentExploration) {
          Game.resumeCombat();
        }
      });
    }
  };

  // Run the initialization
  window.UI.init();
});
