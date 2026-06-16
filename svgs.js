// Project 2100 - High Precision SVG Sprite Renderer
// Premium MapleStory & Anya Forger theme: High-end 2.5D shading gradients, shiny metal outlines, and detailed decals.

const shadow = `<ellipse cx="50" cy="108.5" rx="28.4" ry="7.6" fill="rgba(0,0,0,0.25)" />`;

const outlineFilter = `
  <defs>
    <!-- CSS Animations Embedded directly inside SVG -->
    <style>
      @keyframes blink-anim {
        0%, 90%, 100% { transform: scaleY(1); }
        93%, 97% { transform: scaleY(0.05); }
      }
      .anya-eye-left {
        animation: blink-anim 4.2s ease-in-out infinite;
        transform-origin: 38.5px 38.5px;
      }
      .anya-eye-right {
        animation: blink-anim 4.2s ease-in-out infinite;
        transform-origin: 61.5px 38.5px;
      }
      
      @keyframes sleep-bubble-anim {
        0%, 100% { transform: scale(0.3) translate(-20px, 15px); opacity: 0; }
        40% { opacity: 0.8; }
        70% { transform: scale(1.1) translate(0px, -5px); opacity: 0.8; }
        90%, 100% { opacity: 0; }
      }
      .sleep-bubble {
        animation: sleep-bubble-anim 3.5s ease-in-out infinite;
        transform-origin: 34px 45px;
      }
      
      @keyframes spin-anim {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spin-magic {
        animation: spin-anim 8s linear infinite;
        transform-origin: 50px 60px;
      }
      .spin-gun {
        animation: spin-anim 4s linear infinite;
        transform-origin: 0px -15px;
      }
      .spin-boss {
        animation: spin-anim 10s linear infinite;
        transform-origin: 70px 74px;
      }
      
      @keyframes pulse-light {
        0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 2px rgba(0, 229, 255, 0.5)); }
        50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.9)); }
      }
      .pulse-glow {
        animation: pulse-light 2s ease-in-out infinite;
      }

      @keyframes swing-weapon {
        0%, 100% { transform: translate(68.52px, 75.89px) rotate(15deg); }
        50% { transform: translate(69.52px, 73.89px) rotate(8deg); }
      }
      .swing-item {
        animation: swing-weapon 2.5s ease-in-out infinite;
        transform-origin: 68px 90px;
      }

      @keyframes angel-wing-flap {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05) translate(1px, -2px) rotate(2deg); }
      }
      .wing-flap {
        animation: angel-wing-flap 3s ease-in-out infinite;
        transform-origin: 50px 58px;
      }
    </style>

    <!-- 머리카락 그라디언트 (Anya Pink Hair Grad) -->
    <linearGradient id="anya-hair-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffe4ec" />
      <stop offset="35%" stop-color="#ffa8c5" />
      <stop offset="85%" stop-color="#f06292" />
      <stop offset="100%" stop-color="#c2185b" />
    </linearGradient>
    
    <!-- 이마 헤어 그림자 -->
    <linearGradient id="face-shadow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(125,55,80,0.45)" />
      <stop offset="60%" stop-color="rgba(125,55,80,0.15)" />
      <stop offset="100%" stop-color="rgba(125,55,80,0)" />
    </linearGradient>
    
    <!-- 눈동자 에메랄드 그라디언트 (Maple Eye Grad) -->
    <radialGradient id="anya-eye-grad" cx="50%" cy="40%" r="50%" fx="50%" fy="30%">
      <stop offset="0%" stop-color="#a7ffeb" />
      <stop offset="30%" stop-color="#64ffda" />
      <stop offset="65%" stop-color="#00bfa5" />
      <stop offset="90%" stop-color="#00796b" />
      <stop offset="100%" stop-color="#004d40" />
    </radialGradient>

    <!-- 에덴 스텔라 스타 훈장 그라디언트 -->
    <radialGradient id="stella-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#fff59d" />
      <stop offset="75%" stop-color="#fbc02d" />
      <stop offset="100%" stop-color="#f57f17" />
    </radialGradient>
    
    <!-- 눈동자 어두운 섀도 오버레이 -->
    <linearGradient id="eye-top-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#091b15" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>

    <!-- 황금 장식 메탈릭 그라디언트 (Metallic Gold) -->
    <linearGradient id="gold-metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8e1" />
      <stop offset="20%" stop-color="#ffe082" />
      <stop offset="45%" stop-color="#ffb300" />
      <stop offset="75%" stop-color="#ff8f00" />
      <stop offset="100%" stop-color="#e65100" />
    </linearGradient>

    <!-- 교복 검정 천 그라디언트 (Uniform Fabric Grad) -->
    <linearGradient id="eden-fabric-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4a4a4a" />
      <stop offset="40%" stop-color="#2a2a2a" />
      <stop offset="85%" stop-color="#141414" />
      <stop offset="100%" stop-color="#050505" />
    </linearGradient>

    <!-- 본드 하얀 털 그라디언트 -->
    <linearGradient id="bond-fur-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#fafafa" />
      <stop offset="75%" stop-color="#e0e0e0" />
      <stop offset="100%" stop-color="#b0bec5" />
    </linearGradient>

    <!-- 본드 귀 셰이딩 -->
    <linearGradient id="bond-ear-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#212121" />
      <stop offset="100%" stop-color="#424242" />
    </linearGradient>

    <!-- 뺨 홍조 그라디언트 -->
    <radialGradient id="anya-blush-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff4081" stop-opacity="0.65" />
      <stop offset="60%" stop-color="#ff4081" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ff4081" stop-opacity="0" />
    </radialGradient>

    <!-- 땅콩 봉지용 크라프트지 그라디언트 -->
    <linearGradient id="peanut-bag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe0b2" />
      <stop offset="50%" stop-color="#bcaaa4" />
      <stop offset="100%" stop-color="#8d6e63" />
    </linearGradient>

    <!-- 캐릭터와 대비되는 강력한 네온 차트루즈 아웃라인 필터 (메이플스토리 캐릭터 대비 효과) -->
    <filter id="char-outline" x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology operator="dilate" radius="2.6" in="SourceAlpha" result="dilated" />
      <feFlood flood-color="#a6ff00" result="outline-color" />
      <feComposite in="outline-color" in2="dilated" operator="in" result="outline" />
      <feGaussianBlur in="outline" stdDeviation="0.6" result="blurred-outline" />
      <feMerge>
        <feMergeNode in="blurred-outline" />
        <feMergeNode in="outline" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    
    <!-- 몬스터용 대비되는 강렬한 마젠타/레드 아웃라인 필터 -->
    <filter id="enemy-outline" x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology operator="dilate" radius="2.6" in="SourceAlpha" result="dilated" />
      <feFlood flood-color="#ff1744" result="outline-color" />
      <feComposite in="outline-color" in2="dilated" operator="in" result="outline" />
      <feGaussianBlur in="outline" stdDeviation="0.6" result="blurred-outline" />
      <feMerge>
        <feMergeNode in="blurred-outline" />
        <feMergeNode in="outline" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
`;

