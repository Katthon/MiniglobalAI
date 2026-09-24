import { Injectable } from '@angular/core';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any = null;
  private isListening = false;

  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initSpeechRecognition();
    this.loadVoices();
  }

  private loadVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
    }
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US'; // Evaluación de Speaking en inglés infantil
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    } else {
      console.info(
        'ℹ️ Web Speech API (SpeechRecognition) no está activa en este navegador (típico de Firefox o pestañas privadas). Se activará el modo fallback adaptativo.'
      );
    }
  }

  /**
   * Retorna si el reconocimiento de voz está soportado en el navegador actual
   */
  public isSpeechSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Inicia la captura del micrófono y retorna la transcripción en inglés
   */
  public startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('RECOGNITION_NOT_SUPPORTED');
        return;
      }

      if (this.isListening) {
        this.recognition.stop();
      }

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        reject(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (err) {
        this.isListening = false;
        reject(err);
      }
    });
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Síntesis de voz: Cosmo y la Base Espacial hablan al niño
   * @param text Texto a leer
   * @param lang Código de idioma ('es-ES' para Cosmo en español, 'en-US' para Listening en inglés)
   * @param rate Velocidad de habla (por defecto 0.9 para inglés infantil y 0.95 para español)
   * @param pitch Tono de habla
   */
  public speak(
    text: string, 
    lang: string = 'es-ES',
    rate?: number,
    pitch?: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis no está disponible en este navegador.');
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      // En Chrome, reanudar si estaba en pausa
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate ?? (lang.toLowerCase().startsWith('en') ? 0.9 : 0.95);
      utterance.pitch = pitch ?? (lang.toLowerCase().startsWith('en') ? 1.05 : 1.15);

      // Buscar voz óptima según el idioma solicitado
      if (!this.voices || this.voices.length === 0) {
        this.voices = window.speechSynthesis.getVoices();
      }

      if (this.voices && this.voices.length > 0) {
        const langNorm = lang.toLowerCase().replace('_', '-');
        const langPrefix = langNorm.split('-')[0];

        const matchedVoice = 
          this.voices.find(v => v.lang.toLowerCase().replace('_', '-') === langNorm) ||
          this.voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)) ||
          this.voices.find(v => v.lang.toLowerCase().includes(langPrefix));

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Error al iniciar speechSynthesis.speak:', err);
        resolve();
      }
    });
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isSpeaking(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.speaking : false;
  }
}
