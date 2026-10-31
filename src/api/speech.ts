import * as Speech from 'expo-speech';

export function speak(text: string, lang = 'zh-CN', rate = 0.95): void {
  if (!text.trim()) return;
  Speech.speak(text, { language: lang, rate, pitch: 1.0 });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}