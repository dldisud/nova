// Run: node tests/format-blocks.test.js
var assert = require('assert');

global.window = global;
require('../assets/format-blocks.js');
var parseBlocks = global.parseBlocks;

var passed = 0; var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS ' + name); passed++; }
  catch (e) { console.log('  FAIL ' + name + ': ' + e.message); failed++; }
}

// 루비
test('루비: 인라인 변환', function () {
  var r = parseBlocks('그는 [루비:천뢰섬|Heavenly Thunder Flash]을 시전했다.');
  assert(r.includes('<ruby>천뢰섬<rt>Heavenly Thunder Flash</rt></ruby>'), 'ruby 태그 없음');
});
test('루비: 여러 개 인라인', function () {
  var r = parseBlocks('[루비:A|B] 그리고 [루비:C|D]');
  assert(r.includes('<ruby>A<rt>B</rt></ruby>'), '첫 ruby 없음');
  assert(r.includes('<ruby>C<rt>D</rt></ruby>'), '두 번째 ruby 없음');
});

// 상태창
test('상태창: fmt-status 블록', function () {
  var r = parseBlocks('[상태창:이름=이강호|레벨=47]');
  assert(r.includes('class="fmt-status"'), 'fmt-status 없음');
  assert(r.includes('◤ STATUS WINDOW ◢'), '헤더 없음');
  assert(r.includes('이강호'), '값 없음');
  assert(r.includes('레벨'), '키 없음');
});

// 시스템
test('시스템: fmt-system 블록', function () {
  var r = parseBlocks('[시스템:퀘스트 완료 — 보상 1,200 골드]');
  assert(r.includes('class="fmt-system"'), 'fmt-system 없음');
  assert(r.includes('◤ SYSTEM ◢'), '헤더 없음');
  assert(r.includes('퀘스트 완료'), '본문 없음');
});

// 채팅
test('채팅: fmt-chat 블록', function () {
  var r = parseBlocks('[채팅:유저1=와 저거 뭐임|유저2=실화냐]');
  assert(r.includes('class="fmt-chat"'), 'fmt-chat 없음');
  assert(r.includes('유저1'), '유저명 없음');
  assert(r.includes('와 저거 뭐임'), '메시지 없음');
});

test('채팅: 유저명 없는 항목 fallback', function () {
  var r = parseBlocks('[채팅:유저1=메시지|메시지만]');
  assert(!r.includes('class="fmt-chat-user"><'), 'fmt-chat-user 빈 span 있음');
  assert(r.includes('메시지만'), '키 없는 메시지 없음');
});

// 일반 텍스트
test('일반 텍스트: p 태그', function () {
  var r = parseBlocks('안녕하세요\n\n반갑습니다');
  assert(r.includes('<p>안녕하세요</p>'), '첫 p 없음');
  assert(r.includes('<p>반갑습니다</p>'), '두 번째 p 없음');
});

// 빈 입력
test('빈 입력: 빈 문자열', function () {
  assert.strictEqual(parseBlocks(''), '');
  assert.strictEqual(parseBlocks(null), '');
});

// XSS
test('XSS: 스크립트 이스케이프', function () {
  var r = parseBlocks('[루비:<script>alert(1)</script>|xss]');
  assert(!r.includes('<script>'), 'XSS 이스케이프 실패');
});

// 잘못된 문법 → 텍스트로 노출
test('잘못된 문법: 에러 없이 p 태그', function () {
  var r = parseBlocks('[상태창:닫는 괄호 없음');
  assert(r.includes('<p>'), 'p 태그 없음');
});

console.log('\n결과: ' + passed + ' 통과 / ' + failed + ' 실패');
if (failed > 0) process.exit(1);