const SVGTemplates = {
  shadow,
  heads: {
    1: (color = "#ff80ab") => `
      <!-- Anya: Sparkly Big Eyes (Ultra Detailed Premium Style) -->
      <g id="head-anya-sparkle">
        <!-- 정수리 바보털 (Ahoge) 추가 -->
        <path d="M50.0,14.0 Q45.0,2.0 39.0,5.0 Q45.0,8.0 50.0,16.0 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="1.8" />
        
        <!-- Back Pink Hair with Detailed locks -->
        <path d="M22.15,35.45 C13.50,22.10 27.50,11.20 36.42,16.89 C44.50,7.10 58.50,7.10 67.24,16.89 C76.50,11.20 90.50,22.10 80.92,35.45 L78.00,45.00 L25.00,45.00 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.5" />
        
        <!-- Hair Highlights (Angel Ring) -->
        <path d="M26.50,20.10 C36.20,11.50 64.50,11.50 75.80,20.10" fill="none" stroke="#ffffff" stroke-width="4.0" stroke-linecap="round" opacity="0.75" />
        <path d="M30.50,23.20 C38.20,16.20 62.10,16.20 71.50,23.20" fill="none" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" opacity="0.90" />
        
        <!-- Anya's Iconic Black/Gold Hair Cones -->
        <!-- Left Cone -->
        <path d="M16.45,23.12 L28.56,7.88 L35.25,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19.12,19.45 L25.89,10.45 M22.25,22.12 L28.56,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        <!-- Right Cone -->
        <path d="M84.25,23.12 L72.12,7.88 L65.45,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M81.56,19.45 L74.82,10.45 M78.45,22.12 L72.12,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        
        <!-- Face Outline - Cute Chubby Heart Shape -->
        <path d="M25.0,30.0 C25.0,16.0 75.0,16.0 75.0,30.0 C75.0,42.0 64.0,50.8 50.0,50.8 C36.0,50.8 25.0,42.0 25.0,30.0 Z" fill="#fff5f0" stroke="#111" stroke-width="2.8" stroke-linejoin="round" />
        
        <!-- Forehead Hair Shadow Layer -->
        <path d="M24.85,28.5 C35.4,17.5 65.8,18.5 75.15,28.5 Z" fill="url(#face-shadow-grad)" opacity="0.9" />
        
        <!-- MapleStory Style Super Detailed Emerald Gradient Eyes -->
        <!-- Left Eye Group (Blinks!) -->
        <g class="anya-eye-left">
          <ellipse cx="38.5" cy="38.5" rx="9.0" ry="11.2" fill="#111" />
          <ellipse cx="38.5" cy="38.5" rx="7.6" ry="9.8" fill="url(#anya-eye-grad)" />
          <ellipse cx="38.5" cy="35.5" rx="7.6" ry="5.2" fill="url(#eye-top-shadow)" opacity="0.85" />
          <!-- Star Shaped Highlight -->
          <path d="M38.5,35.0 L39.2,36.5 L40.7,36.7 L39.6,37.8 L39.9,39.3 L38.5,38.5 L37.1,39.3 L37.4,37.8 L36.3,36.7 L37.8,36.5 Z" fill="#ffffff" />
          <circle cx="42.5" cy="35.2" r="3.0" fill="#ffffff" />
          <circle cx="34.8" cy="42.0" r="1.8" fill="#ffffff" />
          <circle cx="41.5" cy="41.5" r="1.2" fill="#ffffff" opacity="0.8" />
        </g>

        <!-- Right Eye Group (Blinks!) -->
        <g class="anya-eye-right">
          <ellipse cx="61.5" cy="38.5" rx="9.0" ry="11.2" fill="#111" />
          <ellipse cx="61.5" cy="38.5" rx="7.6" ry="9.8" fill="url(#anya-eye-grad)" />
          <ellipse cx="61.5" cy="35.5" rx="7.6" ry="5.2" fill="url(#eye-top-shadow)" opacity="0.85" />
          <!-- Star Shaped Highlight -->
          <path d="M61.5,35.0 L62.2,36.5 L63.7,36.7 L62.6,37.8 L62.9,39.3 L61.5,38.5 L60.1,39.3 L60.4,37.8 L59.3,36.7 L60.8,36.5 Z" fill="#ffffff" />
          <circle cx="65.5" cy="35.2" r="3.0" fill="#ffffff" />
          <circle cx="57.8" cy="42.0" r="1.8" fill="#ffffff" />
          <circle cx="64.5" cy="41.5" r="1.2" fill="#ffffff" opacity="0.8" />
        </g>
        
        <!-- Double Eyelash Arc & Eyelids (MapleStory style thick stroke) -->
        <path d="M27.5,34.0 C33.5,29.5 43.5,29.5 49.5,34.0" stroke="#111" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M50.5,34.0 C56.5,29.5 66.5,29.5 72.5,34.0" stroke="#111" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M30.2,43.2 Q38.5,46.5 46.8,43.2" stroke="#111" stroke-width="1.8" fill="none" />
        <path d="M53.2,43.2 Q61.5,46.5 69.8,43.2" stroke="#111" stroke-width="1.8" fill="none" />
        
        <!-- Blush with Radial Gradients & cute stars -->
        <ellipse cx="32.56" cy="46.89" rx="7.8" ry="3.8" fill="url(#anya-blush-grad)" />
        <ellipse cx="67.45" cy="46.89" rx="7.8" ry="3.8" fill="url(#anya-blush-grad)" />
        <!-- Delicate blush lines -->
        <line x1="29.5" y1="46.0" x2="31.5" y2="49.0" stroke="#fff" stroke-width="1.2" />
        <line x1="32.5" y1="46.0" x2="34.5" y2="49.0" stroke="#fff" stroke-width="1.2" />
        <line x1="65.5" y1="46.0" x2="67.5" y2="49.0" stroke="#fff" stroke-width="1.2" />
        <line x1="68.5" y1="46.0" x2="70.5" y2="49.0" stroke="#fff" stroke-width="1.2" />
        
        <!-- Anya's Cute Tiny Smile -->
        <path d="M46.85,48.12 Q50.00,52.20 53.15,48.12" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M49.5,49.5 L50.5,49.5" stroke="#ff80ab" stroke-width="1.5" fill="none" />
        
        <!-- Front Pink Hair Bangs (Detailed overlapping layer) -->
        <path d="M21.15,31.25 Q35.56,21.12 45.45,28.89 Q50.00,16.45 54.56,28.89 Q64.45,21.12 78.85,31.25 L76.12,36.56 C73.12,23.89 65.45,24.82 59.89,28.12 Q50.00,17.12 40.12,28.12 C34.56,24.82 26.89,23.89 23.89,36.56 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="3.2" stroke-linejoin="round" />
        <!-- Side Hair Strands with sharp tips and inner shade lines -->
        <path d="M22.8,35.5 C18.0,46.5 19.5,56.5 21.0,60.2 C23.5,60.2 24.8,49.5 24.8,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <path d="M77.2,35.5 C82.0,46.5 80.5,56.5 79.0,60.2 C76.5,60.2 75.2,49.5 75.2,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <!-- Hair inner shade strokes -->
        <path d="M22.5,42.0 Q21.0,50.0 22.0,55.0" fill="none" stroke="#c2185b" stroke-width="1.2" opacity="0.5" />
        <path d="M77.5,42.0 Q79.0,50.0 78.0,55.0" fill="none" stroke="#c2185b" stroke-width="1.2" opacity="0.5" />
      </g>`,

    2: (color = "#ff80ab") => `
      <!-- Anya: The Iconic 'Heh' 𓁹‿𓁹 Face (Ultra Detailed Premium Style) -->
      <g id="head-anya-heh">
        <!-- 정수리 바보털 (Ahoge) 추가 -->
        <path d="M50.0,14.0 Q45.0,2.0 39.0,5.0 Q45.0,8.0 50.0,16.0 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="1.8" />
        
        <!-- Back Hair -->
        <path d="M22.15,35.45 C13.50,22.10 27.50,11.20 36.42,16.89 C44.50,7.10 58.50,7.10 67.24,16.89 C76.50,11.20 90.50,22.10 80.92,35.45 L78.00,45.00 L25.00,45.00 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.5" />
        <path d="M26.50,20.10 C36.20,11.50 64.50,11.50 75.80,20.10" fill="none" stroke="#ffffff" stroke-width="4.0" stroke-linecap="round" opacity="0.65" />
        <!-- Cones -->
        <path d="M16.45,23.12 L28.56,7.88 L35.25,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19.12,19.45 L25.89,10.45 M22.25,22.12 L28.56,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        <path d="M84.25,23.12 L72.12,7.88 L66.45,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M81.56,19.45 L74.82,10.45 M78.45,22.12 L72.12,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        
        <!-- Face Outline - Cute Chubby Heart Shape -->
        <path d="M25.0,30.0 C25.0,16.0 75.0,16.0 75.0,30.0 C75.0,42.0 64.0,50.8 50.0,50.8 C36.0,50.8 25.0,42.0 25.0,30.0 Z" fill="#fff5f0" stroke="#111" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M24.85,28.5 C35.4,18.5 65.8,18.5 75.15,28.5 Z" fill="url(#face-shadow-grad)" opacity="0.9" />
        
        <!-- The Iconic 'Heh' Eyes with Emerald Shading (Drooping lids + half moon shape) -->
        <!-- Left Smug Eye -->
        <g transform="translate(0, 0)">
          <path d="M28.5,38.5 Q38.5,33.5 47.5,38.5" stroke="#111" stroke-width="3.8" stroke-linecap="round" fill="none" />
          <path d="M29.5,38.2 C31.5,44.5 44.5,44.5 46.5,38.2 Z" fill="url(#anya-eye-grad)" stroke="#111" stroke-width="1.2" />
          <ellipse cx="38.0" cy="40.2" rx="3.5" ry="1.8" fill="#004d40" />
          <circle cx="39.5" cy="39.5" r="1.0" fill="#ffffff" />
        </g>
        <!-- Right Smug Eye -->
        <g transform="translate(0, 0)">
          <path d="M52.5,38.5 Q61.5,33.5 71.5,38.5" stroke="#111" stroke-width="3.8" stroke-linecap="round" fill="none" />
          <path d="M53.5,38.2 C55.5,44.5 68.5,44.5 70.5,38.2 Z" fill="url(#anya-eye-grad)" stroke="#111" stroke-width="1.2" />
          <ellipse cx="62.0" cy="40.2" rx="3.5" ry="1.8" fill="#004d40" />
          <circle cx="63.5" cy="39.5" r="1.0" fill="#ffffff" />
        </g>
        
        <!-- Under-eye smug lines & eyebags -->
        <path d="M33.56,44.5 C36.0,46.0 40.0,46.0 42.56,44.5" stroke="#c09b85" stroke-width="1.8" fill="none" />
        <path d="M57.45,44.5 C60.0,46.0 64.0,46.0 66.45,44.5" stroke="#c09b85" stroke-width="1.8" fill="none" />
        
        <!-- Smug Slanted Mouth (Half-mocking grin) -->
        <path d="M42.0,49.2 C45.0,51.8 54.0,49.0 57.5,46.8" stroke="#111" stroke-width="3.0" stroke-linecap="round" fill="none" />
        <path d="M51.0,49.5 Q52.5,47.8 53.5,49.0" stroke="#ff80ab" stroke-width="1.2" fill="none" />
        
        <!-- Blush -->
        <ellipse cx="31.5" cy="46.89" rx="6.5" ry="2.8" fill="url(#anya-blush-grad)" />
        <ellipse cx="68.5" cy="46.89" rx="6.5" ry="2.8" fill="url(#anya-blush-grad)" />
        
        <!-- Front Bangs -->
        <path d="M21.15,31.25 Q35.56,21.12 45.45,28.89 Q50.00,16.45 54.56,28.89 Q64.45,21.12 78.85,31.25 L76.12,36.56 C73.12,23.89 65.45,24.82 59.89,28.12 Q50.00,17.12 40.12,28.12 C34.56,24.82 26.89,23.89 23.89,36.56 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="3.2" stroke-linejoin="round" />
        <path d="M22.8,35.5 C18.0,46.5 19.5,56.5 21.0,60.2 C23.5,60.2 24.8,49.5 24.8,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <path d="M77.2,35.5 C82.0,46.5 80.5,56.5 79.0,60.2 C76.5,60.2 75.2,49.5 75.2,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
      </g>`,

    3: (color = "#ff80ab") => `
      <!-- Anya: Shocked/Gasp 𓁹D𓁹 (Ultra Detailed Premium Style) -->
      <g id="head-anya-shock">
        <!-- 정수리 바보털 (Ahoge) 추가 -->
        <path d="M50.0,14.0 Q45.0,2.0 39.0,5.0 Q45.0,8.0 50.0,16.0 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="1.8" />
        
        <!-- Back Hair -->
        <path d="M22.15,35.45 C13.50,22.10 27.50,11.20 36.42,16.89 C44.50,7.10 58.50,7.10 67.24,16.89 C76.50,11.20 90.50,22.10 80.92,35.45 L78.00,45.00 L25.00,45.00 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.5" />
        <path d="M26.50,20.10 C36.20,11.50 64.50,11.50 75.80,20.10" fill="none" stroke="#ffffff" stroke-width="4.0" stroke-linecap="round" opacity="0.65" />
        <!-- Cones -->
        <path d="M16.45,23.12 L28.56,7.88 L35.25,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19.12,19.45 L25.89,10.45 M22.25,22.12 L28.56,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        <path d="M84.25,23.12 L72.12,7.88 L66.45,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M81.56,19.45 L74.82,10.45 M78.45,22.12 L72.12,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        
        <!-- Face Outline - Cute Chubby Heart Shape -->
        <path d="M25.0,30.0 C25.0,16.0 75.0,16.0 75.0,30.0 C75.0,42.0 64.0,50.8 50.0,50.8 C36.0,50.8 25.0,42.0 25.0,30.0 Z" fill="#f4f8fb" stroke="#111" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M24.85,28.5 C35.4,18.5 65.8,18.5 75.15,28.5 Z" fill="url(#face-shadow-grad)" opacity="0.9" />
        
        <!-- Vertical shocked lines on forehead (Mental breakdown effect) -->
        <line x1="30" y1="23" x2="30" y2="33" stroke="#b0bec5" stroke-width="2.0" opacity="0.8" />
        <line x1="33" y1="22" x2="33" y2="34" stroke="#b0bec5" stroke-width="2.0" opacity="0.8" />
        <line x1="36" y1="24" x2="36" y2="32" stroke="#b0bec5" stroke-width="1.5" opacity="0.8" />
        <line x1="64" y1="24" x2="64" y2="32" stroke="#b0bec5" stroke-width="1.5" opacity="0.8" />
        <line x1="67" y1="22" x2="67" y2="34" stroke="#b0bec5" stroke-width="2.0" opacity="0.8" />
        <line x1="70" y1="23" x2="70" y2="33" stroke="#b0bec5" stroke-width="2.0" opacity="0.8" />
        
        <!-- Tiny shock pupils (Gasp) -->
        <!-- Left Eye -->
        <circle cx="38.56" cy="38.89" r="7.5" fill="#111" />
        <circle cx="38.56" cy="38.89" r="4.2" fill="url(#anya-eye-grad)" />
        <circle cx="38.56" cy="38.89" r="1.5" fill="#ffffff" />
        <!-- Right Eye -->
        <circle cx="61.45" cy="38.89" r="7.5" fill="#111" />
        <circle cx="61.45" cy="38.89" r="4.2" fill="url(#anya-eye-grad)" />
        <circle cx="61.45" cy="38.89" r="1.5" fill="#ffffff" />
        
        <!-- Shocked Big Open Mouth (with teeth & tongue) -->
        <ellipse cx="50" cy="49" rx="7.5" ry="9.0" fill="#212121" stroke="#111" stroke-width="2.5" />
        <path d="M43.5,45.5 L56.5,45.5 C55.0,43.5 45.0,43.5 43.5,45.5 Z" fill="#ffffff" /> <!-- Upper Teeth -->
        <path d="M45.0,55.0 Q50.0,48.0 55.0,55.0" fill="#e91e63" /> <!-- Cute tongue -->
        
        <!-- Front Bangs -->
        <path d="M21.15,31.25 Q35.56,21.12 45.45,28.89 Q50.00,16.45 54.56,28.89 Q64.45,21.12 78.85,31.25 L76.12,36.56 C73.12,23.89 65.45,24.82 59.89,28.12 Q50.00,17.12 40.12,28.12 C34.56,24.82 26.89,23.89 23.89,36.56 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="3.2" stroke-linejoin="round" />
        <path d="M22.8,35.5 C18.0,46.5 19.5,56.5 21.0,60.2 C23.5,60.2 24.8,49.5 24.8,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <path d="M77.2,35.5 C82.0,46.5 80.5,56.5 79.0,60.2 C76.5,60.2 75.2,49.5 75.2,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
      </g>`,

    4: (color = "#ff80ab") => `
      <!-- Anya: Teary Pleading eyes (Ultra Detailed Premium Style) -->
      <g id="head-anya-tear">
        <!-- 정수리 바보털 (Ahoge) 추가 -->
        <path d="M50.0,14.0 Q45.0,2.0 39.0,5.0 Q45.0,8.0 50.0,16.0 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="1.8" />
        
        <!-- Back Hair -->
        <path d="M22.15,35.45 C13.50,22.10 27.50,11.20 36.42,16.89 C44.50,7.10 58.50,7.10 67.24,16.89 C76.50,11.20 90.50,22.10 80.92,35.45 L78.00,45.00 L25.00,45.00 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.5" />
        <path d="M26.50,20.10 C36.20,11.50 64.50,11.50 75.80,20.10" fill="none" stroke="#ffffff" stroke-width="4.0" stroke-linecap="round" opacity="0.65" />
        <!-- Cones -->
        <path d="M16.45,23.12 L28.56,7.88 L35.25,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19.12,19.45 L25.89,10.45 M22.25,22.12 L28.56,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        <path d="M84.25,23.12 L72.12,7.88 L66.45,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M81.56,19.45 L74.82,10.45 M78.45,22.12 L72.12,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        
        <!-- Face Outline - Cute Chubby Heart Shape -->
        <path d="M25.0,30.0 C25.0,16.0 75.0,16.0 75.0,30.0 C75.0,42.0 64.0,50.8 50.0,50.8 C36.0,50.8 25.0,42.0 25.0,30.0 Z" fill="#fff5f0" stroke="#111" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M24.85,28.5 C35.4,18.5 65.8,18.5 75.15,28.5 Z" fill="url(#face-shadow-grad)" opacity="0.9" />
        
        <!-- Giant Teary Eyes with Gradients & Shaking Tears -->
        <!-- Left Eye -->
        <g class="anya-eye-left">
          <ellipse cx="38.5" cy="38.5" rx="9.2" ry="11.5" fill="#111" />
          <ellipse cx="38.5" cy="38.5" rx="7.8" ry="10.0" fill="url(#anya-eye-grad)" />
          <ellipse cx="38.5" cy="35.5" rx="7.8" ry="5.0" fill="url(#eye-top-shadow)" opacity="0.8" />
          
          <!-- Liquid Tear Layer on Bottom -->
          <path d="M30.7,40.0 C32.0,46.0 45.0,46.0 46.3,40.0 C43.0,43.5 34.0,43.5 30.7,40.0 Z" fill="#e0f7fa" opacity="0.85" />
          
          <!-- Big shiny tear drop inside -->
          <circle cx="41.5" cy="34.5" r="3.6" fill="#ffffff" />
          <circle cx="35.5" cy="41.5" r="2.5" fill="#ffffff" />
          <circle cx="43.5" cy="40.0" r="1.5" fill="#ffffff" opacity="0.8" />
          <path d="M37.5,37.0 Q38.5,38.0 39.5,37.0" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.7" />
        </g>
        
        <!-- Right Eye -->
        <g class="anya-eye-right">
          <ellipse cx="61.5" cy="38.5" rx="9.2" ry="11.5" fill="#111" />
          <ellipse cx="61.5" cy="38.5" rx="7.8" ry="10.0" fill="url(#anya-eye-grad)" />
          <ellipse cx="61.5" cy="35.5" rx="7.8" ry="5.0" fill="url(#eye-top-shadow)" opacity="0.8" />
          
          <!-- Liquid Tear Layer on Bottom -->
          <path d="M53.7,40.0 C55.0,46.0 68.0,46.0 69.3,40.0 C66.0,43.5 57.0,43.5 53.7,40.0 Z" fill="#e0f7fa" opacity="0.85" />
          
          <!-- Big shiny tear drop inside -->
          <circle cx="64.5" cy="34.5" r="3.6" fill="#ffffff" />
          <circle cx="58.5" cy="41.5" r="2.5" fill="#ffffff" />
          <circle cx="66.5" cy="40.0" r="1.5" fill="#ffffff" opacity="0.8" />
          <path d="M60.5,37.0 Q61.5,38.0 62.5,37.0" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.7" />
        </g>
        
        <!-- Falling Tears from outer corners -->
        <path d="M27.0,38.0 C24.0,42.0 23.5,49.0 25.0,52.0 C26.0,49.0 28.0,44.0 28.5,40.0 Z" fill="#e0f7fa" opacity="0.8" stroke="#ffffff" stroke-width="0.8" />
        <path d="M73.0,38.0 C76.0,42.0 76.5,49.0 75.0,52.0 C74.0,49.0 72.0,44.0 71.5,40.0 Z" fill="#e0f7fa" opacity="0.8" stroke="#ffffff" stroke-width="0.8" />
        
        <!-- Sad Slanted Brows (🥺 shape) -->
        <path d="M28.45,31.25 Q38.12,34.56 42.12,30.56" stroke="#111" stroke-width="3.2" stroke-linecap="round" fill="none" />
        <path d="M71.56,31.25 Q61.89,34.56 57.89,30.56" stroke="#111" stroke-width="3.2" stroke-linecap="round" fill="none" />
        
        <!-- Sad Wobbly Mouth (ㅅ shape) -->
        <path d="M45.5,50.0 Q50.0,45.5 54.5,50.0" stroke="#111" stroke-width="2.8" stroke-linejoin="round" fill="none" stroke-linecap="round" />
        
        <!-- Blush -->
        <ellipse cx="32.56" cy="47.89" rx="6.5" ry="3.5" fill="url(#anya-blush-grad)" />
        <ellipse cx="67.45" cy="47.89" rx="6.5" ry="3.5" fill="url(#anya-blush-grad)" />
        
        <!-- Front Bangs -->
        <path d="M21.15,31.25 Q35.56,21.12 45.45,28.89 Q50.00,16.45 54.56,28.89 Q64.45,21.12 78.85,31.25 L76.12,36.56 C73.12,23.89 65.45,24.82 59.89,28.12 Q50.00,17.12 40.12,28.12 C34.56,24.82 26.89,23.89 23.89,36.56 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="3.2" stroke-linejoin="round" />
        <path d="M22.8,35.5 C18.0,46.5 19.5,56.5 21.0,60.2 C23.5,60.2 24.8,49.5 24.8,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <path d="M77.2,35.5 C82.0,46.5 80.5,56.5 79.0,60.2 C76.5,60.2 75.2,49.5 75.2,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
      </g>`,

    5: (color = "#ff80ab") => `
      <!-- Anya: Smug Mastermind (Ultra Detailed Premium Style) -->
      <g id="head-anya-smug">
        <!-- 정수리 바보털 (Ahoge) 추가 -->
        <path d="M50.0,14.0 Q45.0,2.0 39.0,5.0 Q45.0,8.0 50.0,16.0 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="1.8" />
        
        <!-- Back Hair -->
        <path d="M22.15,35.45 C13.50,22.10 27.50,11.20 36.42,16.89 C44.50,7.10 58.50,7.10 67.24,16.89 C76.50,11.20 90.50,22.10 80.92,35.45 L78.00,45.00 L25.00,45.00 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.5" />
        <path d="M26.50,20.10 C36.20,11.50 64.50,11.50 75.80,20.10" fill="none" stroke="#ffffff" stroke-width="4.0" stroke-linecap="round" opacity="0.65" />
        <!-- Cones -->
        <path d="M16.45,23.12 L28.56,7.88 L35.25,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19.12,19.45 L25.89,10.45 M22.25,22.12 L28.56,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        <path d="M84.25,23.12 L72.12,7.88 L66.45,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M81.56,19.45 L74.82,10.45 M78.45,22.12 L72.12,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        
        <!-- Face Outline - Cute Chubby Heart Shape -->
        <path d="M25.0,30.0 C25.0,16.0 75.0,16.0 75.0,30.0 C75.0,42.0 64.0,50.8 50.0,50.8 C36.0,50.8 25.0,42.0 25.0,30.0 Z" fill="#fff5f0" stroke="#111" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M24.85,28.5 C35.4,18.5 65.8,18.5 75.15,28.5 Z" fill="url(#face-shadow-grad)" opacity="0.9" />
        
        <!-- Confident Smug Eyes -->
        <!-- Left Eye (Wink) -->
        <g class="anya-eye-left">
          <ellipse cx="38.5" cy="38.5" rx="8.0" ry="9.0" fill="#111" />
          <ellipse cx="38.5" cy="38.5" rx="6.5" ry="7.5" fill="url(#anya-eye-grad)" />
          <circle cx="40.5" cy="36.5" r="2.0" fill="#ffffff" />
          <path d="M35.5,41.0 Q38.5,42.5 41.5,41.0" stroke="#ffffff" stroke-width="1.2" fill="none" />
        </g>
        <!-- Right Eye (Open with sparkle) -->
        <g class="anya-eye-right">
          <ellipse cx="61.5" cy="38.5" rx="8.0" ry="9.0" fill="#111" />
          <ellipse cx="61.5" cy="38.5" rx="6.5" ry="7.5" fill="url(#anya-eye-grad)" />
          <circle cx="63.5" cy="36.5" r="2.0" fill="#ffffff" />
          <circle cx="59.5" cy="40.5" r="1.0" fill="#ffffff" />
        </g>
        
        <!-- Confident Slanted Eyebrows -->
        <path d="M29.5,29.5 Q38.0,28.0 42.0,31.5" stroke="#111" stroke-width="2.8" stroke-linecap="round" fill="none" />
        <path d="M70.5,29.5 Q62.0,28.0 58.0,31.5" stroke="#111" stroke-width="2.8" stroke-linecap="round" fill="none" />
        
        <!-- Confident Cat Smile (▲ shape with small fang detail) -->
        <path d="M45.5,48.0 Q50.0,52.5 54.5,48.0 Z" fill="#212121" stroke="#111" stroke-width="2.2" />
        <polygon points="48.0,48.2 49.5,50.2 51.0,48.2" fill="#ffffff" /> <!-- Tiny fang -->
        
        <!-- Blush -->
        <ellipse cx="32.56" cy="46.89" rx="6.5" ry="2.2" fill="url(#anya-blush-grad)" />
        <ellipse cx="67.45" cy="46.89" rx="6.5" ry="2.2" fill="url(#anya-blush-grad)" />
        
        <!-- Front Bangs -->
        <path d="M21.15,31.25 Q35.56,21.12 45.45,28.89 Q50.00,16.45 54.56,28.89 Q64.45,21.12 78.85,31.25 L76.12,36.56 C73.12,23.89 65.45,24.82 59.89,28.12 Q50.00,17.12 40.12,28.12 C34.56,24.82 26.89,23.89 23.89,36.56 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="3.2" stroke-linejoin="round" />
        <path d="M22.8,35.5 C18.0,46.5 19.5,56.5 21.0,60.2 C23.5,60.2 24.8,49.5 24.8,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <path d="M77.2,35.5 C82.0,46.5 80.5,56.5 79.0,60.2 C76.5,60.2 75.2,49.5 75.2,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
      </g>`,

    6: (color = "#ff80ab") => `
      <!-- Anya: Sleeping with Snoring Bubble (Breathes!) -->
      <g id="head-anya-sleep">
        <!-- 정수리 바보털 (Ahoge) 추가 -->
        <path d="M50.0,14.0 Q45.0,2.0 39.0,5.0 Q45.0,8.0 50.0,16.0 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="1.8" />
        
        <!-- Back Hair -->
        <path d="M22.15,35.45 C13.50,22.10 27.50,11.20 36.42,16.89 C44.50,7.10 58.50,7.10 67.24,16.89 C76.50,11.20 90.50,22.10 80.92,35.45 L78.00,45.00 L25.00,45.00 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.5" />
        <path d="M26.50,20.10 C36.20,11.50 64.50,11.50 75.80,20.10" fill="none" stroke="#ffffff" stroke-width="4.0" stroke-linecap="round" opacity="0.65" />
        <!-- Cones -->
        <path d="M16.45,23.12 L28.56,7.88 L35.25,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M19.12,19.45 L25.89,10.45 M22.25,22.12 L28.56,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        <path d="M84.25,23.12 L72.12,7.88 L66.45,26.82 Z" fill="#212121" stroke="#111" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M81.56,19.45 L74.82,10.45 M78.45,22.12 L72.12,13.56" stroke="url(#gold-metal-grad)" stroke-width="2.8" stroke-linecap="round" />
        
        <!-- Face Outline - Cute Chubby Heart Shape -->
        <path d="M25.0,30.0 C25.0,16.0 75.0,16.0 75.0,30.0 C75.0,42.0 64.0,50.8 50.0,50.8 C36.0,50.8 25.0,42.0 25.0,30.0 Z" fill="#fff0e8" stroke="#111" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M24.85,28.5 C35.4,18.5 65.8,18.5 75.15,28.5 Z" fill="url(#face-shadow-grad)" opacity="0.9" />
        
        <!-- Sleeping eyes (u u shape with cute eyelashes) -->
        <path d="M31.5,40.0 C33.0,43.5 42.0,43.5 43.5,40.0" stroke="#111" stroke-width="3.6" stroke-linecap="round" fill="none" />
        <path d="M30.0,38.5 L31.5,40.0 M45.0,38.5 L43.5,40.0" stroke="#111" stroke-width="2.2" stroke-linecap="round" />
        
        <path d="M56.5,40.0 C58.0,43.5 67.0,43.5 68.5,40.0" stroke="#111" stroke-width="3.6" stroke-linecap="round" fill="none" />
        <path d="M55.0,38.5 L56.5,40.0 M70.0,38.5 L68.5,40.0" stroke="#111" stroke-width="2.2" stroke-linecap="round" />
        
        <!-- Cute Sleep Mouth -->
        <path d="M48.5,47.5 Q50.0,49.0 51.5,47.5" stroke="#111" stroke-width="2.2" stroke-linecap="round" fill="none" />
        
        <!-- Animated Snoring Bubble (Fades & Expands!) -->
        <g class="sleep-bubble">
          <circle cx="34.00" cy="45.00" r="6.0" fill="#b2ebf2" opacity="0.7" stroke="#00bcd4" stroke-width="1.2" />
          <circle cx="32.00" cy="43.00" r="2.0" fill="#ffffff" opacity="0.9" />
        </g>
        
        <!-- Cute 'zZ' snoring text -->
        <g transform="translate(68, 22)">
          <text x="0" y="0" font-family="monospace" font-size="8" font-weight="bold" fill="#00e5ff" opacity="0.8">zZ</text>
        </g>
        
        <!-- Blush -->
        <ellipse cx="32.56" cy="46.89" rx="5.8" ry="2.2" fill="url(#anya-blush-grad)" />
        <ellipse cx="67.45" cy="46.89" rx="5.8" ry="2.2" fill="url(#anya-blush-grad)" />
        
        <!-- Front Bangs -->
        <path d="M21.15,31.25 Q35.56,21.12 45.45,28.89 Q50.00,16.45 54.56,28.89 Q64.45,21.12 78.85,31.25 L76.12,36.56 C73.12,23.89 65.45,24.82 59.89,28.12 Q50.00,17.12 40.12,28.12 C34.56,24.82 26.89,23.89 23.89,36.56 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="3.2" stroke-linejoin="round" />
        <path d="M22.8,35.5 C18.0,46.5 19.5,56.5 21.0,60.2 C23.5,60.2 24.8,49.5 24.8,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
        <path d="M77.2,35.5 C82.0,46.5 80.5,56.5 79.0,60.2 C76.5,60.2 75.2,49.5 75.2,38.5 Z" fill="url(#anya-hair-grad)" stroke="#111" stroke-width="2.2" />
      </g>`
  },

  // 2 Anya Outfit Templates (With detailed fabric gradients and metallic gold emblems)
  bodies: {
    1: () => `
      <!-- Eden Academy Dress Uniform -->
      <g id="body-eden-uniform">
        <!-- Shoulder Puff Sleeves -->
        <ellipse cx="32.0" cy="57.85" rx="7.5" ry="5.5" fill="url(#eden-fabric-grad)" stroke="#111" stroke-width="2.5" />
        <ellipse cx="68.0" cy="57.85" rx="7.5" ry="5.5" fill="url(#eden-fabric-grad)" stroke="#111" stroke-width="2.5" />
        <!-- Gold Cuff Trims -->
        <path d="M25.0,59.0 Q31.0,62.0 32.5,57.0" stroke="url(#gold-metal-grad)" stroke-width="2.0" fill="none" />
        <path d="M75.0,59.0 Q69.0,62.0 67.5,57.0" stroke="url(#gold-metal-grad)" stroke-width="2.0" fill="none" />
        
        <!-- Main Eden Dress (Detailed 2.5D pleats & contouring) -->
        <path d="M33.25,53.12 L66.75,53.12 L61.12,87.56 L38.89,87.56 Z" fill="url(#eden-fabric-grad)" stroke="#111" stroke-width="3.0" stroke-linejoin="round" />
        <!-- Skirt vertical fold shades -->
        <path d="M44.0,65.0 L43.0,87.0 M50.0,65.0 L50.0,87.0 M56.0,65.0 L57.0,87.0" stroke="#050505" stroke-width="2.5" />
        <path d="M44.5,65.0 L43.5,87.0 M50.5,65.0 L50.5,87.0 M56.5,65.0 L57.5,87.0" stroke="#3c3c3c" stroke-width="1.0" />
        
        <!-- White Collar -->
        <path d="M35.0,53.12 L43.5,61.0 L50.0,55.5 L56.5,61.0 L65.0,53.12 Z" fill="#ffffff" stroke="#111" stroke-width="2.0" />
        
        <!-- Detailed Metallic Gold Trim -->
        <path d="M36.56,65.89 L43.56,69.50 L50.00,62.50 L56.45,69.50 L63.45,65.89" stroke="url(#gold-metal-grad)" stroke-width="3.0" fill="none" stroke-linejoin="round" />
        <line x1="50.00" y1="62.5" x2="50.00" y2="78.12" stroke="url(#gold-metal-grad)" stroke-width="2.5" />
        <path d="M39.12,82.12 L50.00,84.5 L60.89,82.12" stroke="url(#gold-metal-grad)" stroke-width="2.5" fill="none" />

        <!-- Stella Star Emblem on Chest (Starlight Pin) -->
        <g transform="translate(50, 69) scale(0.65)">
          <path d="M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z" fill="url(#stella-grad)" stroke="#111" stroke-width="1.2" />
        </g>

        <!-- Tiny Legs with socks & shoes -->
        <g id="left-leg">
          <rect x="39.25" y="87.56" width="7.85" height="13.24" rx="2.5" fill="#ffffff" stroke="#111" stroke-width="2.5" />
          <ellipse cx="43.12" cy="100.12" rx="6.5" ry="3.5" fill="#151515" stroke="#111" stroke-width="2.0" />
          <path d="M40.0,99.0 Q43.0,97.0 46.0,99.0" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.8" /> <!-- Buckle -->
        </g>
        <g id="right-leg">
          <rect x="52.89" y="87.56" width="7.85" height="13.24" rx="2.5" fill="#ffffff" stroke="#111" stroke-width="2.5" />
          <ellipse cx="56.75" cy="100.12" rx="6.5" ry="3.5" fill="#151515" stroke="#111" stroke-width="2.0" />
          <path d="M54.0,99.0 Q57.0,97.0 60.0,99.0" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.8" />
        </g>
      </g>`,
    2: () => `
      <!-- Anya's Cute Pink Picnic Dress -->
      <g id="body-picnic-dress">
        <!-- Puff sleeves with cute cuffs -->
        <circle cx="33.0" cy="57.85" r="7.0" fill="#ffa8c5" stroke="#111" stroke-width="2.2" />
        <circle cx="67.0" cy="57.85" r="7.0" fill="#ffa8c5" stroke="#111" stroke-width="2.2" />
        <circle cx="33.0" cy="57.85" r="4.0" fill="#ff4081" />
        <circle cx="67.0" cy="57.85" r="4.0" fill="#ff4081" />
        
        <!-- Dress body (Voluminous pleats) -->
        <path d="M33.89,53.12 C33.89,53.12 50.00,47.12 66.12,53.12 C67.5,69.0 63.5,87.0 50.00,87.0 C36.5,87.0 32.5,69.0 33.89,53.12 Z" fill="#ff4081" stroke="#111" stroke-width="3.0" />
        
        <!-- White lace apron details with heart details -->
        <path d="M37.5,57.5 L62.5,57.5 L58.5,80.5 L41.5,80.5 Z" fill="#ffffff" stroke="#111" stroke-width="1.8" />
        <path d="M41.5,80.5 Q50.0,83.0 58.5,80.5" fill="none" stroke="#fff" stroke-width="3.0" />
        <!-- Pink cross stitch pattern on lace apron -->
        <path d="M43,60 L45,64 M45,60 L43,64" stroke="#ff4081" stroke-width="1.2" />
        <path d="M55,60 L57,64 M57,60 L55,64" stroke="#ff4081" stroke-width="1.2" />
        
        <!-- Red ribbon and Golden Buckle brooch -->
        <path d="M42.12,58.89 L57.89,58.89 L50.00,65.89 Z" fill="#d50000" stroke="#111" stroke-width="2" />
        <circle cx="50.00" cy="58.89" r="3.8" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="1.8" />
        <path d="M45.12,58.89 C39.12,51.89 36.12,62.89 42.12,58.89 Z" fill="#d50000" stroke="#111" stroke-width="1.8" />
        <path d="M54.89,58.89 C60.89,51.89 63.89,62.89 54.89,58.89 Z" fill="#d50000" stroke="#111" stroke-width="1.8" />
        
        <!-- Stubby Legs with Cute Bow Shoes -->
        <g id="left-leg">
          <rect x="39.12" y="87.00" width="7.89" height="12.56" rx="2.5" fill="#ffffff" stroke="#111" stroke-width="2.5" />
          <ellipse cx="43.12" cy="99.56" rx="6.0" ry="3.0" fill="#d50000" stroke="#111" stroke-width="2.0" />
          <circle cx="43.12" cy="97.5" r="1.5" fill="#ffffff" /> <!-- Shoe buckle shine -->
        </g>
        <g id="right-leg">
          <rect x="52.89" y="87.00" width="7.89" height="12.56" rx="2.5" fill="#ffffff" stroke="#111" stroke-width="2.5" />
          <ellipse cx="56.89" cy="99.56" rx="6.0" ry="3.0" fill="#d50000" stroke="#111" stroke-width="2.0" />
          <circle cx="56.89" cy="97.5" r="1.5" fill="#ffffff" />
        </g>
      </g>`
  },

  // 7 High-Precision Mutation Templates
  mutations: {
    // 1. Cute Pink Jelly Claw (Added Glossy Shimmers)
    "claw_purple": `
      <g id="mutation-claw-l" transform="translate(9.2, 50.8)">
        <circle cx="10" cy="18" r="10" fill="#e91e63" stroke="#111" stroke-width="2.5" />
        <circle cx="10" cy="18" r="7.2" fill="#ff6090" />
        <ellipse cx="8" cy="16" rx="3.0" ry="1.5" fill="#ffffff" opacity="0.6" /> <!-- Highlight -->
        <!-- Jelly toe pads -->
        <circle cx="2" cy="9" r="3.5" fill="#ff80ab" stroke="#111" stroke-width="1.5" />
        <circle cx="10" cy="5" r="3.5" fill="#ff80ab" stroke="#111" stroke-width="1.5" />
        <circle cx="18" cy="9" r="3.5" fill="#ff80ab" stroke="#111" stroke-width="1.5" />
      </g>
      <g id="mutation-claw-r" transform="translate(70.8, 50.8) scale(-1, 1)">
        <circle cx="10" cy="18" r="10" fill="#e91e63" stroke="#111" stroke-width="2.5" />
        <circle cx="10" cy="18" r="7.2" fill="#ff6090" />
        <ellipse cx="8" cy="16" rx="3.0" ry="1.5" fill="#ffffff" opacity="0.6" />
        <circle cx="2" cy="9" r="3.5" fill="#ff80ab" stroke="#111" stroke-width="1.5" />
        <circle cx="10" cy="5" r="3.5" fill="#ff80ab" stroke="#111" stroke-width="1.5" />
        <circle cx="18" cy="9" r="3.5" fill="#ff80ab" stroke="#111" stroke-width="1.5" />
      </g>`,

    // 2. Angel Wings (Fluffy wings with flap anim)
    "wings_stitched": `
      <g id="mutation-wings" class="wing-flap" opacity="0.95">
        <!-- Left Fluffy Wing -->
        <path d="M30,55 C12,47 -8,25 -4,8 C7,4 20,22 26,45 Z" fill="#ffffff" stroke="#111" stroke-width="2.8" />
        <path d="M22,46 C10,38 -2,30 0,18 C6,16 16,28 20,38 Z" fill="#ffcdd2" stroke="#111" stroke-width="1.5" opacity="0.8" />
        <path d="M12,32 C4,28 -3,24 0,16 C3,15 10,21 12,27 Z" fill="#ffe0b2" opacity="0.6" />
        <!-- Right Fluffy Wing -->
        <path d="M70,55 C88,47 108,25 104,8 C93,4 80,22 74,45 Z" fill="#ffffff" stroke="#111" stroke-width="2.8" />
        <path d="M78,46 C90,38 102,30 100,18 C94,16 84,28 80,38 Z" fill="#ffcdd2" stroke="#111" stroke-width="1.5" opacity="0.8" />
        <path d="M88,32 C96,28 103,24 100,16 C97,15 90,21 88,27 Z" fill="#ffe0b2" opacity="0.6" />
      </g>`,

    // 3. Cute Slime/Chimera Tail Tentacles (Semi-translucent mint)
    "tentacles_toxic": `
      <g id="mutation-tentacles">
        <!-- Left Tentacle -->
        <path d="M28,68 C8,74 -15,58 -8,40 C-3,30 9,45 20,62" fill="none" stroke="#00bfa5" stroke-width="7.5" stroke-linecap="round" />
        <path d="M28,68 C8,74 -15,58 -8,40 C-3,30 9,45 20,62" fill="none" stroke="#80cbc4" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="-5" cy="48" r="2.8" fill="#ff4081" stroke="#111" stroke-width="1.0" />
        <circle cx="-5" cy="48" r="1.0" fill="#ffffff" />
        <!-- Right Tentacle -->
        <path d="M72,68 C92,74 115,58 108,40 C103,30 91,45 80,62" fill="none" stroke="#00bfa5" stroke-width="7.5" stroke-linecap="round" />
        <path d="M72,68 C92,74 115,58 108,40 C103,30 91,45 80,62" fill="none" stroke="#80cbc4" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="105" cy="48" r="2.8" fill="#ff4081" stroke="#111" stroke-width="1.0" />
        <circle cx="105" cy="48" r="1.0" fill="#ffffff" />
      </g>`,

    // 4. Cute Hearts / Flame Orbs
    "flame_energy": `
      <g id="mutation-flames" opacity="0.9" class="glow-pulse">
        <path d="M12,48 C6,41 0,46 12,58 C24,46 18,41 12,48 Z" fill="#ff4081" stroke="#111" stroke-width="1.8" />
        <circle cx="12" cy="48" r="2.5" fill="#ffffff" opacity="0.8" />
        <path d="M22,32 C17,27 13,31 22,41 C31,31 27,27 22,32 Z" fill="#e91e63" stroke="#111" stroke-width="1.5" />
        <path d="M88,48 C94,41 100,46 88,58 C76,46 82,41 88,48 Z" fill="#ff4081" stroke="#111" stroke-width="1.8" />
        <circle cx="88" cy="48" r="2.5" fill="#ffffff" opacity="0.8" />
        <path d="M78,32 C83,27 87,31 78,41 C69,31 73,27 78,32 Z" fill="#e91e63" stroke="#111" stroke-width="1.5" />
      </g>`,

    // 5. Feather Spurs (Wing spurs)
    "bone_spurs": `
      <g id="mutation-spurs">
        <path d="M28,52 C12,45 5,50 16,62 Z" fill="#ffffff" stroke="#111" stroke-width="2" />
        <path d="M25,62 C8,60 3,65 14,74 Z" fill="#ffffff" stroke="#111" stroke-width="2" />
        <path d="M72,52 C88,45 95,50 84,62 Z" fill="#ffffff" stroke="#111" stroke-width="2" />
        <path d="M75,62 C92,60 97,65 86,74 Z" fill="#ffffff" stroke="#111" stroke-width="2" />
      </g>`,

    // 6. Shiny Star Bubbles
    "plasma_orbs": `
      <g id="mutation-orbs" class="pulse-glow">
        <circle cx="10" cy="38" r="5.5" fill="#00e5ff" stroke="#111" stroke-width="2.0" />
        <circle cx="10" cy="38" r="2.2" fill="#ffffff" />
        <circle cx="90" cy="38" r="5.5" fill="#00e5ff" stroke="#111" stroke-width="2.0" />
        <circle cx="90" cy="38" r="2.2" fill="#ffffff" />
        <!-- Shiny Stars -->
        <path d="M22,28 L23,31 L26,31 L24,33 L25,36 L22,34 L19,36 L20,33 L18,31 L21,31 Z" fill="#ffeb3b" stroke="#111" stroke-width="0.8" />
        <path d="M78,28 L79,31 L82,31 L80,33 L81,36 L78,34 L75,36 L76,33 L74,31 L77,31 Z" fill="#ffeb3b" stroke="#111" stroke-width="0.8" />
      </g>`,

    // 7. Mechanical Exoskeleton -> Cute Toy Rocket Pack
    "mech_exoskeleton": `
      <g id="mutation-mech">
        <!-- Left Booster -->
        <rect x="8" y="52" width="10" height="24" rx="4.0" fill="#e53935" stroke="#111" stroke-width="2.5" />
        <path d="M8,52 L13,40 L18,52 Z" fill="#ffeb3b" stroke="#111" stroke-width="2.0" />
        <circle cx="13" cy="64" r="2.5" fill="#2196f3" />
        <path d="M13,76 L10,84 L16,84 Z" fill="#ff9100" />
        <ellipse cx="13" cy="85" rx="3.0" ry="1.5" fill="#ffea00" />
        
        <!-- Right Booster -->
        <rect x="82" y="52" width="10" height="24" rx="4.0" fill="#e53935" stroke="#111" stroke-width="2.5" />
        <path d="M82,52 L87,40 L92,52 Z" fill="#ffeb3b" stroke="#111" stroke-width="2.0" />
        <circle cx="87" cy="64" r="2.5" fill="#2196f3" />
        <path d="M87,76 L84,84 L90,84 Z" fill="#ff9100" />
        <ellipse cx="87" cy="85" rx="3.0" ry="1.5" fill="#ffea00" />
        
        <!-- Connector bars -->
        <line x1="18" y1="64" x2="33" y2="64" stroke="#424242" stroke-width="3.5" />
        <line x1="82" y1="64" x2="67" y2="64" stroke="#424242" stroke-width="3.5" />
      </g>`
  },

  // 3 Anya-themed Cute Weapons
  weapons: {
    "scrap_sword": `
      <!-- Anya's Chimera Director Wand -->
      <g id="weapon-sword" class="swing-item">
        <!-- Shaft -->
        <rect x="-3.0" y="12.0" width="6.0" height="25.0" rx="2.5" fill="#8d6e63" stroke="#111" stroke-width="2.5" />
        <line x1="-3.0" y1="20.0" x2="3.0" y2="20.0" stroke="#ffb300" stroke-width="2.0" />
        
        <!-- Chimera Doll Head on Top -->
        <circle cx="0.0" cy="-6.0" r="14.0" fill="#4caf50" stroke="#111" stroke-width="3.0" />
        <!-- Gold Crown on Chimera -->
        <path d="M-8.0,-18.0 L-4.0,-14.0 L0.0,-20.0 L4.0,-14.0 L8.0,-18.0 L5.0,-10.0 L-5.0,-10.0 Z" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="1.5" />
        <!-- Chimera cheeks & eyes -->
        <circle cx="-6.0" cy="-6.0" r="4.0" fill="#ffffff" stroke="#111" stroke-width="1.8" />
        <circle cx="-6.0" cy="-6.0" r="1.8" fill="#111" />
        <circle cx="6.0" cy="-6.0" r="4.0" fill="#ffffff" stroke="#111" stroke-width="1.8" />
        <circle cx="6.0" cy="-6.0" r="1.8" fill="#111" />
        
        <!-- Chimera Pink Blush -->
        <circle cx="-6.0" cy="-2.0" r="2.0" fill="#ff4081" opacity="0.6" />
        <circle cx="6.0" cy="-2.0" r="2.0" fill="#ff4081" opacity="0.6" />
        
        <!-- Chimera Horns (Cyan) -->
        <path d="M-10.0,-12.0 Q-18.0,-16.0 -12.0,-6.0" fill="none" stroke="#4dd0e1" stroke-width="4.0" stroke-linecap="round" />
        <path d="M10.0,-12.0 Q18.0,-16.0 12.0,-6.0" fill="none" stroke="#4dd0e1" stroke-width="4.0" stroke-linecap="round" />
        
        <!-- Cute Ribbon Tied below chimera -->
        <path d="M-12.0,6.0 C-8.0,0.0 8.0,0.0 12.0,6.0" fill="none" stroke="#ff1744" stroke-width="3.5" stroke-linecap="round" />
      </g>`,
    "bio_claw": `
      <!-- Anya's Peanut Sack -->
      <g id="weapon-claw" class="swing-item">
        <!-- Sack Body -->
        <path d="M-13.0,15.0 Q-24.0,-18.0 0.0,-28.0 Q24.0,-18.0 13.0,15.0 C10.0,24.0 -10.0,24.0 -13.0,15.0 Z" fill="url(#peanut-bag-grad)" stroke="#111" stroke-width="3.0" />
        
        <!-- Red Stripes on Sack -->
        <path d="M-15.0,-2.0 Q0.0,-10.0 15.0,-2.0" fill="none" stroke="#d50000" stroke-width="4.0" opacity="0.85" />
        
        <!-- Peanut Logo Text "P" -->
        <circle cx="0" cy="-4" r="5" fill="#ffe082" stroke="#111" stroke-width="1.5" />
        <text x="-2.5" y="-1" font-family="monospace" font-weight="bold" font-size="8" fill="#111">P</text>
        
        <!-- Tied rope on sack mouth -->
        <ellipse cx="0" cy="-22" rx="6" ry="2.2" fill="#d7ccc8" stroke="#111" stroke-width="1.8" />
        <!-- Spilling Peanut Grain -->
        <g transform="translate(18, -25) rotate(45)">
          <ellipse cx="0" cy="0" rx="4" ry="2.2" fill="#ffe082" stroke="#111" stroke-width="1.5" />
        </g>
        <g transform="translate(-18, -12) rotate(-30)">
          <ellipse cx="0" cy="0" rx="3.5" ry="2.0" fill="#ffe082" stroke="#111" stroke-width="1.5" />
        </g>
      </g>`,
    "nuclear_gun": `
      <!-- Anya's Telepathy Mind Wave Blast Ring (Highly Animated) -->
      <g id="weapon-gun" transform="translate(65.12, 75.89)">
        <!-- Orbiting Telepathy Pulse Rings -->
        <circle cx="0.0" cy="-15.12" r="22.0" fill="none" stroke="#e040fb" stroke-width="3.5" stroke-dasharray="10,8" class="spin-gun" />
        <circle cx="0.0" cy="-15.12" r="13.0" fill="none" stroke="#00e5ff" stroke-width="2.5" stroke-dasharray="5,5" class="pulse-glow" />
        
        <!-- Sparkle Center -->
        <path d="M-3.0,-18.12 L0.0,-24.12 L3.0,-18.12 L9.0,-15.12 L3.0,-12.12 L0.0,-6.12 L-3.0,-12.12 L-9.0,-15.12 Z" fill="#ffffff" stroke="#111" stroke-width="1.0" />
        
        <!-- Small floating sparks -->
        <circle cx="-12" cy="-32" r="1.5" fill="#ffeb3b" class="pulse-glow" />
        <circle cx="15" cy="-2" r="1.5" fill="#00e5ff" class="pulse-glow" />
      </g>`
  },

  // 5 High-Precision Spy x Family Themed Enemies (MapleStory Styled)
  enemies: {
    "wolf": `
      <svg viewBox="0 0 100 120" width="100%" height="100%">
        ${shadow}
        <g class="character-bob">
          <!-- Bond Forger: Big Fluffy White Dog with Black Paws -->
          <circle cx="50" cy="74" r="25" fill="url(#bond-fur-grad)" stroke="#111" stroke-width="3" />
          
          <!-- Fluffy Dog Ears -->
          <path d="M28,34 C18,34 14,48 22,52 C27,48 26,40 28,34 Z" fill="url(#bond-ear-grad)" stroke="#111" stroke-width="2.5" />
          <path d="M72,34 C82,34 86,48 78,52 C73,48 74,40 72,34 Z" fill="url(#bond-ear-grad)" stroke="#111" stroke-width="2.5" />
          
          <!-- Head -->
          <circle cx="50" cy="46" r="20" fill="url(#bond-fur-grad)" stroke="#111" stroke-width="3" />
          
          <!-- Green Collar with golden bow tie -->
          <rect x="38" y="62" width="24" height="4" rx="2" fill="#2e7d32" stroke="#111" stroke-width="1.2" />
          <circle cx="50" cy="64" r="2.8" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="1.0" />
          
          <!-- Big Cute Dog Eyes (MapleStory Dot style with highlights) -->
          <ellipse cx="42" cy="46" rx="4.5" ry="5.5" fill="#111" />
          <ellipse cx="58" cy="46" rx="4.5" ry="5.5" fill="#111" />
          <circle cx="43.2" cy="44.2" r="1.8" fill="#ffffff" />
          <circle cx="59.2" cy="44.2" r="1.8" fill="#ffffff" />
          <circle cx="41.0" cy="48.0" r="0.8" fill="#ffffff" opacity="0.6" />
          <circle cx="57.0" cy="48.0" r="0.8" fill="#ffffff" opacity="0.6" />
          
          <!-- Snout and Smile -->
          <ellipse cx="50" cy="52" rx="5.0" ry="3.5" fill="#f5f5f5" stroke="#111" stroke-width="1.2" />
          <path d="M48,51 L52,51 L50,53 Z" fill="#111" />
          <path d="M47,54 Q50,56.5 53,54" stroke="#111" stroke-width="2.0" fill="none" stroke-linecap="round" />
          
          <!-- Fluffy body locks -->
          <path d="M26,78 C24,84 28,90 32,88" stroke="#111" stroke-width="2.0" fill="none" />
          <path d="M74,78 C76,84 72,90 68,88" stroke="#111" stroke-width="2.0" fill="none" />

          <!-- Stubby Black Paws (Bond's signature socks) -->
          <rect x="36" y="93" width="8.5" height="13.0" rx="3.5" fill="#212121" stroke="#111" stroke-width="2.8" />
          <rect x="55.5" y="93" width="8.5" height="13.0" rx="3.5" fill="#212121" stroke="#111" stroke-width="2.8" />
        </g>
      </svg>`,

    "bear": `
      <svg viewBox="0 0 100 120" width="100%" height="100%">
        ${shadow}
        <g class="character-bob">
          <!-- Elegant Professor Henry Henderson -->
          <!-- Suit Coat -->
          <path d="M32,55 L68,55 L61,92 L39,92 Z" fill="#37474f" stroke="#111" stroke-width="3" />
          <!-- White shirt collar & Red tie -->
          <path d="M45,55 L50,66 L55,55 Z" fill="#ffffff" />
          <polygon points="49,63 51,63 52,78 48,78" fill="#d50000" />
          
          <!-- Head with monocle -->
          <circle cx="50" cy="43" r="17" fill="#ffebee" stroke="#111" stroke-width="3" />
          
          <!-- Professor's Top Hat -->
          <rect x="30" y="24" width="40" height="4" rx="1.0" fill="#212121" stroke="#111" stroke-width="2.5" />
          <rect x="35" y="6" width="30" height="18" fill="#212121" stroke="#111" stroke-width="2.8" />
          <rect x="35" y="20" width="30" height="3" fill="#ff1744" /> <!-- Red Hatband -->
          <!-- Stella Badge on Hat -->
          <path d="M50,11 L51.5,14 L55,14 L52,16 L53.5,20 L50,18 L46.5,20 L48,16 L45,14 L48.5,14 Z" fill="url(#stella-grad)" />

          <!-- Monocle Chain & Lens -->
          <circle cx="58" cy="42" r="5.0" fill="none" stroke="url(#gold-metal-grad)" stroke-width="2.2" />
          <path d="M63.0,42.0 Q68.0,46.0 67.0,52.0" stroke="url(#gold-metal-grad)" stroke-width="1.5" fill="none" />
          
          <!-- Mustache and Elegant eyes -->
          <path d="M42,39 L46,39" stroke="#111" stroke-width="2.5" stroke-linecap="round" />
          <path d="M54,39 L58,39" stroke="#111" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="44" cy="43" r="1.8" fill="#111" />
          <circle cx="56" cy="43" r="1.8" fill="#111" />
          <!-- The Elegant Mustache -->
          <path d="M38,50 Q50,44 62,50 C56,50 54,48 50,48 C46,48 44,50 38,50 Z" fill="#455a64" stroke="#111" stroke-width="2.0" />
          <line x1="50" y1="48" x2="50" y2="52" stroke="#111" stroke-width="1.5" />
          
          <!-- Elegant cane stick in hand -->
          <g transform="translate(25, 60)">
            <rect x="-2" y="0" width="4" height="36" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="1.2" />
            <path d="M-6,0 C-6,-6 4,-6 4,0" fill="none" stroke="url(#gold-metal-grad)" stroke-width="2.8" />
          </g>

          <!-- Shiny Shoes -->
          <rect x="38" y="92" width="8.0" height="13.0" rx="2.5" fill="#212121" stroke="#111" stroke-width="2.5" />
          <rect x="54" y="92" width="8.0" height="13.0" rx="2.5" fill="#212121" stroke="#111" stroke-width="2.5" />
        </g>
      </svg>`,

    "drone": `
      <svg viewBox="0 0 100 120" width="100%" height="100%">
        <ellipse cx="50.2" cy="108.2" rx="20.2" ry="5.2" fill="rgba(0,0,0,0.15)" />
        <g class="drone-hover">
          <!-- Telepathy Shock Wave Eye Drone (Sy-on boy's robotic spy tool) -->
          <circle cx="50" cy="50" r="32" fill="none" stroke="#e040fb" stroke-width="4.0" stroke-dasharray="8,6" class="spin-magic" />
          <circle cx="50" cy="50" r="20" fill="#212121" stroke="#111" stroke-width="3.5" />
          <circle cx="50" cy="50" r="12" fill="#00e5ff" class="pulse-glow" />
          <!-- Lens shutter -->
          <path d="M45,50 L50,43 L50,57 L55,50 M50,43 L56,47 M50,57 L44,53" stroke="#ffffff" stroke-width="2.2" fill="none" />
          
          <!-- Flight side wings -->
          <path d="M12,50 L22,43 L20,57 Z" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="1.5" />
          <path d="M88,50 L78,43 L80,57 Z" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="1.5" />
        </g>
      </svg>`,

    "mummy": `
      <svg viewBox="0 0 100 120" width="100%" height="100%">
        ${shadow}
        <g class="character-bob">
          <!-- Damian Desmond: Sy-on Boy with Bandages and Blushing Cheeks -->
          <!-- Uniform Coat -->
          <path d="M32,52 L68,52 L61,90 L39,90 Z" fill="url(#eden-fabric-grad)" stroke="#111" stroke-width="3" />
          <path d="M32,52 C32,52 50,56 68,52" stroke="url(#gold-metal-grad)" stroke-width="2.5" fill="none" />
          
          <!-- Bandage wraps crossing chest -->
          <line x1="33" y1="60" x2="67" y2="64" stroke="#ffffff" stroke-width="3.0" stroke-linecap="round" />
          <line x1="35" y1="74" x2="65" y2="70" stroke="#ffffff" stroke-width="3.0" stroke-linecap="round" />
          
          <!-- Damian Hair (Green/Black spikes) -->
          <path d="M31,30 C27,15 73,15 69,30 L66,35 L34,35 Z" fill="#1b5e20" stroke="#111" stroke-width="2.8" />
          <path d="M35,22 L38,12 L44,22 M44,22 L50,8 L56,22 M56,22 L62,12 L65,22" stroke="#111" stroke-width="2.5" fill="#1b5e20" stroke-linejoin="round" />
          
          <!-- Head -->
          <circle cx="50" cy="42" r="18" fill="#ffebee" stroke="#111" stroke-width="3" />
          
          <!-- Tsundere bandage on cheek -->
          <rect x="31" y="32" width="38" height="6" fill="#ffffff" stroke="#111" stroke-width="2.0" />
          
          <!-- Tsundere Eyes (MapleStory styled angry glares) -->
          <path d="M36,36 L43,39" stroke="#111" stroke-width="3.0" stroke-linecap="round" />
          <path d="M64,36 L57,39" stroke="#111" stroke-width="3.0" stroke-linecap="round" />
          <ellipse cx="42.5" cy="44" rx="4.0" ry="5.0" fill="#e65100" stroke="#111" stroke-width="1.0" />
          <ellipse cx="57.5" cy="44" rx="4.0" ry="5.0" fill="#e65100" stroke="#111" stroke-width="1.0" />
          <circle cx="43.5" cy="42.2" r="1.5" fill="#ffffff" />
          <circle cx="58.5" cy="42.2" r="1.5" fill="#ffffff" />
          
          <!-- Blushing Cheeks (Embarrassed) -->
          <circle cx="37" cy="47" r="4.0" fill="#ff1744" opacity="0.65" />
          <circle cx="63" cy="47" r="4.0" fill="#ff1744" opacity="0.65" />
          
          <!-- Angry Tsundere Mouth (ㅅ shape) -->
          <path d="M47,50.0 Q50,47.0 53,50.0" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round" />
          
          <!-- Sy-on boy shiny shoes -->
          <rect x="38" y="90" width="8.0" height="13.0" rx="2.5" fill="#151515" stroke="#111" stroke-width="2.8" />
          <rect x="54" y="90" width="8.0" height="13.0" rx="2.5" fill="#151515" stroke="#111" stroke-width="2.8" />
        </g>
      </svg>`,

    "boss_bigfoot": `
      <svg viewBox="0 0 140 140" width="100%" height="100%">
        <ellipse cx="70.2" cy="122.2" rx="52.2" ry="12.2" fill="rgba(0,0,0,0.35)" />
        <g class="character-bob">
          <!-- Giant Director Chimera Boss (Anya's Favorite Toy!) -->
          <!-- Boss Halo Aura behind -->
          <circle cx="70" cy="74" r="54" fill="none" stroke="#e040fb" stroke-width="2.5" stroke-dasharray="12,10" class="spin-boss" />
          <circle cx="70" cy="74" r="48" fill="none" stroke="#00e5ff" stroke-width="1.8" stroke-dasharray="6,6" class="pulse-glow" />

          <!-- Big Fluffy Chimera Body -->
          <circle cx="70" cy="78" r="42" fill="#4caf50" stroke="#111" stroke-width="4.0" />
          
          <!-- Golden metalic collar band -->
          <path d="M22,74 C10,50 30,10 70,14 C110,10 130,50 118,74 C110,95 30,95 22,74 Z" fill="url(#gold-metal-grad)" stroke="#111" stroke-width="3.2" opacity="0.9" />
          
          <!-- Chimera Head -->
          <circle cx="70" cy="62" r="28" fill="#4caf50" stroke="#111" stroke-width="3.5" />
          
          <!-- MapleStory Googly Eyes (Detailed sparkling lens overlay) -->
          <circle cx="58" cy="58" r="9.0" fill="#ffffff" stroke="#111" stroke-width="2.8" />
          <circle cx="58" cy="58" r="4.0" fill="#111" />
          <circle cx="60.5" cy="55.5" r="2.0" fill="#ffffff" />
          
          <circle cx="82" cy="58" r="9.0" fill="#ffffff" stroke="#111" stroke-width="2.8" />
          <circle cx="82" cy="58" r="4.0" fill="#111" />
          <circle cx="84.5" cy="55.5" r="2.0" fill="#ffffff" />
          
          <!-- Goofy Wings on Head (Fly!) -->
          <path d="M46,34 L38,14 Q32,12 30,17 Q32,22 43,30" fill="#80deea" stroke="#111" stroke-width="2.8" />
          <path d="M94,34 L102,14 Q108,12 110,17 Q108,22 97,30" fill="#80deea" stroke="#111" stroke-width="2.8" />
          
          <!-- Cute Wobby Smile -->
          <path d="M63,70 Q70,76 77,70" stroke="#111" stroke-width="3.0" fill="none" stroke-linecap="round" />
          <circle cx="70" cy="72" r="1.5" fill="#ff4081" />
          
          <!-- Fluffy white goat wings on back -->
          <path d="M26,60 C10,50 -4,70 6,86 C15,86 23,75 26,70" fill="#ffffff" stroke="#111" stroke-width="3.0" />
          <path d="M114,60 C130,50 144,70 134,86 C125,86 117,75 114,70" fill="#ffffff" stroke="#111" stroke-width="3.0" />
          
          <!-- Purple Snake Tail -->
          <path d="M98,92 C118,102 128,86 128,70 C128,63 120,63 120,68" fill="none" stroke="#ab47bc" stroke-width="7.5" stroke-linecap="round" />
          <!-- Snake head on tail -->
          <circle cx="120" cy="66" r="5.0" fill="#ab47bc" stroke="#111" stroke-width="2.0" />
          <circle cx="120" cy="65" r="1.5" fill="#ffeb3b" />
          <path d="M120,68 L124,70" stroke="#ff1744" stroke-width="1.0" /> <!-- Snake tongue -->
          
          <!-- Sturdy Chimera Feet -->
          <rect x="44" y="114" width="18" height="15" rx="5" fill="#2e7d32" stroke="#111" stroke-width="3.5" />
          <rect x="78" y="114" width="18" height="15" rx="5" fill="#2e7d32" stroke="#111" stroke-width="3.5" />
        </g>
      </svg>`
  }
};

