// 명예의 전당 박물관 뷰 (5대 슬롯 전용)
import { state } from "../state.js";
import { t } from "../i18n/index.js";
import { createFaceSVG } from "../render/avatars.js";
import { deleteHallOfFameRecord } from "../systems/regression.js";

export function renderHallOfFameMuseum(root, route) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";

  // 헤더 패널
  const header = document.createElement("section");
  header.className = "panel";
  header.style.padding = "10px";

  const top = document.createElement("div");
  top.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px;";

  const title = document.createElement("h2");
  title.style.cssText = "margin:0; font-size:15px; color:var(--accent-2);";
  title.textContent = t("hof.museumTitle") || "Hall of Fame Museum";
  top.appendChild(title);

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = t("shop.backToMenu") || "Back to Menu";
  backBtn.style.cssText = "padding:6px 10px; font-size:11px;";
  backBtn.addEventListener("click", () => route("menu"));
  top.appendChild(backBtn);

  header.appendChild(top);
  wrap.appendChild(header);

  // 5대 박물관 슬롯 렌더링
  const museum = state.regression?.hallOfFameMuseum ?? {
    batter: null,
    pitcher: null,
    balanced: null,
    honor: null,
    tournament: null,
  };

  const categories = [
    { key: "batter", label: t("hof.cat.batter") || "Best Batter", color: "var(--accent)" },
    { key: "pitcher", label: t("hof.cat.pitcher") || "Best Pitcher", color: "var(--accent-2)" },
    { key: "balanced", label: t("hof.cat.balanced") || "Best Balanced", color: "#d8a040" },
    { key: "honor", label: t("hof.cat.honor") || "Honor of Legend", color: "#bf5eff" },
    { key: "tournament", label: t("hof.cat.tournament") || "World Champion", color: "#5aff87" }
  ];

  const grid = document.createElement("section");
  grid.style.cssText = "display:flex; flex-direction:column; gap:8px;";

  categories.forEach(cat => {
    const record = museum[cat.key];
    const card = document.createElement("div");
    card.className = "panel";
    card.style.cssText = "padding:12px; display:flex; flex-direction:column; gap:6px; position:relative; min-height:100px;";

    // 카테고리 헤더
    const catHeader = document.createElement("div");
    catHeader.style.cssText = `font-size:10px; font-weight:700; color:${cat.color}; text-transform:uppercase; border-bottom:1.5px solid ${cat.color}; padding-bottom:3px; display:flex; justify-content:space-between; align-items:center;`;
    catHeader.innerHTML = `<span>${cat.label}</span>`;
    card.appendChild(catHeader);

    if (record) {
      // 1) 기록 보유자가 있는 경우
      const body = document.createElement("div");
      body.style.cssText = "display:flex; gap:10px; align-items:center; margin-top:4px;";

      // 아바타
      const avatar = document.createElement("div");
      avatar.style.cssText = "width:42px; height:42px; border-radius:50%; background:var(--panel-2); border:2px solid var(--border); overflow:hidden; flex-shrink:0;";
      avatar.appendChild(createFaceSVG(record.faceId || "f1", 38));
      body.appendChild(avatar);

      // 인포
      const info = document.createElement("div");
      info.style.cssText = "flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;";
      
      const topRow = document.createElement("div");
      topRow.style.cssText = "display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;";
      
      const name = document.createElement("div");
      name.style.cssText = "font-weight:700; font-size:13px; color:var(--text);";
      name.textContent = record.name;
      topRow.appendChild(name);

      const subInfo = document.createElement("div");
      subInfo.className = "small muted";
      subInfo.style.fontSize = "10.5px";
      subInfo.textContent = `${t("position." + record.position)} · ${t("common.age", { age: record.age })} · HOF ${record.score}pts (${t("hof." + record.rank + "Title")})`;
      topRow.appendChild(subInfo);
      info.appendChild(topRow);

      // 통산 핵심 요약 성적 텍스트로 보관
      const statLine = document.createElement("div");
      statLine.style.cssText = "font-size:10px; color:var(--muted); line-height:1.4;";
      
      const s = record.stats;
      const isHofPitcher = record.position === "DH" || s.pitchG > 0;

      if (isHofPitcher) {
        // 투수 요약: G / W-L-SV / IP / SO / ERA
        const ip = (s.ipOuts / 3).toFixed(1);
        const eraVal = s.ipOuts > 0 ? (s.er * 27 / s.ipOuts) : 0;
        const era = eraVal.toFixed(2);
        statLine.textContent = `${t("weekly.infoWeek")} ${s.pitchG} | W-L-SV: ${s.w}-${s.l}-${s.sv} | IP: ${ip} | SO: ${s.pK} | ERA: ${era}`;
      } else {
        // 타자 요약: G / AB / AVG / HR / RBI / SB
        const avg = s.ab > 0 ? (s.h / s.ab).toFixed(3) : ".000";
        statLine.textContent = `${t("weekly.infoWeek")} ${s.games} | AB: ${s.ab} | AVG: ${avg.startsWith("0") ? avg.slice(1) : avg} | HR: ${s.hr} | RBI: ${s.rbi} | SB: ${s.sb}`;
      }
      info.appendChild(statLine);
      body.appendChild(info);
      card.appendChild(body);

      // 삭제 버튼 (X) - 오른쪽 위에 배치
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "×";
      delBtn.style.cssText = "position:absolute; top:8px; right:8px; background:none; border:none; color:var(--muted); font-size:16px; padding:2px; cursor:pointer; min-width:0; line-height:1;";
      delBtn.addEventListener("click", () => {
        showConfirmModal(t("hof.deleteConfirm") || "Are you sure you want to delete this record?").then(confirmed => {
          if (confirmed) {
            deleteHallOfFameRecord(cat.key);
            renderHallOfFameMuseum(root, route);
          }
        });
      });
      card.appendChild(delBtn);

    } else {
      // 2) 아직 기록 보유자가 없는 빈 슬롯
      const empty = document.createElement("div");
      empty.style.cssText = "font-size:11px; color:var(--muted); text-align:center; padding:18px 0; font-style:italic;";
      empty.textContent = t("hof.emptySlot") || "Slot Empty (No legend recorded yet)";
      card.appendChild(empty);
    }

    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  root.appendChild(wrap);
}
