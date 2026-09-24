import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardContent,
  IonButton,
  IonProgressBar
} from '@ionic/angular/standalone';
import { AssessmentAttempt, CosmoFeedback, SkillType } from '../../models/assessment.model';
import { FirebaseAssessmentService } from '../../services/firebase-assessment.service';
import { SpeechService } from '../../services/speech.service';
import { CosmoAvatarComponent } from '../../components/cosmo-avatar/cosmo-avatar.component';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCard,
    IonCardContent,
    IonButton,
    IonProgressBar,
    CosmoAvatarComponent
  ],
  templateUrl: './results.page.html',
  styleUrls: ['./results.page.scss']
})
export class ResultsPage implements OnInit, OnDestroy {
  public attempt: AssessmentAttempt | null = null;
  public feedback: CosmoFeedback | null = null;
  public isSpeakingCosmo: boolean = false;

  public skillsList: { key: SkillType; label: string; icon: string; score: number }[] = [];

  constructor(
    private assessmentService: FirebaseAssessmentService,
    private speechService: SpeechService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtenemos la evaluación retornada por la Cloud Function 'evaluateAssessment'
    const evalData = this.assessmentService.getLatestEvaluation();
    
    if (!evalData) {
      this.router.navigate(['/login']);
      return;
    }

    this.attempt = evalData.attempt;
    this.feedback = evalData.feedback;

    // Desglose de habilidades
    this.skillsList = [
      { key: 'grammar', label: 'Grammar', icon: '📝', score: this.attempt.skills.grammar },
      { key: 'vocabulary', label: 'Vocabulary', icon: '📚', score: this.attempt.skills.vocabulary },
      { key: 'reading', label: 'Reading', icon: '📖', score: this.attempt.skills.reading },
      { key: 'listening', label: 'Listening', icon: '🎧', score: this.attempt.skills.listening },
      { key: 'speaking', label: 'Speaking', icon: '🎙️', score: this.attempt.skills.speaking }
    ];

    // Reproducción de voz de Cosmo
    setTimeout(() => {
      this.playCosmoVoice();
    }, 800);
  }

  ngOnDestroy(): void {
    this.speechService.stopSpeaking();
  }

  public async playCosmoVoice(): Promise<void> {
    if (!this.feedback) return;
    this.isSpeakingCosmo = true;
    try {
      await this.speechService.speak(this.feedback.spokenFeedback);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    } finally {
      this.isSpeakingCosmo = false;
    }
  }

  public stopCosmoVoice(): void {
    this.speechService.stopSpeaking();
    this.isSpeakingCosmo = false;
  }

  public goToDashboard(): void {
    this.speechService.stopSpeaking();
    this.router.navigate(['/dashboard']);
  }

  public restart(): void {
    this.speechService.stopSpeaking();
    this.router.navigate(['/assessment']);
  }
}