// Generates the combined SVG markup for a character
function renderPlayerSVG(config) {
  if (config && config.spriteSheetConfig && config.spriteSheetConfig.enabled) {
    const s = config.spriteSheetConfig;
    const map = s.mappings[s.currentState || "idle"] || s.mappings.idle;
    const row = map.row;
    const frame = (s.currentFrame || 0) % (map.frames || 1);
    
    const pctX = s.cols > 1 ? (frame / (s.cols - 1)) * 100 : 0;
    const pctY = s.rows > 1 ? (row / (s.rows - 1)) * 100 : 0;
    
    return `
      <div class="sprite-sheet-player" style="
        width: 100%;
        height: 100%;
        background-image: url('${s.transparentUrl || s.url}');
        background-size: ${s.cols * 100}% ${s.rows * 100}%;
        background-position: ${pctX}% ${pctY}%;
        background-repeat: no-repeat;
        image-rendering: pixelated;
      "></div>
    `;
  }

  const headSVG = SVGTemplates.heads[config.headPart || 1]("#ff80ab");
  const bodySVG = SVGTemplates.bodies[config.bodyPart || 1]();
  
  // Render active mutations (overlay layers)
  let mutationsSVG = "";
  if (config.activeMutations && config.activeMutations.length > 0) {
    config.activeMutations.forEach(mKey => {
      if (SVGTemplates.mutations[mKey]) {
        mutationsSVG += SVGTemplates.mutations[mKey];
      }
    });
  }

  // Render weapon
  let weaponSVG = "";
  if (config.weapon && SVGTemplates.weapons[config.weapon]) {
    weaponSVG = SVGTemplates.weapons[config.weapon];
  }

  // Combine into single wrapper with the Custom Outline Filter
  return `
    <svg viewBox="0 0 100 120" width="100%" height="100%">
      <!-- Custom Outline Filters & Gradient Shader Definitions -->
      ${outlineFilter}
      
      <!-- Drop Shadow under character -->
      ${SVGTemplates.shadow}
      
      <!-- Character graphic grouped under MapleStory styled outline filter -->
      <g class="character-bob" filter="url(#char-outline)">
        <!-- Render wings in background if exists -->
        ${config.activeMutations && config.activeMutations.includes("wings_stitched") ? SVGTemplates.mutations["wings_stitched"] : ""}
        
        <!-- Torso & Legs -->
        ${bodySVG}
        
        <!-- Other mutations (tentacles, spurs, claws etc) -->
        ${mutationsSVG.replace(SVGTemplates.mutations["wings_stitched"], "")}
        
        <!-- Head -->
        ${headSVG}
        
        <!-- Weapon (Foreground) -->
        ${weaponSVG}
      </g>
    </svg>
  `;
}

