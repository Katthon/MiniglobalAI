import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonProgressBar,
  IonBadge,
  IonSpinner,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonToast,
  IonChip
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { FirebaseAssessmentService } from '../../services/firebase-assessment.service';
import { UserProfile, AssessmentAttempt, SkillType } from '../../models/assessment.model';
import { CosmoAvatarComponent } from '../../components/cosmo-avatar/cosmo-avatar.component';

export interface SpaceBadge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonCard,
    IonCardContent,
    IonProgressBar,
    IonBadge,
    IonSpinner,
    IonModal,
    IonItem,
    IonLabel,
    IonInput,
    IonToast,
    IonChip,
    CosmoAvatarComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnInit {
  public Math = Math;
  public user: UserProfile | null = null;
  public attempts: AssessmentAttempt[] = [];
  public isLoading: boolean = true;

  // Métricas calculadas
  public averageScore: number = 0;
  public bestScore: number = 0;
  public strongestSkill: { name: string; score: number; icon: string } | null = null;
  public weakestSkill: { name: string; score: number; icon: string } | null = null;
  public skillAverages: { key: SkillType; name: string; icon: string; score: number }[] = [];

  // Gamificación y Rango Espacial
  public xpPoints: number = 100;
  public cadetLevel: number = 1;
  public levelProgress: number = 0.2;
  public rankTitle: string = 'Cadete Novato';
  public streakDays: number = 3;

  // Modal de Perfil de Usuario
  public isProfileModalOpen: boolean = false;
  public editDisplayName: string = '';
  public selectedAvatar: string = '🧑‍🚀';
  public availableAvatars: string[] = ['🧑‍🚀', '👩‍🚀', '🐱', '👽', '🤖', '🛸', '⭐', '🪐'];
  public isSavingProfile: boolean = false;

  // Toasts interactivos
  public isToastOpen: boolean = false;
  public toastMessage: string = '';
  public toastColor: string = 'warning';

  // Medallas y Logros Galácticos
  public badges: SpaceBadge[] = [];

  constructor(
    private authService: AuthService,
    private assessmentService: FirebaseAssessmentService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.user = this.authService.getCurrentUser();

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.editDisplayName = this.user.displayName || 'Cadete Espacial';
    this.selectedAvatar = this.user.avatarIcon || '🧑‍🚀';
    this.streakDays = this.user.streakDays || 3;
    this.updateBadges();

    await this.loadStudentProgress();
  }

  public async loadStudentProgress(): Promise<void> {
    if (!this.user) return;
    this.isLoading = true;

    try {
      // Consulta a Firebase RTDB (/attempts/$uid) respetando las reglas de seguridad
      this.attempts = await this.assessmentService.getUserAttempts(this.user.uid);
      this.calculatePerformanceMetrics();
    } catch (err) {
      console.warn('Error al cargar progreso del estudiante:', err);
    } finally {
      this.isLoading = false;
    }
  }

  private calculatePerformanceMetrics(): void {
    if (!this.attempts || this.attempts.length === 0) {
      this.averageScore = 0;
      this.bestScore = 0;
      this.strongestSkill = null;
      this.weakestSkill = null;
      this.xpPoints = 120;
      this.cadetLevel = 1;
      this.levelProgress = 0.25;
      this.rankTitle = '🧑‍🚀 Cadete Novato';
      this.skillAverages = [
        { key: 'grammar', name: 'Grammar', icon: '📝', score: 0 },
        { key: 'vocabulary', name: 'Vocabulary', icon: '📚', score: 0 },
        { key: 'reading', name: 'Reading', icon: '📖', score: 0 },
        { key: 'listening', name: 'Listening', icon: '🎧', score: 0 },
        { key: 'speaking', name: 'Speaking', icon: '🎙️', score: 0 }
      ];
      this.updateBadges();
      return;
    }

    const total = this.attempts.reduce((acc, att) => acc + att.score, 0);
    this.averageScore = Math.round(total / this.attempts.length);
    this.bestScore = Math.max(...this.attempts.map(a => a.score));

    // Gamificación: cálculo dinámico de XP y Nivel Estelar
    this.xpPoints = Math.max(150, (this.attempts.length * 60) + (total * 4));
    this.cadetLevel = Math.floor(this.xpPoints / 250) + 1;
    this.levelProgress = Math.min(1, Math.max(0.1, (this.xpPoints % 250) / 250));

    if (this.cadetLevel >= 5) {
      this.rankTitle = '🚀 Comandante Estelar';
    } else if (this.cadetLevel >= 3) {
      this.rankTitle = '⭐ Piloto de Exploración';
    } else if (this.cadetLevel >= 2) {
      this.rankTitle = '🛸 Cadete Especialista';
    } else {
      this.rankTitle = '🧑‍🚀 Cadete Novato';
    }

    // Desglose por habilidades
    const sums: Record<SkillType, number> = {
      grammar: 0,
      vocabulary: 0,
      reading: 0,
      listening: 0,
      speaking: 0
    };

    this.attempts.forEach(att => {
      sums.grammar += att.skills?.grammar || 0;
      sums.vocabulary += att.skills?.vocabulary || 0;
      sums.reading += att.skills?.reading || 0;
      sums.listening += att.skills?.listening || 0;
      sums.speaking += att.skills?.speaking || 0;
    });

    const count = this.attempts.length;
    const skillsList = [
      { key: 'grammar' as SkillType, name: 'Grammar', icon: '📝', score: Math.round(sums.grammar / count) },
      { key: 'vocabulary' as SkillType, name: 'Vocabulary', icon: '📚', score: Math.round(sums.vocabulary / count) },
      { key: 'reading' as SkillType, name: 'Reading', icon: '📖', score: Math.round(sums.reading / count) },
      { key: 'listening' as SkillType, name: 'Listening', icon: '🎧', score: Math.round(sums.listening / count) },
      { key: 'speaking' as SkillType, name: 'Speaking', icon: '🎙️', score: Math.round(sums.speaking / count) }
    ];

    this.skillAverages = skillsList;

    // Ordenar para identificar habilidad más fuerte y más débil
    const sorted = [...skillsList].sort((a, b) => b.score - a.score);
    this.strongestSkill = sorted[0];
    this.weakestSkill = sorted[sorted.length - 1];

    this.updateBadges();
  }

  private updateBadges(): void {
    const hasAttempts = this.attempts.length > 0;
    const hasGreatScore = this.bestScore >= 80;
    const hasPerfectScore = this.bestScore === 100;
    const hasSpeakingMastery = this.attempts.some(a => (a.skills?.speaking || 0) >= 80);
    const hasListeningMastery = this.attempts.some(a => (a.skills?.listening || 0) >= 80);

    this.badges = [
      {
        id: 'first_launch',
        icon: '🚀',
        title: 'Primer Despegue',
        desc: 'Completaste tu 1era misión espacial',
        unlocked: hasAttempts
      },
      {
        id: 'star_cadet',
        icon: '⭐',
        title: 'Cadete Sobresaliente',
        desc: '80%+ de puntuación estelar',
        unlocked: hasGreatScore
      },
      {
        id: 'perfect_orbit',
        icon: '🏆',
        title: 'Órbita Perfecta',
        desc: '¡100% de aciertos impecables!',
        unlocked: hasPerfectScore
      },
      {
        id: 'radio_expert',
        icon: '🎙️',
        title: 'Comandante de Voz',
        desc: '80%+ en evaluación de Speaking',
        unlocked: hasSpeakingMastery
      },
      {
        id: 'sonar_ear',
        icon: '🎧',
        title: 'Radar Galáctico',
        desc: '80%+ en evaluación de Listening',
        unlocked: hasListeningMastery
      },
      {
        id: 'road_to_b2',
        icon: '🌌',
        title: 'Rumbo a B2',
        desc: 'Explorando el mapa de aprendizaje galáctico',
        unlocked: true
      }
    ];
  }

  public openProfileModal(): void {
    if (this.user) {
      this.editDisplayName = this.user.displayName;
      this.selectedAvatar = this.user.avatarIcon || '🧑‍🚀';
    }
    this.isProfileModalOpen = true;
  }

  public closeProfileModal(): void {
    this.isProfileModalOpen = false;
  }

  public selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  public async saveProfile(): Promise<void> {
    if (!this.editDisplayName.trim()) return;

    this.isSavingProfile = true;
    try {
      const updated = await this.authService.updateUserProfile({
        displayName: this.editDisplayName.trim(),
        avatarIcon: this.selectedAvatar,
        cadetTitle: this.rankTitle,
        xpPoints: this.xpPoints
      });

      if (updated) {
        this.user = updated;
        sessionStorage.setItem('current_student_name', updated.displayName);
      }

      this.toastMessage = '✨ ¡Expediente de Cadete actualizado con éxito!';
      this.toastColor = 'success';
      this.isToastOpen = true;
      this.isProfileModalOpen = false;
    } catch (err) {
      console.warn('Error al guardar perfil:', err);
      this.toastMessage = '⚠️ No se pudo guardar el perfil. Intenta de nuevo.';
      this.toastColor = 'danger';
      this.isToastOpen = true;
    } finally {
      this.isSavingProfile = false;
    }
  }

  public showLockedAlert(featureName: string, requirementText: string): void {
    this.toastMessage = `🔒 "${featureName}": Cosmo dice: ${requirementText}`;
    this.toastColor = 'warning';
    this.isToastOpen = true;
  }

  public startNewAssessment(): void {
    if (this.user) {
      sessionStorage.setItem('current_student_name', this.user.displayName);
      sessionStorage.setItem('current_student_uid', this.user.uid);
    }
    this.router.navigate(['/assessment']);
  }

  public async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  public formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}
