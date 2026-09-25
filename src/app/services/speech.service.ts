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
  // Configuración de ElevenLabs API
  private readonly elevenLabsBaseUrl = 'https://api.elevenlabs.io/v1/text-to-speech';
  // Voz ultra-humana, expresiva y cálida para Cosmo (Jessica - Friendly, natural & conversational)
  private readonly defaultVoiceId = 'cgSgspJ2msm6clMCkdW9'; 
  private readonly elevenLabsApiKey = 'sk_b21f7f3c1b576970b92d097dbebdb8cd5146330aa8d90977';
  private readonly modelId = 'eleven_multilingual_v2';

  // Manejo de reproducción de audio para ElevenLabs
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;

  // Reconocimiento de voz nativo (Web Speech API - Speech-to-Text)
  private recognition: any = null;
  private isListening = false;

  // Fallback nativo para SpeechSynthesis en caso de error de red o límite de cuota
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initSpeechRecognition();
    this.loadNativeVoices();
  }

  /* ==========================================================================
     1. TEXT-TO-SPEECH (TTS) - ELEVENLABS REST API (CON FALLBACK NATIVO)
     ========================================================================== */

  /**
   * Síntesis de voz usando la API de ElevenLabs con voz de alta calidad para Cosmo.
   * Si la API falla (ej. sin conexión o límite de cuota), se activa fallback a Web Speech API.
   * 
   * @param text Texto a pronunciar
   * @param lang Código de idioma (usado en caso de fallback nativo)
   * @param rate Velocidad (usado en caso de fallback)
   * @param pitch Tono (usado en caso de fallback)
   * @param voiceId ID de voz de ElevenLabs (opcional, por defecto Cosmo)
   */
  public async speak(
    text: string,
    lang: string = 'es-ES',
    rate?: number,
    pitch?: number,
    voiceId: string = this.defaultVoiceId
  ): Promise<void> {
    if (!text || !text.trim()) {
      return;
    }

    // Detener cualquier reproducción previa
    this.stopSpeaking();

    try {
      await this.speakWithElevenLabs(text, voiceId);
    } catch (error) {
      console.warn('⚠️ ElevenLabs API no disponible o con error. Activando fallback nativo Web Speech API:', error);
      await this.speakNativeFallback(text, lang, rate, pitch);
    }
  }

  /**
   * Petición HTTP POST a ElevenLabs REST API para generar audio streaming/blob
   */
  private speakWithElevenLabs(text: string, voiceId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(`${this.elevenLabsBaseUrl}/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': this.elevenLabsApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text: text,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.40, // Modulación natural y humana (evita monotonía sintética)
              similarity_boost: 0.80, // Gran fidelidad, timbre claro y calidez
              style: 0.20, // Expresividad y tono empático amigable
              use_speaker_boost: true // Claridad y realce vocal profesional
            }
          })
        });

        if (!response.ok) {
          const errDetail = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errDetail}`);
        }

        // Procesar el blob de audio (audio/mpeg)
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        this.currentAudio = audio;
        this.currentAudioUrl = audioUrl;

        audio.onended = () => {
          this.cleanupCurrentAudio();
          resolve();
        };

        audio.onerror = (err) => {
          console.error('Error durante la reproducción del audio de ElevenLabs:', err);
          this.cleanupCurrentAudio();
          resolve(); // Resolvemos para no congelar el flujo de la interfaz
        };

        await audio.play();
      } catch (err) {
        this.cleanupCurrentAudio();
        reject(err);
      }
    });
  }

  /**
   * Detiene de inmediato cualquier audio que se esté reproduciendo (ElevenLabs o Web Speech)
   */
  public stopSpeaking(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        console.warn('Error deteniendo elemento Audio:', e);
      }
    }
    this.cleanupCurrentAudio();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Limpia recursos y libera URLs creadas con URL.createObjectURL
   */
  private cleanupCurrentAudio(): void {
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.currentAudio = null;
  }

  /**
   * Retorna true si Cosmo o la Base Espacial están hablando en este momento
   */
  public isSpeaking(): boolean {
    const isAudioPlaying = !!(this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended);
    const isSynthesisSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
    return isAudioPlaying || isSynthesisSpeaking;
  }

  /**
   * Fallback de síntesis de voz nativa del navegador
   */
  private speakNativeFallback(
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

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate ?? (lang.toLowerCase().startsWith('en') ? 0.9 : 0.95);
      utterance.pitch = pitch ?? (lang.toLowerCase().startsWith('en') ? 1.05 : 1.15);

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
        console.warn('Error al iniciar speechSynthesis.speak fallback:', err);
        resolve();
      }
    });
  }

  private loadNativeVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
    }
  }

  /* ==========================================================================
     2. SPEECH-TO-TEXT (STT) - WEB SPEECH RECOGNITION NATIVO
     ========================================================================== */

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
}