// Render Enemy SVG based on type
function renderEnemySVG(type, customConfig = null) {
  if (type === "custom_boss" && customConfig) {
    const pSvg = renderPlayerSVG(customConfig);
    // Apply Boss outline and scaling
    return pSvg
      .replace('filter="url(#char-outline)"', 'filter="url(#enemy-outline)" class="boss-grow"')
      .replace('<g class="character-bob" filter="url(#enemy-outline)">', '<g class="character-bob boss-grow" filter="url(#enemy-outline)"><circle cx="50.0" cy="60.0" r="45.0" fill="none" stroke="#ff0055" stroke-width="2.8" stroke-dasharray="6,4" class="glow-spin" />');
  }
  
  if (SVGTemplates.enemies[type]) {
    // Wrap enemies with SVG container and outline filter
    return `
      <svg viewBox="0 0 100 120" width="100%" height="100%">
        ${outlineFilter}
        <g filter="url(#enemy-outline)">
          ${SVGTemplates.enemies[type].replace('<svg viewBox="0 0 100 120" width="100%" height="100%">', '').replace('</svg>', '').replace('<svg viewBox="0 0 140 140" width="100%" height="100%">', '')}
        </g>
      </svg>
    `;
  }
  
  return renderEnemySVG("drone");
}

window.SVGRenderer = {
  renderPlayer: renderPlayerSVG,
  renderEnemy: renderEnemySVG,
  templates: SVGTemplates
};
