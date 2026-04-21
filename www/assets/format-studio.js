(function() {
  const FORMAT_ITEMS = [
    { key: "ruby", label: "루비", icon: "💎", desc: "한자/영어에 읽는 법 표기", template: "{{ruby:한자|읽는법}}", example: "{{ruby:天命|천명}}이 다가온다." },
    { key: "status", label: "상태창", icon: "📊", desc: "RPG 스타일 스탯 표시", template: ":::status 상태창\n레벨: 1\n힘: 10\n민첩: 99\n:::", example: ":::status 플레이어 정보\n이름: 강현수\n레벨: 47\n직업: 무직\n:::" },
    { key: "system", label: "시스템", icon: "🖥️", desc: "시스템 메시지/알림", template: ":::system SYSTEM\n알림 내용을 입력하세요.\n:::", example: ":::system SYSTEM\n[조건 달성] 숨겨진 퀘스트가 해금되었습니다.\n보상: ???\n:::" },
    { key: "warning", label: "경고문", icon: "⚠️", desc: "위험 경고 연출", template: ":::warning 긴급 경고\n경고 내용을 입력하세요.\n:::", example: ":::warning ⚠️ 치명적 오류\n생존 확률이 0.3% 이하로 감소했습니다.\n즉시 후퇴를 권장합니다.\n:::" },
    { key: "chat", label: "채팅", icon: "💬", desc: "실시간 댓글/채팅 창", template: ":::chat 실시간 반응\n닉네임1|이게 가능해?\n닉네임2|ㅋㅋㅋㅋ\n:::", example: ":::chat 실시간 반응\n명탐정코코|이게 된다고?\n망겜러|ㄹㅇ 개사기\n초보탈출|나도 민첩에 올인해야하나...\n:::" },
    { key: "flashback", label: "회상", icon: "💭", desc: "과거 회상 장면", template: ":::flashback 회상\n회상 내용을 작성하세요.\n:::", example: ":::flashback 3년 전\n그때의 나는 아무것도 모르고 있었다. 던전이 일상이 될 줄은.\n:::" },
    { key: "article", label: "기사문", icon: "📰", desc: "뉴스 기사/공문서", template: ":::article 속보\n기사 내용을 작성하세요.\n:::", example: ":::article [속보] 한국일보\nS급 헌터 강현수, 단독으로 붕괴급 던전 클리어...\n정부 관계자 \"전례 없는 일\"\n:::" },
    { key: "skill", label: "기술명", icon: "⚡", desc: "기술 발동 이펙트", template: ":::skill 기술이름|루비\n기술 설명\n:::", example: ":::skill 절대회피|Absolute Evasion\n민첩에 의한 절대적 회피 — 모든 공격을 무효화한다.\n:::" },
    { key: "bold", label: "강조", icon: "🅱️", desc: "텍스트 굵게 강조", template: "**강조할 텍스트**", example: "그는 **반드시** 살아남을 것이다." }
  ];

  function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function parseInlineTokens(text) {
    const pattern = /({{ruby:([^|}]+)\|([^}]+)}}|\*\*([^*]+)\*\*)/g;
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      if (match[2] && match[3]) {
        tokens.push({ type: "ruby", base: match[2], ruby: match[3] });
      } else if (match[4]) {
        tokens.push({ type: "bold", value: match[4] });
      }
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) {
      tokens.push({ type: "text", value: text.slice(lastIndex) });
    }
    return tokens.length ? tokens : [{ type: "text", value: text }];
  }

  function renderInlineTokens(text, variant = "paragraph", compact = false, center = false) {
    const tokens = parseInlineTokens(text);
    const textClasses = {
      heading: "color: #fff; font-size: 22px; line-height: 30px; font-weight: 900;",
      paragraph: "color: rgba(255,255,255,0.88); font-size: 18px; line-height: 32px; letter-spacing: -0.2px;",
      status: "color: #d9f7ff; font-size: 15px; line-height: 24px; font-family: monospace;",
      system: "color: #e9fbff; font-size: 15px; line-height: 24px; font-weight: 700;",
      warning: "color: #ffe5df; font-size: 15px; line-height: 24px; font-weight: 700;",
      flashback: "color: rgba(255,255,255,0.72); font-size: 17px; line-height: 30px; font-style: italic;",
      article: "color: #f5efe8; font-size: 15px; line-height: 24px;",
      chat: "color: #f7fbff; font-size: 14px; line-height: 22px;",
      skill: "color: #fff4cc; font-size: 15px; line-height: 24px; text-align: center;"
    };
    const rubyClasses = {
      heading: "color: #d6d6d6;", paragraph: "color: #d6d6d6;", status: "color: #7ee7ff;",
      system: "color: #9defff;", warning: "color: #ff9c8a;", flashback: "color: #d1c7bd;",
      article: "color: #d8c7b8;", chat: "color: #bce9ff;", skill: "color: #ffe18a;"
    };

    const wrapperStyle = (center ? "text-align: center; display: block;" : "display: inline;") + (compact ? " margin-top: 4px;" : "");
    const baseStyle = textClasses[variant] || "";

    const html = tokens.map(t => {
      if (t.type === "ruby") {
        const _rt = rubyClasses[variant] || "";
        return `<ruby style="${baseStyle} font-weight: 800;">${escapeHtml(t.base)}<rp>(</rp><rt style="font-size: 10px; font-weight: 700; ${_rt}">${escapeHtml(t.ruby)}</rt><rp>)</rp></ruby>`;
      }
      return `<span style="${baseStyle} ${t.type === "bold" ? "font-weight: 800;" : ""}">${escapeHtml(t.value)}</span>`;
    }).join("");

    return `<span style="${wrapperStyle}">${html}</span>`;
  }

  function parseReaderBlocks(raw) {
    const lines = raw.replace(/\r/g, "").split("\n");
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) { index++; continue; }

      const blockMatch = line.match(/^:::(\w+)(?:\s+(.*))?$/);
      if (blockMatch) {
        const kind = blockMatch[1].toLowerCase();
        const meta = (blockMatch[2] || "").trim();
        index++;
        const content = [];
        while (index < lines.length && lines[index].trim() !== ":::") {
          content.push(lines[index]);
          index++;
        }
        if (index < lines.length && lines[index].trim() === ":::") index++;
        
        const filtered = content.map(l => l.trim()).filter(Boolean);
        switch (kind) {
          case "status": blocks.push({ type: "status", title: meta || "상태창", lines: filtered }); break;
          case "system": blocks.push({ type: "system", title: meta || "SYSTEM", lines: filtered }); break;
          case "warning": blocks.push({ type: "warning", title: meta || "긴급 경고", lines: filtered }); break;
          case "flashback": blocks.push({ type: "flashback", title: meta || "회상", text: filtered.join(" ") }); break;
          case "article": blocks.push({ type: "article", title: meta || "기사문", lines: filtered }); break;
          case "chat": 
            blocks.push({ type: "chat", title: meta || "실시간 반응", items: filtered.map(l => {
              const [author, ...rest] = l.split("|");
              return rest.length ? { author: author.trim(), message: rest.join("|").trim() } : { author: "채팅", message: author.trim() };
            })}); break;
          case "skill": {
            const [title, ruby] = meta.split("|").map(v => v.trim());
            blocks.push({ type: "skill", title: title || "기술 발동", ruby: ruby, lines: filtered });
            break;
          }
          default: blocks.push({ type: "paragraph", text: filtered.join(" ") });
        }
        continue;
      }

      if (line.startsWith("# ")) {
        blocks.push({ type: "heading", text: line.slice(2).trim() });
        index++;
        continue;
      }

      const paragraph = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current || current.startsWith(":::") || current.startsWith("# ")) break;
        paragraph.push(current);
        index++;
      }
      if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    }
    return blocks;
  }

  function renderEffectCard(variant, title, childrenHtml, noHeader = false) {
    const cardStyles = {
      status: "background: rgba(33,78,97,0.24); border: 1px solid rgba(116,234,255,0.46); box-shadow: 0 0 14px rgba(73,217,255,0.18);",
      system: "background: rgba(29,42,59,0.82); border: 1px solid rgba(141,222,255,0.22);",
      warning: "background: rgba(120,28,19,0.55); border: 1px solid rgba(255,118,90,0.44);",
      flashback: "background: rgba(255,255,255,0.04); border-left: 3px solid rgba(255,255,255,0.18); border-radius: 0 18px 18px 0;",
      article: "background: rgba(66,53,43,0.45); border: 1px solid rgba(233,196,153,0.18);",
      chat: "background: rgba(32,36,44,0.86); border: 1px solid rgba(115,133,163,0.2);",
      skill: "background: rgba(72,54,16,0.44); border: 1px solid rgba(255,212,103,0.28); padding: 18px;"
    };
    const titleStyles = {
      status: "color: #93efff;", system: "color: #c7f5ff;", warning: "color: #ff9f8b;",
      flashback: "color: #d8cec3;", article: "color: #f2d7b0;", chat: "color: #c1d4ff;", skill: "color: #d4a843;"
    };

    const header = noHeader ? "" : `<p style="margin-bottom: 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; ${titleStyles[variant] || ""}">${escapeHtml(title)}</p>`;
    return `<div style="border-radius: 18px; padding: 14px 16px; margin: 8px 0; ${cardStyles[variant] || ""}">${header}${childrenHtml}</div>`;
  }

  function renderNovelFormat(source) {
    const blocks = parseReaderBlocks(source || "");
    if (!blocks.length) return "";

    return `<div style="display: flex; flex-direction: column; gap: 18px;">` + blocks.map(b => {
      switch (b.type) {
        case "heading": return renderInlineTokens(b.text, "heading");
        case "paragraph": return renderInlineTokens(b.text, "paragraph");
        case "status": return renderEffectCard("status", b.title, b.lines.map(l => renderInlineTokens(l, "status")).join("<br>"));
        case "system": return renderEffectCard("system", b.title, b.lines.map(l => renderInlineTokens(l, "system")).join("<br>"));
        case "warning": return renderEffectCard("warning", b.title, b.lines.map(l => renderInlineTokens(l, "warning")).join("<br>"));
        case "article": return renderEffectCard("article", b.title, b.lines.map(l => renderInlineTokens(l, "article")).join("<br>"));
        case "flashback": return renderEffectCard("flashback", b.title, renderInlineTokens(b.text, "flashback"));
        case "chat": return renderEffectCard("chat", b.title, b.items.map(item => `
          <div style="border-top: 1px solid rgba(255,255,255,0.06); padding: 6px 0;">
            <div style="font-size: 12px; font-weight: 800; color: #8ed8ff;">${escapeHtml(item.author)}</div>
            ${renderInlineTokens(item.message, "chat", true)}
          </div>
        `).join(""));
        case "skill": {
          const head = `<div style="margin-bottom: 10px; text-align: center;">` + 
            (b.ruby ? `<p style="font-size: 11px; font-weight: 700; color: #ffd76e; margin:0;">${escapeHtml(b.ruby)}</p>` : "") +
            `<p style="font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #fff; margin:0;">${escapeHtml(b.title)}</p>` +
            `</div>`;
          return renderEffectCard("skill", "", head + b.lines.map(l => renderInlineTokens(l, "skill", true, true)).join(""), true);
        }
      }
      return "";
    }).join("") + `</div>`;
  }

  // Make renderer global so episode_upload_pc.html can use it
  window.inkroadFormatRenderer = {
    render: renderNovelFormat
  };

  // Logic for format_studio_pc.html
  const isFormatStudio = window.location.pathname.endsWith("format_studio_pc.html");
  if (isFormatStudio) {
    const btnContainer = document.querySelector("[data-format-buttons]");
    const inputArea = document.querySelector("[data-format-input]");
    const previewBox = document.querySelector("[data-format-preview]");
    const lengthLbl = document.querySelector("[data-format-length]");
    const galleryBox = document.querySelector("[data-format-gallery]");
    const copyBtn = document.querySelector("[data-format-copy]");

    if (btnContainer && inputArea && previewBox && galleryBox) {
      // 1. Render Top Buttons
      btnContainer.innerHTML = FORMAT_ITEMS.map(item => `
        <button class="format-btn" type="button" data-template="${escapeHtml(item.template)}" title="${escapeHtml(item.desc)}">
          <span class="format-icon">${item.icon}</span>
          <span class="format-label">${item.label}</span>
        </button>
      `).join("");

      // 2. Render Gallery
      galleryBox.innerHTML = FORMAT_ITEMS.filter(item => item.key !== "bold" && item.key !== "ruby").map(item => `
        <div class="gallery-card">
          <div class="gallery-head">
            <div class="gallery-title">${item.icon} ${item.label}</div>
            <button class="gallery-insert" type="button" data-template="${escapeHtml(item.example)}">삽입하기</button>
          </div>
          <div class="gallery-body">
            ${renderNovelFormat(item.example)}
          </div>
        </div>
      `).join("");

      // 3. Handle Insert
      function insertTemplate(template) {
        const start = inputArea.selectionStart;
        const end = inputArea.selectionEnd;
        const val = inputArea.value;

        const before = val.substring(0, start);
        const after = val.substring(end);
        const prefix = (before.length > 0 && !before.endsWith('\n')) ? '\n' : '';

        const inserted = prefix + template;
        inputArea.value = before + inserted + after;

        inputArea.selectionStart = inputArea.selectionEnd = start + inserted.length;
        inputArea.focus();
        updatePreview();
      }

      document.querySelectorAll("[data-template]").forEach(btn => {
        btn.addEventListener("click", () => insertTemplate(btn.dataset.template));
      });

      // 4. Handle Sync
      function updatePreview() {
        const val = inputArea.value || "";
        lengthLbl.textContent = val.length.toLocaleString() + "자";
        if (!val.trim()) {
          previewBox.innerHTML = '<p class="preview-placeholder">왼쪽에 본문을 입력하면 독자에게 보이는 화면이 표시됩니다.</p>';
          if(copyBtn) copyBtn.style.display = 'none';
        } else {
          previewBox.innerHTML = renderNovelFormat(val);
          if(copyBtn) copyBtn.style.display = 'inline-flex';
        }
      }

      inputArea.addEventListener("input", updatePreview);
      updatePreview(); // initial state

      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(inputArea.value || "");
          const original = copyBtn.textContent;
          copyBtn.textContent = "✅ 복사 완료";
          copyBtn.classList.replace("secondary", "primary");
          setTimeout(() => {
            copyBtn.textContent = original;
            copyBtn.classList.replace("primary", "secondary");
          }, 2000);
        });
      }
    }
  }

})();
