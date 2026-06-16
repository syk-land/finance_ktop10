// combat_backgrounds.js - Procedural SVG Combat Backgrounds for 14 Regions
// All backgrounds are bright/white with slate-gray ruins representing white fallout.

const BackgroundRenderer = {
  getBackgroundSVG(regionId) {
    const rId = parseInt(regionId);
    
    // Default shared gradients & styles
    let defs = `
      <defs>
        <linearGradient id="fallout-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f0f2f5" />
        </linearGradient>
    `;
    
    let content = "";
    let bgColor = "#ffffff";

    switch(rId) {
      case 1: // 시베리아 대황무지 (혹한/눈밭)
        bgColor = "#ffffff";
        defs += `
          <linearGradient id="glow-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(224, 242, 254, 0.4)" />
            <stop offset="100%" stop-color="rgba(14, 165, 233, 0.03)" />
          </linearGradient>
        `;
        content = `
          <!-- Siberia Wasteland -->
          <rect width="800" height="400" fill="url(#glow-1)" />
          <!-- Mountains and Snow Hills -->
          <path d="M 0 320 Q 200 280 400 330 T 800 310 L 800 400 L 0 400 Z" fill="#f8fafc" />
          <path d="M 0 350 Q 300 310 600 360 T 800 340 L 800 400 L 0 400 Z" fill="#f1f5f9" />
          <!-- Ruined Cabin Outline -->
          <path d="M 120 320 L 120 270 L 160 240 L 200 270 L 200 320 Z M 120 270 L 200 270" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <path d="M 150 248 L 150 220 H 160 V 240" fill="none" stroke="#94a3b8" stroke-width="2" />
          <!-- Broken roof line -->
          <path d="M 115 242 L 145 220 M 175 242 L 205 242" fill="none" stroke="#64748b" stroke-width="3" />
          <!-- Pine Trees silhouettes -->
          <path d="M 620 340 L 635 290 L 625 292 L 638 250 L 630 252 L 643 210 L 647 210 L 660 252 L 652 250 L 665 292 L 655 290 L 670 340 Z" fill="none" stroke="#cbd5e1" stroke-width="2" />
          <path d="M 680 350 L 692 305 L 684 307 L 695 270 L 688 272 L 700 230 L 703 230 L 715 272 L 708 270 L 719 307 L 711 305 L 723 350 Z" fill="none" stroke="#94a3b8" stroke-width="1.5" />
          <!-- Floating Snowflakes -->
          <circle cx="250" cy="120" r="2.5" fill="#e2e8f0" />
          <circle cx="450" cy="80" r="3.5" fill="#e2e8f0" />
          <circle cx="580" cy="160" r="2" fill="#e2e8f0" />
          <circle cx="100" cy="180" r="3" fill="#e2e8f0" />
        `;
        break;

      case 2: // 서유럽 원전 지대 (원전 폐허)
        bgColor = "#fafbfc";
        defs += `
          <radialGradient id="glow-2" cx="70%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(34, 197, 94, 0.07)" />
            <stop offset="100%" stop-color="rgba(250, 251, 252, 0)" />
          </radialGradient>
        `;
        content = `
          <!-- Western Europe Nuclear Zone -->
          <rect width="800" height="400" fill="url(#glow-2)" />
          <!-- Ground line -->
          <line x1="0" y1="340" x2="800" y2="340" stroke="#cbd5e1" stroke-width="3" />
          <!-- Ruined Cooling Tower Silhouette -->
          <path d="M 550 340 Q 565 230 580 140 H 680 Q 695 230 710 340" fill="none" stroke="#94a3b8" stroke-width="3" />
          <path d="M 580 140 Q 630 160 680 140" fill="none" stroke="#64748b" stroke-width="2" />
          <!-- Cracked Details on Tower -->
          <path d="M 610 170 L 620 220 L 600 240 M 650 250 L 640 280 M 575 280 Q 630 300 685 280" fill="none" stroke="#64748b" stroke-width="1.5" />
          <!-- Power Grid Lines (Broken) -->
          <path d="M 150 340 L 150 160 L 120 180 M 150 160 L 180 180" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <path d="M 120 180 L 80 230 M 180 180 L 240 250" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4" />
          <!-- Radioactive warning sign -->
          <path d="M 320 340 L 320 290 L 340 270 H 380 L 360 290 H 320" fill="none" stroke="#64748b" stroke-width="2" />
          <circle cx="350" cy="245" r="12" fill="none" stroke="#22c55e" stroke-width="2" />
          <circle cx="350" cy="245" r="3" fill="#22c55e" />
        `;
        break;

      case 3: // 동아시아 메가시티 (도시 폐허)
        bgColor = "#f5f6f8";
        defs += `
          <linearGradient id="glow-3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(6, 182, 212, 0.06)" />
            <stop offset="100%" stop-color="rgba(244, 63, 94, 0.04)" />
          </linearGradient>
        `;
        content = `
          <!-- East Asia Megacity -->
          <rect width="800" height="400" fill="url(#glow-3)" />
          <line x1="0" y1="350" x2="800" y2="350" stroke="#94a3b8" stroke-width="3" />
          <!-- Tilted skyscraper outlines -->
          <rect x="520" y="110" width="80" height="240" fill="none" stroke="#cbd5e1" stroke-width="2.5" transform="rotate(-4 560 230)" />
          <rect x="630" y="60" width="100" height="290" fill="none" stroke="#94a3b8" stroke-width="3" transform="rotate(2 680 200)" />
          <!-- Window grids -->
          <path d="M 650 90 H 710 M 650 120 H 710 M 650 150 H 710 M 650 180 H 710" fill="none" stroke="#e2e8f0" stroke-width="1.5" transform="rotate(2 680 200)" />
          <path d="M 535 140 H 585 M 535 180 H 585 M 535 220 H 585" fill="none" stroke="#cbd5e1" stroke-width="1" transform="rotate(-4 560 230)" />
          <!-- Ruined Billboard Frame -->
          <rect x="180" y="180" width="120" height="70" fill="none" stroke="#94a3b8" stroke-width="2" />
          <path d="M 210 250 L 210 350 M 270 250 L 270 350" stroke="#94a3b8" stroke-width="2.5" />
          <!-- Cyber Glitch lines -->
          <line x1="160" y1="120" x2="340" y2="120" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="40,20,5,10" />
          <line x1="50" y1="280" x2="250" y2="280" stroke="#f43f5e" stroke-width="1" stroke-dasharray="15,40,10,5" />
        `;
        break;

      case 4: // 루마니아 (성곽 폐허)
        bgColor = "#f4f4f6";
        defs += `
          <radialGradient id="glow-4" cx="30%" cy="30%" r="60%">
            <stop offset="0%" stop-color="rgba(225, 29, 72, 0.06)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0)" />
          </linearGradient>
        `;
        content = `
          <!-- Romania Castle Ruins -->
          <rect width="800" height="400" fill="url(#glow-4)" />
          <line x1="0" y1="330" x2="800" y2="330" stroke="#64748b" stroke-width="3" />
          <!-- Gothic Spires and Stone Arches -->
          <path d="M 500 330 L 500 240 L 520 200 L 540 240 L 540 330 Z" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <path d="M 520 200 L 520 120" fill="none" stroke="#64748b" stroke-width="2" />
          <!-- Castle Wall Blocks -->
          <path d="M 540 330 H 680 V 220 H 650 V 250 H 610 V 220 H 570 V 250 H 540 Z" fill="none" stroke="#475569" stroke-width="3" />
          <path d="M 580 300 H 640 V 330" fill="none" stroke="#94a3b8" stroke-width="2" />
          <!-- Ruined arch outline -->
          <path d="M 140 330 V 260 Q 200 200 260 260 V 330" fill="none" stroke="#94a3b8" stroke-width="2" />
          <!-- Bats silhouettes -->
          <path d="M 320 120 Q 330 115 340 125 Q 350 115 360 120 Q 350 130 340 125 Q 330 130 320 120 Z" fill="#64748b" />
          <path d="M 270 90 Q 278 86 286 94 Q 294 86 302 90 Q 294 98 286 94 Q 278 98 270 90 Z" fill="#94a3b8" />
        `;
        break;

      case 5: // 이집트 (피라미드 폐허)
        bgColor = "#fbfaf7";
        defs += `
          <linearGradient id="glow-5" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(245, 158, 11, 0.06)" />
            <stop offset="100%" stop-color="rgba(251, 250, 247, 0)" />
          </linearGradient>
        `;
        content = `
          <!-- Egypt Desert & Pyramids -->
          <rect width="800" height="400" fill="url(#glow-5)" />
          <!-- Desert Dunes -->
          <path d="M 0 350 Q 250 310 500 360 T 800 330 L 800 400 L 0 400 Z" fill="#fef3c7" />
          <path d="M 0 370 Q 300 340 600 385 T 800 360 L 800 400 L 0 400 Z" fill="#fde68a" />
          <!-- Collapsed Pyramid Silhouette -->
          <path d="M 450 350 L 580 180 L 640 250 L 710 350 Z" fill="none" stroke="#b45309" stroke-width="3" />
          <path d="M 580 180 L 610 350" fill="none" stroke="#d97706" stroke-width="2" />
          <!-- Pyramid crack detail -->
          <path d="M 540 230 L 520 270 L 530 310" fill="none" stroke="#d97706" stroke-width="1.5" />
          <!-- Ruined Obelisk -->
          <path d="M 160 350 L 175 190 L 185 190 L 195 350 Z" fill="none" stroke="#92400e" stroke-width="2.5" />
          <path d="M 175 190 L 180 175 L 185 190" fill="none" stroke="#92400e" stroke-width="2.5" />
        `;
        break;

      case 6: // 영국 ( Stonehenge / 요정 황무지 )
        bgColor = "#f3f6f5";
        defs += `
          <radialGradient id="glow-6" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="rgba(168, 85, 247, 0.06)" />
            <stop offset="100%" stop-color="rgba(243, 246, 245, 0)" />
          </radialGradient>
        `;
        content = `
          <!-- UK Stonehenge Ruins -->
          <rect width="800" height="400" fill="url(#glow-6)" />
          <!-- Ground line -->
          <path d="M 0 330 Q 400 350 800 330" fill="none" stroke="#cbd5e1" stroke-width="3" />
          <!-- Stonehenge pillars -->
          <rect x="150" y="210" width="40" height="120" fill="none" stroke="#64748b" stroke-width="3" />
          <rect x="230" y="210" width="40" height="120" fill="none" stroke="#64748b" stroke-width="3" />
          <rect x="130" y="180" width="160" height="30" fill="none" stroke="#475569" stroke-width="3" />
          
          <rect x="580" y="230" width="35" height="100" fill="none" stroke="#94a3b8" stroke-width="2.5" transform="rotate(-6 590 280)" />
          <rect x="660" y="200" width="45" height="130" fill="none" stroke="#64748b" stroke-width="3" transform="rotate(4 680 260)" />
          <!-- Oak Tree Silhouette (Gnarled branch) -->
          <path d="M 0 100 Q 120 120 180 60 Q 220 110 300 90" fill="none" stroke="#475569" stroke-width="2.5" />
          <path d="M 90 108 Q 110 160 140 170" fill="none" stroke="#64748b" stroke-width="1.5" />
        `;
        break;

      case 7: // 몽골 ( 기병대 영토 / 초원 )
        bgColor = "#f7f9fa";
        defs += `
          <linearGradient id="glow-7" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(14, 165, 233, 0.05)" />
            <stop offset="100%" stop-color="rgba(247, 249, 250, 0)" />
          </linearGradient>
        `;
        content = `
          <!-- Mongolia Steppes -->
          <rect width="800" height="400" fill="url(#glow-7)" />
          <!-- Grassland Horizon -->
          <path d="M 0 330 Q 300 310 500 340 T 800 320 L 800 400 L 0 400 Z" fill="#f1f5f9" />
          <path d="M 0 355 Q 200 340 550 370 T 800 350 L 800 400 L 0 400 Z" fill="#e2e8f0" />
          <!-- Collapsed Yurts (tents) outlines -->
          <path d="M 460 330 C 460 280 540 280 540 330 Z" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <path d="M 500 280 L 500 250" stroke="#94a3b8" stroke-width="2" />
          <!-- Broken wagon wheels -->
          <circle cx="210" cy="340" r="30" fill="none" stroke="#64748b" stroke-width="2.5" />
          <path d="M 210 310 L 210 370 M 180 340 L 240 340 M 190 320 L 230 360 M 190 360 L 230 320" stroke="#64748b" stroke-width="1.5" />
        `;
        break;

      case 8: // 중동 ( 유전 화염 )
        bgColor = "#faf7f5";
        defs += `
          <linearGradient id="glow-8" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(239, 68, 68, 0.07)" />
            <stop offset="100%" stop-color="rgba(249, 115, 22, 0.03)" />
          </linearGradient>
        `;
        content = `
          <!-- Middle East Oil Wells -->
          <rect width="800" height="400" fill="url(#glow-8)" />
          <line x1="0" y1="340" x2="800" y2="340" stroke="#64748b" stroke-width="3" />
          <!-- Ruined Oil Derrick outline -->
          <path d="M 520 340 L 560 140 H 580 L 620 340" fill="none" stroke="#475569" stroke-width="3" />
          <path d="M 545 220 H 595 M 535 270 H 605" fill="none" stroke="#64748b" stroke-width="2" />
          <path d="M 520 340 L 620 220 M 520 220 L 620 340 M 560 140 L 580 340" fill="none" stroke="#94a3b8" stroke-width="1" />
          <!-- Flames rising from pipe -->
          <path d="M 250 340 L 250 300 Q 240 280 250 250 Q 270 270 260 300 Z" fill="none" stroke="#ef4444" stroke-width="2" />
          <path d="M 245 300 Q 235 270 255 240 Q 260 260 255 300" fill="none" stroke="#f97316" stroke-width="1.5" />
        `;
        break;

      case 9: // 그리스 ( 침수 도시 / 해안 )
        bgColor = "#f2f7f9";
        defs += `
          <linearGradient id="glow-9" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(14, 116, 144, 0.06)" />
            <stop offset="100%" stop-color="rgba(242, 247, 249, 0)" />
          </linearGradient>
        `;
        content = `
          <!-- Greece Submerged City -->
          <rect width="800" height="400" fill="url(#glow-9)" />
          <!-- Water level lines -->
          <path d="M 0 320 C 150 310 250 330 400 320 C 550 310 650 330 800 320 L 800 400 L 0 400 Z" fill="rgba(14, 116, 144, 0.04)" />
          <path d="M 0 340 Q 200 330 400 350 T 800 330" fill="none" stroke="#0891b2" stroke-width="2" />
          <!-- Sunken Columns -->
          <rect x="580" y="160" width="30" height="160" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <path d="M 575 160 H 615 M 575 170 H 615 M 580 320 H 610" fill="none" stroke="#94a3b8" stroke-width="2" />
          <rect x="680" y="200" width="30" height="120" fill="none" stroke="#64748b" stroke-width="2" transform="rotate(-6 695 260)" />
        `;
        break;

      case 10: // 북유럽 ( 침엽수림 / 오로라 )
        bgColor = "#ffffff";
        defs += `
          <linearGradient id="glow-10" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(34, 197, 94, 0.05)" />
            <stop offset="50%" stop-color="rgba(168, 85, 247, 0.05)" />
            <stop offset="100%" stop-color="rgba(255, 255, 255, 0)" />
          </linearGradient>
        `;
        content = `
          <!-- Scandinavia Forest & Aurora -->
          <rect width="800" height="400" fill="url(#glow-10)" />
          <!-- Aurora Wave Lines -->
          <path d="M -50 80 Q 200 180 450 100 T 850 140" fill="none" stroke="rgba(34, 197, 94, 0.3)" stroke-width="12" filter="blur(4px)" />
          <path d="M -50 110 Q 250 50 500 130 T 850 70" fill="none" stroke="rgba(168, 85, 247, 0.25)" stroke-width="8" filter="blur(3px)" />
          <!-- Mountain ridges -->
          <path d="M 0 340 L 150 240 L 300 290 L 500 200 L 680 300 L 800 240 L 800 400 L 0 400 Z" fill="none" stroke="#cbd5e1" stroke-width="2" />
          <!-- Pine Forest outlines -->
          <path d="M 80 340 L 90 300 L 85 302 L 93 270 L 88 272 L 97 240 L 100 240 L 109 272 L 104 270 L 112 302 L 107 300 L 117 340 Z" fill="none" stroke="#94a3b8" stroke-width="2" />
          <path d="M 700 350 L 710 310 L 705 312 L 713 280 L 708 282 L 717 250 L 720 250 L 729 282 L 724 280 L 732 312 L 727 310 L 737 350 Z" fill="none" stroke="#94a3b8" stroke-width="1.5" />
          <line x1="0" y1="340" x2="800" y2="340" stroke="#94a3b8" stroke-width="3" />
        `;
        break;

      case 11: // 인도 ( 오염 사원 )
        bgColor = "#faf8f5";
        defs += `
          <linearGradient id="glow-11" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(249, 115, 22, 0.05)" />
            <stop offset="100%" stop-color="rgba(250, 248, 245, 0)" />
          </linearGradient>
        `;
        content = `
          <!-- India Temple Ruins -->
          <rect width="800" height="400" fill="url(#glow-11)" />
          <line x1="0" y1="335" x2="800" y2="335" stroke="#94a3b8" stroke-width="3" />
          <!-- Ruined Temple Domes -->
          <path d="M 520 335 V 250 Q 560 200 600 250 V 335 Z" fill="none" stroke="#64748b" stroke-width="2.5" />
          <path d="M 600 250 Q 640 210 680 250 V 335" fill="none" stroke="#94a3b8" stroke-width="2" />
          <!-- Dome spire -->
          <line x1="560" y1="210" x2="560" y2="170" stroke="#64748b" stroke-width="2" />
          <!-- Ruined lotus decor -->
          <path d="M 160 335 C 160 300 200 300 200 335 Z" fill="none" stroke="#cbd5e1" stroke-width="2" />
        `;
        break;

      case 12: // 우크라이나 ( 체르노빌 원전 )
        bgColor = "#f9fafc";
        defs += `
          <radialGradient id="glow-12" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stop-color="rgba(163, 230, 53, 0.08)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0)" />
          </radialGradient>
        `;
        content = `
          <!-- Ukraine Chernobyl Ruins -->
          <rect width="800" height="400" fill="url(#glow-12)" />
          <line x1="0" y1="340" x2="800" y2="340" stroke="#475569" stroke-width="3" />
          <!-- Chernobyl Sarcophagus Dome outline -->
          <path d="M 120 340 V 220 H 260 V 260 H 350 V 340 Z" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <circle cx="190" cy="220" r="30" fill="none" stroke="#94a3b8" stroke-width="2" />
          <!-- Duga Radar Grid towers -->
          <path d="M 500 340 V 100 H 780 V 340 M 540 100 V 340 M 580 100 V 340 M 620 100 V 340 M 660 100 V 340 M 700 100 V 340 M 740 100 V 340" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
          <path d="M 500 130 H 780 M 500 170 H 780 M 500 210 H 780 M 500 250 H 780 M 500 290 H 780" fill="none" stroke="#cbd5e1" stroke-width="1" />
        `;
        break;

      case 13: // 스위스 ( 알프스 벙커 )
        bgColor = "#f6f8fa";
        defs += `
          <linearGradient id="glow-13" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(234, 179, 8, 0.05)" />
            <stop offset="100%" stop-color="rgba(246, 248, 250, 0)" />
          </linearGradient>
        `;
        content = `
          <!-- Switzerland Alps & Bunker -->
          <rect width="800" height="400" fill="url(#glow-13)" />
          <!-- Alps Mountain outlines -->
          <path d="M 0 320 L 180 140 L 320 240 L 550 80 L 720 220 L 800 170 L 800 400 L 0 400 Z" fill="none" stroke="#94a3b8" stroke-width="2.5" />
          <!-- Massive Round Bunker Door outline -->
          <circle cx="680" cy="310" r="70" fill="none" stroke="#475569" stroke-width="3" />
          <circle cx="680" cy="310" r="50" fill="none" stroke="#64748b" stroke-width="2" />
          <!-- Vault door spokes -->
          <path d="M 680 240 V 380 M 610 310 H 750 M 630 260 L 730 360 M 630 360 L 730 260" stroke="#64748b" stroke-width="1.5" />
          <line x1="0" y1="340" x2="800" y2="340" stroke="#475569" stroke-width="3" />
        `;
        break;

      case 14: // 에베레스트 ( 설산 정상 / 최종 보스 )
        bgColor = "#ffffff";
        defs += `
          <radialGradient id="glow-14" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="rgba(6, 182, 212, 0.08)" />
            <stop offset="100%" stop-color="#ffffff" />
          </radialGradient>
        `;
        content = `
          <!-- Everest Summit -->
          <rect width="800" height="400" fill="url(#glow-14)" />
          <!-- Sharp Peak Outline -->
          <path d="M 100 400 L 400 110 L 700 400 Z" fill="none" stroke="#64748b" stroke-width="3" />
          <path d="M 400 110 L 430 400" fill="none" stroke="#94a3b8" stroke-width="2" />
          <!-- Swirling Blizzard Lines -->
          <path d="M 120 160 Q 220 120 380 200 T 680 150" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="6" />
          <path d="M 150 170 Q 250 130 400 210 T 650 160" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
          <!-- Tibetan prayer flag ropes (tilted) -->
          <path d="M 400 110 L 250 250" fill="none" stroke="#64748b" stroke-width="1.5" />
          <!-- Flag triangles -->
          <path d="M 380 130 L 370 145 M 350 160 L 340 175 M 320 190 L 310 205" fill="none" stroke="#94a3b8" stroke-width="2" />
        `;
        break;

      default:
        bgColor = "#ffffff";
        content = `<rect width="800" height="400" fill="url(#fallout-sky)" />`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" style="background-color:${bgColor};">
        ${defs}
        </defs>
        ${content}
      </svg>
    `;
  },

  getBackgroundDataUrl(regionId) {
    const svgStr = this.getBackgroundSVG(regionId);
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  },

  getBackgroundStyle(regionId) {
    const rId = parseInt(regionId);
    
    // Detect environment (file:// protocol vs http/https server)
    const isLocalFile = window.location.protocol === 'file:';
    const basePath = isLocalFile ? './public/backgrounds' : '/backgrounds';
    
    return `url('${basePath}/bg_region_${rId}.png')`;
  },

  applyBackground(element, regionId) {
    if (!element) return;
    const rId = parseInt(regionId);
    const isLocalFile = window.location.protocol === 'file:';
    const basePath = isLocalFile ? './public/backgrounds' : '/backgrounds';
    const imgUrl = `${basePath}/bg_region_${rId}.png`;
    const fallbackUrl = this.getBackgroundDataUrl(rId);

    const tempImg = new Image();
    tempImg.onload = () => {
      element.style.backgroundImage = `url('${imgUrl}')`;
    };
    tempImg.onerror = () => {
      element.style.backgroundImage = `url('${fallbackUrl}')`;
    };
    tempImg.src = imgUrl;
  }
};

window.BackgroundRenderer = BackgroundRenderer;
