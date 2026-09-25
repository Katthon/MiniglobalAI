import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonProgressBar,
  IonCard,
  IonCardContent,
  IonButton,
  IonBadge,
  IonSpinner,
  IonInput
} from '@ionic/angular/standalone';
import { QuestionPublic, StudentAnswers } from '../../models/assessment.model';
import { FirebaseAssessmentService } from '../../services/firebase-assessment.service';
import { SpeechService } from '../../services/speech.service';
import { CosmoAvatarComponent } from '../../components/cosmo-avatar/cosmo-avatar.component';

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonProgressBar,
    IonCard,
    IonCardContent,
    IonButton,
    IonBadge,
    IonSpinner,
    IonInput,
    CosmoAvatarComponent
  ],
  templateUrl: './assessment.page.html',
  styleUrls: ['./assessment.page.scss']
})
export class AssessmentPage implements OnInit, OnDestroy {
  public studentName: string = 'Astronaut';
  public questions: QuestionPublic[] = [];
  public currentIndex: number = 0;
  public answers: StudentAnswers = {};
  
  public isLoadingQuestions: boolean = true;
  public isRecording: boolean = false;
  public isSpeakingListening: boolean = false;
  public isSpeakingCosmoTip: boolean = false;
  public speechError: string = '';
  public recognizedText: string = '';
  public isSubmitting: boolean = false;

  constructor(
    private assessmentService: FirebaseAssessmentService,
    public speechService: SpeechService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.assessmentService.getCurrentUser();

    // Verificación estricta: Si no está autenticado, retornar al login
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Extraer dinámicamente el nombre real del usuario autenticado (Google o Email)
    this.studentName = (user.displayName || sessionStorage.getItem('current_student_name') || 'Cadete Espacial').trim();

    try {
      // Lectura segura del nodo 'questions_public' en RTDB con auth activa
      const rawQuestions = await this.assessmentService.getQuestionsPublic();
      // Presentar las preguntas en orden aleatorio estelar
      this.questions = this.shuffleQuestions([...rawQuestions]);
    } catch (error) {
      console.error('Error cargando preguntas desde RTDB:', error);
    } finally {
      this.isLoadingQuestions = false;
    }
  }

