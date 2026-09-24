import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { getDatabase, ref, set, get, Database } from 'firebase/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserProfile } from '../models/assessment.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app!: FirebaseApp;
  private auth!: Auth;
  private db!: Database;

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  constructor() {
    this.initFirebase();
    this.restoreStoredUser();
  }

  public isFirebaseConfigured(): boolean {
    const key = environment.firebase?.apiKey;
    return !!key &&
      !key.includes('TU_API_KEY') &&
      !key.includes('placeholder') &&
      key !== 'AIzaSy_TU_API_KEY_AQUI' &&
      key.trim().length > 15;
  }

  private initFirebase(): void {
    if (!this.isFirebaseConfigured()) {
      return;
    }

    try {
      this.app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
      this.auth = getAuth(this.app);
      this.db = getDatabase(this.app);

      onAuthStateChanged(this.auth, (user: User | null) => {
        if (user) {
          const profile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Cadete Espacial',
            email: user.email,
            photoURL: user.photoURL,
            isAnonymous: user.isAnonymous,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
          };
          this.setSessionUser(profile);
        } else if (!this.currentUserSubject.value) {
          this.clearSessionUser();
        }
      });
    } catch (e) {
      console.warn('Inicialización de AuthService en modo tolerante a fallos:', e);
    }
  }

  private restoreStoredUser(): void {
    const stored = sessionStorage.getItem('auth_user_profile') || localStorage.getItem('auth_user_profile');
    if (stored) {
      try {
        const profile: UserProfile = JSON.parse(stored);
        this.currentUserSubject.next(profile);
      } catch {
        this.clearSessionUser();
      }
    }
  }

  public getCurrentUser(): UserProfile | null {
    if (this.currentUserSubject.value) {
      return this.currentUserSubject.value;
    }
    const stored = sessionStorage.getItem('auth_user_profile') || localStorage.getItem('auth_user_profile');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Actualiza el perfil de usuario tanto localmente como en Firebase RTDB
   */
  public async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated: UserProfile = {
      ...current,
      ...updates,
      lastActive: new Date().toISOString()
    };
    this.setSessionUser(updated);
    await this.syncUserProfileToDatabase(updated);
    return updated;
  }

  /**
   * Inicio de sesión con Google (Google Sign-In con Popup)
   */
  public async loginWithGoogle(): Promise<UserProfile> {
    if (!this.isFirebaseConfigured() || !this.auth) {
      console.info('ℹ️ Firebase sin credenciales reales. Simulando inicio de sesión de Google en modo local.');
      const mockProfile: UserProfile = {
        uid: 'google_cadet_' + Math.random().toString(36).substring(2, 8),
        displayName: 'Cadete Cosmo Explorador',
        email: 'cadete.espacial@miniglobal.ai',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.setSessionUser(mockProfile);
      return mockProfile;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      const profile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Astronauta Estelar',
        email: user.email,
        photoURL: user.photoURL,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };

      await this.syncUserProfileToDatabase(profile);
      this.setSessionUser(profile);
      return profile;
    } catch (error: any) {
      console.error('Error en Google Sign-In:', error);
      throw error;
    }
  }

  /**
   * Inicio de sesión con Correo y Contraseña
   */
  public async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    if (!this.isFirebaseConfigured() || !this.auth) {
      console.info('ℹ️ Firebase sin credenciales reales. Simulando login de correo en modo local.');
      const localName = email.split('@')[0] || 'Cadete Espacial';
      const mockProfile: UserProfile = {
        uid: 'email_cadet_' + Math.random().toString(36).substring(2, 8),
        displayName: localName.charAt(0).toUpperCase() + localName.slice(1),
        email: email,
        photoURL: null,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.setSessionUser(mockProfile);
      return mockProfile;
    }

    try {
      const cred = await signInWithEmailAndPassword(this.auth, email.trim(), pass);
      const user = cred.user;

      const profile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0] || 'Cadete Espacial',
        email: user.email,
        photoURL: user.photoURL,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };

      await this.syncUserProfileToDatabase(profile);
      this.setSessionUser(profile);
      return profile;
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        console.warn('⚠️ Proveedor de correo inactivo en Firebase Console. Conectando en modo autónomo local:');
        const localName = email.split('@')[0] || 'Cadete Espacial';
        const fallbackProfile: UserProfile = {
          uid: 'cadet_' + Math.random().toString(36).substring(2, 9),
          displayName: localName.charAt(0).toUpperCase() + localName.slice(1),
          email: email.trim(),
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        this.setSessionUser(fallbackProfile);
        return fallbackProfile;
      }
      console.error('Error en Login con Correo:', error);
      throw error;
    }
  }

  /**
   * Registro de un nuevo estudiante con Correo, Contraseña y Nombre
   */
  public async registerWithEmail(email: string, pass: string, displayName: string): Promise<UserProfile> {
    if (!this.isFirebaseConfigured() || !this.auth) {
      console.info('ℹ️ Firebase sin credenciales reales. Simulando registro en modo local.');
      const cleanName = displayName.trim() || email.split('@')[0] || 'Cadete Espacial';
      const mockProfile: UserProfile = {
        uid: 'email_cadet_' + Math.random().toString(36).substring(2, 8),
        displayName: cleanName,
        email: email,
        photoURL: null,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.setSessionUser(mockProfile);
      return mockProfile;
    }

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email.trim(), pass);
      const user = cred.user;

      if (displayName.trim()) {
        await updateProfile(user, { displayName: displayName.trim() });
      }

      const profile: UserProfile = {
        uid: user.uid,
        displayName: displayName.trim() || user.displayName || email.split('@')[0] || 'Cadete Espacial',
        email: user.email,
        photoURL: user.photoURL,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };

      await this.syncUserProfileToDatabase(profile);
      this.setSessionUser(profile);
      return profile;
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        console.warn('⚠️ Proveedor de correo inactivo en Firebase Console. Conectando en modo autónomo local:');
        const cleanName = displayName.trim() || email.split('@')[0] || 'Cadete Espacial';
        const fallbackProfile: UserProfile = {
          uid: 'cadet_' + Math.random().toString(36).substring(2, 9),
          displayName: cleanName,
          email: email.trim(),
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        this.setSessionUser(fallbackProfile);
        return fallbackProfile;
      }
      console.error('Error al registrar estudiante:', error);
      throw error;
    }
  }

  /**
   * Cierre de sesión completo
   */
  public async logout(): Promise<void> {
    try {
      if (this.auth && this.isFirebaseConfigured()) {
        await signOut(this.auth);
      }
    } catch (err) {
      console.warn('Aviso en signOut:', err);
    } finally {
      this.clearSessionUser();
    }
  }

  private async syncUserProfileToDatabase(profile: UserProfile): Promise<void> {
    if (this.isFirebaseConfigured() && this.db) {
      try {
        await set(ref(this.db, `users/${profile.uid}`), profile);
      } catch (err) {
        console.warn('No se pudo escribir en /users en RTDB:', err);
      }
    }
  }

  private setSessionUser(profile: UserProfile): void {
    this.currentUserSubject.next(profile);
    const json = JSON.stringify(profile);
    sessionStorage.setItem('auth_user_profile', json);
    localStorage.setItem('auth_user_profile', json);

    // Compatibilidad directa con los componentes del assessment
    sessionStorage.setItem('current_student_uid', profile.uid);
    sessionStorage.setItem('current_student_name', profile.displayName);
    if (profile.email) {
      sessionStorage.setItem('current_student_email', profile.email);
    }
    if (profile.photoURL) {
      sessionStorage.setItem('current_student_photo', profile.photoURL);
    }
  }

  private clearSessionUser(): void {
    this.currentUserSubject.next(null);
    sessionStorage.removeItem('auth_user_profile');
    localStorage.removeItem('auth_user_profile');
    sessionStorage.removeItem('current_student_uid');
    sessionStorage.removeItem('current_student_name');
    sessionStorage.removeItem('current_student_email');
    sessionStorage.removeItem('current_student_photo');
  }
}
