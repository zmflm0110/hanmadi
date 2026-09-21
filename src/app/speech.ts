// 브라우저에 내장된 음성 합성(Web Speech API). 인터넷 없이도 기기의 한국어 목소리로 읽는다.
let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ko'));
  // 기기 내장(오프라인) 목소리를 먼저
  return voices.find((v) => v.localService) ?? voices[0] ?? null;
}

if (typeof speechSynthesis !== 'undefined') {
  voice = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
  });
}

export function hasKoreanVoice(): boolean {
  return !!(voice ?? pickVoice());
}

/** quiet: '다르게'로 해석을 미리 들어 볼 때 작은 소리로 */
export function speak(text: string, rate = 0.9, quiet = false) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = rate;
  u.volume = quiet ? 0.45 : 1;
  const v = voice ?? pickVoice();
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
