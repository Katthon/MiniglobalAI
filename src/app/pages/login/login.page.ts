import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonSpinner
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { CosmoAvatarComponent } from '../../components/cosmo-avatar/cosmo-avatar.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
    CosmoAvatarComponent
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  public authMode: 'google' | 'login' | 'register' = 'login';
  public email: string = '';
  public password: string = '';
  public studentName: string = '';
  public errorMessage: string = '';
  public isAuthenticating: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Inicio de sesión con Google (Requerimiento 1)
   * Extrae uid, email, displayName y navega al Dashboard del Estudiante.
   */
  public async loginWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.isAuthenticating = true;

    try {
      const user = await this.authService.loginWithGoogle();
      console.info('🚀 Autenticado con Google:', user.displayName, user.email, user.uid);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      console.error('Error en Google Sign-In:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        this.errorMessage = 'Ventana de Google cerrada antes de completar el acceso.';
      } else if (err.code === 'auth/unauthorized-domain') {
        this.errorMessage = 'Dominio no autorizado en Firebase Console > Authentication > Settings.';
      } else {
        this.errorMessage = err.message || 'No se pudo iniciar sesión con Google. Intenta nuevamente.';
      }
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Inicio de sesión o Registro con Correo y Contraseña
   */
  public async submitEmailAuth(): Promise<void> {
    this.errorMessage = '';

    if (!this.email || !this.email.includes('@')) {
      this.errorMessage = 'Por favor ingresa un correo electrónico válido.';
      return;
    }

    if (!this.password || this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.authMode === 'register' && (!this.studentName || this.studentName.trim().length < 2)) {
      this.errorMessage = 'Por favor escribe tu nombre de astronauta para registrarte.';
      return;
    }

    this.isAuthenticating = true;

    try {
      if (this.authMode === 'register') {
        const user = await this.authService.registerWithEmail(
          this.email.trim(),
          this.password,
          this.studentName.trim()
        );
        console.info('🎉 Cuenta de estudiante creada:', user.displayName);
      } else {
        const user = await this.authService.loginWithEmail(
          this.email.trim(),
          this.password
        );
        console.info('🚀 Sesión iniciada con correo:', user.displayName);
      }

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      console.error('Error en autenticación por correo:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        this.errorMessage = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        this.errorMessage = 'Este correo ya tiene una cuenta. Elige "Iniciar Sesión".';
      } else if (err.code === 'auth/operation-not-allowed') {
        this.errorMessage = 'El proveedor de Correo/Contraseña aún no está activo en Firebase Console > Authentication > Sign-in method. Puedes usar Google o el botón de Modo Libre.';
      } else {
        this.errorMessage = err.message || 'Error al conectar con la base espacial.';
      }
    } finally {
      this.isAuthenticating = false;
    }
  }

  public setMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.errorMessage = '';
  }

  /**
   * Acceso rápido de prueba / demostración local
   */
  public async enterAsDemoCadet(): Promise<void> {
    const demoName = this.studentName.trim() || 'Cadete Cosmo';
    this.isAuthenticating = true;
    try {
      await this.authService.registerWithEmail(
        `cadete.${Date.now()}@miniglobal.ai`,
        'espacio123',
        demoName
      );
      this.router.navigate(['/dashboard']);
    } catch {
      this.router.navigate(['/dashboard']);
    } finally {
      this.isAuthenticating = false;
    }
  }
}
