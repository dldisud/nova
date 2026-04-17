(function (global) {
  function esc(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseParams(str) {
    return str.split('|').map(function (pair) {
      var eq = pair.indexOf('=');
      if (eq === -1) return { key: '', value: pair.trim() };
      return { key: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
    });
  }

  function renderStatusBlock(para) {
    var content = para.slice('[상태창:'.length, -1);
    var rows = parseParams(content).map(function (p) {
      return '<div class="fmt-status-row"><span class="fmt-k">' + esc(p.key) +
        '</span><span class="fmt-v">' + esc(p.value) + '</span></div>';
    }).join('');
    return '<div class="fmt-status"><div class="fmt-status-header">◤ STATUS WINDOW ◢</div>' + rows + '</div>';
  }

  function renderSystemBlock(para) {
    var content = para.slice('[시스템:'.length, -1);
    return '<div class="fmt-system"><div class="fmt-system-header">◤ SYSTEM ◢</div>' +
      '<div class="fmt-system-body">' + esc(content) + '</div></div>';
  }

  function renderChatBlock(para) {
    var content = para.slice('[채팅:'.length, -1);
    var rows = parseParams(content).map(function (p) {
      var userSpan = p.key
        ? '<span class="fmt-chat-user">' + esc(p.key) + '</span>'
        : '';
      return '<div class="fmt-chat-row">' + userSpan + '<span class="fmt-chat-msg">' + esc(p.value) + '</span></div>';
    }).join('');
    return '<div class="fmt-chat">' + rows + '</div>';
  }

  function parseBlocks(body) {
    if (!body) return '';

    var text = body.replace(/\[루비:([^\|]+)\|([^\]]+)\]/g, function (_, main, ruby) {
      return '<ruby>' + esc(main.trim()) + '<rt>' + esc(ruby.trim()) + '</rt></ruby>';
    });

    return text.split(/\n{2,}/).filter(Boolean).map(function (para) {
      var trimmed = para.trim();
      if (trimmed.startsWith('[상태창:') && trimmed.endsWith(']')) return renderStatusBlock(trimmed);
      if (trimmed.startsWith('[시스템:') && trimmed.endsWith(']')) return renderSystemBlock(trimmed);
      if (trimmed.startsWith('[채팅:') && trimmed.endsWith(']')) return renderChatBlock(trimmed);
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  global.parseBlocks = parseBlocks;
  if (typeof module !== 'undefined') module.exports = { parseBlocks: parseBlocks };
}(typeof window !== 'undefined' ? window : global));