  /**
   * Algoritmo Fisher-Yates para barajar aleatoriamente el orden de las preguntas
   */
  private shuffleQuestions(array: QuestionPublic[]): QuestionPublic[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  get currentQuestion(): QuestionPublic | undefined {
    return this.questions[this.currentIndex];
  }

  get progressValue(): number {
    return this.questions.length > 0 ? (this.currentIndex + 1) / this.questions.length : 0;
  }

  public selectOption(option: string): void {
    if (this.currentQuestion) {
      this.answers[this.currentQuestion.id] = option;
    }
  }

  public isOptionSelected(option: string): boolean {
    return this.currentQuestion ? this.answers[this.currentQuestion.id] === option : false;
  }

  /**
   * Captura el texto ingresado en el campo <ion-input> para preguntas 'fill-blank'
   */
  public onFillBlankInput(event: any): void {
    if (!this.currentQuestion) return;
    const value = event?.detail?.value ?? event?.target?.value ?? '';
    this.answers[this.currentQuestion.id] = value;
  }

  public async toggleRecording(): Promise<void> {
    if (!this.currentQuestion) return;

    if (!this.speechService.isSpeechSupported()) {
      this.speechError = 'Tu navegador actual (ej. Firefox) no soporta reconocimiento por voz nativo. ¡Puedes usar el botón "Simular con Cosmo" o escribir tu frase abajo!';
      return;
    }

    if (this.isRecording) {
      this.speechService.stopListening();
      this.isRecording = false;
      return;
    }

    this.isRecording = true;
    this.speechError = '';
    this.recognizedText = '';

    try {
      const transcript = await this.speechService.startListening();
      this.isRecording = false;
      this.recognizedText = transcript;
      this.answers[this.currentQuestion.id] = transcript;
    } catch (err: any) {
      this.isRecording = false;
      if (err === 'RECOGNITION_NOT_SUPPORTED') {
        this.speechError = 'Reconocimiento de voz no soportado en este navegador. Usa el simulador o escribe la frase.';
      } else {
        this.speechError = 'No captamos tu voz. Revisa los permisos de micrófono e intenta de nuevo.';
      }
      console.warn('Speech error:', err);
    }
  }

  public ngOnDestroy(): void {
    this.speechService.stopSpeaking();
    this.speechService.stopListening();
  }

  public async playListeningAudio(): Promise<void> {
    if (!this.currentQuestion) return;

    if (this.isSpeakingListening) {
      this.speechService.stopSpeaking();
      this.isSpeakingListening = false;
      return;
    }

    this.speechService.stopSpeaking();
    this.isSpeakingCosmoTip = false;

    // Obtener el texto de la transmisión cósmica en inglés
    const rawText = this.currentQuestion.context || this.currentQuestion.prompt;
    const cleanText = rawText
      .replace(/[📻🎙️⭐🚀🐱🔍🛰️🪐🍏]/g, '')
      .replace(/["']/g, '')
      .trim();

    this.isSpeakingListening = true;
    try {
      // Las transmisiones de listening son en inglés con tono pausado y claro para niños
      await this.speechService.speak(cleanText, 'en-US', 0.88, 1.05);
    } catch (err) {
      console.warn('Error al reproducir audio de listening:', err);
    } finally {
      this.isSpeakingListening = false;
    }
  }

  public async playCosmoTip(): Promise<void> {
    if (!this.currentQuestion?.cosmoTip) return;

    if (this.isSpeakingCosmoTip) {
      this.speechService.stopSpeaking();
      this.isSpeakingCosmoTip = false;
      return;
    }

    this.speechService.stopSpeaking();
    this.isSpeakingListening = false;

    const cleanTip = this.currentQuestion.cosmoTip
      .replace(/[🚀🐱🔍🛰️🎙️⭐🪐🍏📻]/g, '')
      .trim();

    this.isSpeakingCosmoTip = true;
    try {
      await this.speechService.speak(cleanTip, 'es-ES', 0.95, 1.15);
    } catch (err) {
      console.warn('Error al reproducir tip de Cosmo:', err);
    } finally {
      this.isSpeakingCosmoTip = false;
    }
  }

  public simulateSpeaking(phrase: string): void {
    if (!this.currentQuestion) return;
    this.speechError = '';
    // Simular transcripción perfecta
    const cleanPhrase = phrase.replace(/["']/g, '');
    this.recognizedText = cleanPhrase;
    this.answers[this.currentQuestion.id] = cleanPhrase;
  }

  public nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.resetSpeechStateForNewQuestion();
    }
  }

  public prevQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.resetSpeechStateForNewQuestion();
    }
  }

  private resetSpeechStateForNewQuestion(): void {
    this.speechService.stopSpeaking();
    this.isSpeakingListening = false;
    this.isSpeakingCosmoTip = false;
    this.isRecording = false;
    this.speechError = '';
    if (this.currentQuestion) {
      this.recognizedText = this.answers[this.currentQuestion.id] || '';
    }
  }

  /**
   * Envía las respuestas llamando a la Cloud Function 'evaluateAssessment'.
   * Como /attempts tiene .write: false, el backend calcula y guarda el intento.
   */
  public async submitAssessment(): Promise<void> {
    this.speechService.stopSpeaking();
    this.isSubmitting = true;

    try {
      await this.assessmentService.evaluateAssessment(this.studentName, this.answers);
      this.router.navigate(['/results']);
    } catch (err) {
      console.error('Error al evaluar intento con la Cloud Function:', err);
    } finally {
      this.isSubmitting = false;
    }
  }

  public goToDashboard(): void {
    this.speechService.stopSpeaking();
    this.speechService.stopListening();
    this.router.navigate(['/dashboard']);
  }
}
