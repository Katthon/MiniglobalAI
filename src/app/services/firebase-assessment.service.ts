import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  User, 
  Auth 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  Database 
} from 'firebase/database';
import { 
  getFunctions, 
  httpsCallable, 
  Functions 
} from 'firebase/functions';

import { environment } from '../../environments/environment';
import { 
  QuestionPublic, 
  StudentAnswers, 
  AssessmentAttempt, 
  CosmoFeedback, 
  EvaluationResponse,
  UserProfile,
  SkillType 
} from '../models/assessment.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAssessmentService {
  private app!: FirebaseApp;
  private auth!: Auth;
  private db!: Database;
  private functions!: Functions;

  // Usuario simulado para que la app funcione fluidamente si la API Key es placeholder o offline
  private mockCurrentUser: any = null;

  // 10 Preguntas públicas (sin 'correctAnswer') según reglas de seguridad
  private readonly defaultPublicQuestions: QuestionPublic[] = [
    {
      id: 1,
      type: 'multiple-choice',
      skill: 'grammar',
      prompt: 'Cosmo is preparing for his next space flight. Choose the correct verb form:',
      context: '"Cosmo ___ to the Red Planet tomorrow."',
      options: ['is travelling', 'travelled', 'travels yesterday', 'travelling'],
      cosmoTip: '¡Fíjate en la palabra "tomorrow", nos habla del futuro cercano! 🚀'
    },
    {
      id: 2,
      type: 'vocabulary',
      skill: 'vocabulary',
      prompt: 'Look at the gear an astronaut wears to walk outside the rocket. What is it?',
      options: ['Spacesuit', 'Submarine', 'Helicopter', 'Raincoat'],
      cosmoTip: '¡Es el traje blanco especial que me protege de la gravedad cero! 🐱'
    },
    {
      id: 3,
      type: 'reading',
      skill: 'reading',
      prompt: 'Read Cosmo\'s log and answer the question:',
      context: '"Captain Cosmo found three glowing blue crystals inside the crater. He carefully put them into his backpack to show the crew."',
      options: ['In his backpack', 'Under his bed', 'In the rocket engine', 'On Mars soil'],
      cosmoTip: '¡Busca dónde guardó Cosmo los cristales azules brillantes! 🔍'
    },
    {
      id: 4,
      type: 'multiple-choice',
      skill: 'listening',
      prompt: 'Listen to the audio transmission from the control base:',
      context: '📻 "Attention Explorer: Mars has two small moons named Phobos and Deimos."',
      options: ['Two', 'One', 'Four', 'Zero'],
      cosmoTip: '¡Escucha bien el número de lunas marcianas que mencionó la base! 🛰️'
    },
    {
      id: 5,
      type: 'speaking',
      skill: 'speaking',
      prompt: 'Press the microphone and say this cosmic phrase clearly:',
      context: '"I want to be an astronaut"',
      cosmoTip: '¡Presiona el botón del micrófono y di fuerte tu frase estelar! 🎙️'
    },
    {
      id: 6,
      type: 'fill-blank',
      skill: 'grammar',
      prompt: 'Complete the sentence with the past simple of "see":',
      context: '"Yesterday, Cosmo ___ a shooting star through his telescope."',
      options: ['saw', 'seen', 'sees', 'seeing'],
      cosmoTip: '"Yesterday" significa ayer, ¡necesitamos el pasado simple! ⭐'
    },
    {
      id: 7,
      type: 'vocabulary',
      skill: 'vocabulary',
      prompt: 'Which word means "a vehicle that travels into outer space"?',
      options: ['Rocket', 'Bicycle', 'Train', 'Sailboat'],
      cosmoTip: '¡Tiene propulsores gigantes y fuego al despegar! 🚀'
    },
    {
      id: 8,
      type: 'reading',
      skill: 'reading',
      prompt: 'Read this extraterrestrial report:',
      context: '"On Planet Zog, the sky is bright green and the fluffy alien rabbits love eating glowing space apples."',
      options: ['Glowing space apples', 'Chocolate cookies', 'Fish tacos', 'Space rocks'],
      cosmoTip: '¿Qué fruta galáctica comen los conejos alienígenas? 🍏'
    },
    {
      id: 9,
      type: 'speaking',
      skill: 'speaking',
      prompt: 'Activate the communicator and say this English sentence:',
      context: '"The stars are shining today"',
      cosmoTip: '¡Pronuncia cada palabra con claridad como un auténtico capitán espacial! 🌟'
    },
    {
      id: 10,
      type: 'multiple-choice',
      skill: 'grammar',
      prompt: 'Choose the correct question word for Cosmo\'s question:',
      context: '"___ did you leave your space helmet?" — "In the cockpit."',
      options: ['Where', 'Who', 'When', 'Why'],
      cosmoTip: 'La respuesta menciona un lugar ("In the cockpit"), ¿qué palabra usamos para lugares? 🪐'
    }
  ];

  // Clave de respuestas seguras (simulando que reside exclusivamente en el backend/Cloud Function)
  private readonly serverAnswerKeys: { [id: number]: string } = {
    1: 'is travelling',
    2: 'Spacesuit',
    3: 'In his backpack',
    4: 'Two',
    5: 'I want to be an astronaut',
    6: 'saw',
    7: 'Rocket',
    8: 'Glowing space apples',
    9: 'The stars are shining today',
    10: 'Where'
  };

  private latestEvaluation: EvaluationResponse | null = null;

  public isFirebaseConfigured(): boolean {
    const key = environment.firebase?.apiKey;
    return !!key && 
      !key.includes('TU_API_KEY') && 
      !key.includes('placeholder') && 
      key !== 'AIzaSy_TU_API_KEY_AQUI' &&
      key.trim().length > 15;
  }

  constructor(private authService: AuthService) {
    try {
      if (this.isFirebaseConfigured()) {
        this.app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
        this.auth = getAuth(this.app);
        this.db = getDatabase(this.app);
        this.functions = getFunctions(this.app);
        console.info('🔥 Firebase inicializado con credenciales activas.');
      } else {
        console.info(
          'ℹ️ Firebase operando en Modo Autónomo Local (API Key de plantilla detectada). ' +
          'Tus resultados se guardan localmente en el navegador. ' +
          'Para sincronizar con Firebase Console en la nube, coloca tus credenciales reales en src/environments/environment.ts.'
        );
      }
    } catch (e) {
      console.warn('Inicialización de Firebase en modo tolerante a fallos:', e);
    }
  }

  // ==========================================
  // 1. AUTENTICACIÓN Y CONSULTA DE USUARIO
  // ==========================================

  public getCurrentUser(): any {
    const authUser = this.authService.getCurrentUser();
    if (authUser) {
      return authUser;
    }
    if (this.auth?.currentUser) {
      return this.auth.currentUser;
    }
    if (this.mockCurrentUser) {
      return this.mockCurrentUser;
    }
    const storedUid = sessionStorage.getItem('current_student_uid');
    const storedName = sessionStorage.getItem('current_student_name');
    if (storedUid) {
      return {
        uid: storedUid,
        displayName: storedName || 'Cadete Espacial',
        email: sessionStorage.getItem('current_student_email') || null,
        photoURL: sessionStorage.getItem('current_student_photo') || null,
        isAnonymous: true
      };
    }
    return null;
  }

  /**
   * Consulta el historial de intentos exclusivos del estudiante ($uid).
   * Respeta las reglas de seguridad de Firebase RTDB (attempts/$uid).
   */
  public async getUserAttempts(uid: string): Promise<AssessmentAttempt[]> {
    const attemptsMap: { [id: string]: AssessmentAttempt } = {};

    // 1. Intentar leer de Firebase RTDB en /attempts/$uid
    if (this.isFirebaseConfigured() && this.db) {
      try {
        const snapshot = await get(ref(this.db, `attempts/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const items: AssessmentAttempt[] = Array.isArray(data) ? data : Object.values(data);
          items.forEach(att => {
            if (att && att.id) {
              attemptsMap[att.id] = att;
            }
          });
        }
      } catch (err) {
        console.warn('Lectura de /attempts en RTDB (usando fallback local):', err);
      }
    }

    // 2. Leer también de localStorage (persistencia de respaldo local)
    try {
      const historyRaw = localStorage.getItem('mini_global_ai_attempts') || '[]';
      const localItems: AssessmentAttempt[] = JSON.parse(historyRaw);
      localItems.forEach(att => {
        if (att && (!att.uid || att.uid === uid)) {
          const id = att.id || 'att_' + att.completedAt;
          if (!attemptsMap[id]) {
            attemptsMap[id] = att;
          }
        }
      });
    } catch (e) {
      console.warn('Error leyendo intentos locales:', e);
    }

    const list = Object.values(attemptsMap);
    list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return list;
  }

  /**
   * Autenticación anónima para cumplir con las reglas '.read': 'auth != null'.
   * Si la API Key es placeholder o no es válida, opera de inmediato en modo local
   * sin generar errores 400 en la consola de Google.
   */
  public async loginAsStudent(studentName: string): Promise<any> {
    if (!this.isFirebaseConfigured() || !this.auth) {
      const mockUid = 'cadet_' + Math.random().toString(36).substring(2, 9);
      this.mockCurrentUser = {
        uid: mockUid,
        displayName: studentName,
        isAnonymous: true
      };

      sessionStorage.setItem('current_student_uid', mockUid);
      sessionStorage.setItem('current_student_name', studentName);
      return this.mockCurrentUser;
    }

    try {
      const userCredential = await signInAnonymously(this.auth);
      const user = userCredential.user;

      // Intentar guardar el perfil en /users/$uid
      try {
        const userProfile: UserProfile = {
          uid: user.uid,
          displayName: studentName,
          isAnonymous: user.isAnonymous,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        await set(ref(this.db, `users/${user.uid}`), userProfile);
        console.info('✅ Cadete registrado en Firebase RTDB:', user.uid);
      } catch (dbErr) {
        console.warn('No se pudo escribir en /users en RTDB:', dbErr);
      }

      this.mockCurrentUser = user;
      sessionStorage.setItem('current_student_uid', user.uid);
      sessionStorage.setItem('current_student_name', studentName);
      return user;
    } catch (error: any) {
      console.warn(
        '⚠️ No se pudo autenticar con Firebase Auth en la nube. Continuando en modo local de respaldo:',
        error?.message || error
      );

      // Creamos la sesión mock para que la navegación continúe de inmediato
      const mockUid = 'cadet_' + Math.random().toString(36).substring(2, 9);
      this.mockCurrentUser = {
        uid: mockUid,
        displayName: studentName,
        isAnonymous: true
      };

      sessionStorage.setItem('current_student_uid', mockUid);
      sessionStorage.setItem('current_student_name', studentName);

      return this.mockCurrentUser;
    }
  }

  // ==========================================
  // 2. LECTURA DE PREGUNTAS (questions_public)
  // ==========================================

  /**
   * Trae las preguntas de /questions_public.
   * Regla de seguridad: ".read": "auth != null", ".write": false
   */
  public async getQuestionsPublic(): Promise<QuestionPublic[]> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Permiso Denegado: Debes identificarte como cadete para leer las preguntas.');
    }

    // Si tenemos una conexión Firebase autenticada real con Google:
    if (this.isFirebaseConfigured() && this.auth?.currentUser && this.db) {
      try {
        const snapshot = await get(ref(this.db, 'questions_public'));
        if (snapshot.exists()) {
          const val = snapshot.val();
          const questionsArray: QuestionPublic[] = Array.isArray(val) ? val : Object.values(val);
          const filtered = questionsArray.filter(q => q && q.prompt);
          if (filtered.length > 0) {
            return filtered;
          }
        }
      } catch (error) {
        console.info('Leyendo preguntas preconfiguradas (nodo RTDB vacío o permiso pendiente):', error);
      }
    }

    // Retornar las 10 preguntas preconfiguradas seguras
    return [...this.defaultPublicQuestions];
  }

  // ==========================================
  // 3. EVALUACIÓN Y PERSISTENCIA DE DATOS
  // ==========================================

  /**
   * Procesa la evaluación del intento, guarda los datos localmente y los envía a Firebase si está configurado.
   */
  public async evaluateAssessment(studentName: string, answers: StudentAnswers): Promise<EvaluationResponse> {
    const user = this.getCurrentUser();
    const uid = user ? user.uid : 'cadet_mock';

    // 1. Intento de llamada a Cloud Function real si existe
    if (this.isFirebaseConfigured() && this.functions && this.auth?.currentUser) {
      try {
        const evaluateCallable = httpsCallable<{ studentName: string; answers: StudentAnswers; uid: string }, EvaluationResponse>(
          this.functions, 
          'evaluateAssessment'
        );
        const result = await evaluateCallable({ studentName, answers, uid });
        this.latestEvaluation = result.data;
        this.persistAttemptLocally(result.data.attempt);
        console.info('🚀 Intento evaluado y registrado mediante Cloud Function en Firebase:', result.data.attempt);
        return result.data;
      } catch (callError) {
        console.info('Cloud Function remota no detectada en GCP. Ejecutando evaluación y guardado en RTDB:', callError);
      }
    }

    // 2. Simulación local fiel del backend / Cloud Function
    const dynamicName = (user?.displayName || studentName || sessionStorage.getItem('current_student_name') || 'Cadete Espacial').trim();
    const mockResponse = this.simulateServerSideEvaluation(uid, dynamicName, answers);
    this.latestEvaluation = mockResponse;

    // Guardar persistentemente en el navegador (sessionStorage + localStorage)
    this.persistAttemptLocally(mockResponse.attempt);

    // 3. Si Firebase está configurado, guardar en Realtime Database
    if (this.isFirebaseConfigured() && this.db) {
      try {
        await set(ref(this.db, `attempts/${uid}/${mockResponse.attemptId}`), mockResponse.attempt);
        console.info(`📡 ¡Datos enviados con éxito a Firebase Console! Nodo: attempts/${uid}/${mockResponse.attemptId}`, mockResponse.attempt);
      } catch (rtdbErr) {
        console.warn('⚠️ No se pudo guardar directamente en RTDB (verifica las reglas en Firebase Console):', rtdbErr);
      }
    } else {
      console.info('💾 Intento completado y guardado en almacenamiento local (Modo Autónomo):', mockResponse.attempt);
    }

    return mockResponse;
  }

  private persistAttemptLocally(attempt: AssessmentAttempt): void {
    try {
      const payload = {
        success: true,
        attemptId: attempt.id || 'att_' + Date.now(),
        attempt,
        feedback: this.latestEvaluation?.feedback
      };
      sessionStorage.setItem('latest_evaluation', JSON.stringify(payload));
      localStorage.setItem('latest_evaluation', JSON.stringify(payload));

      const historyRaw = localStorage.getItem('mini_global_ai_attempts') || '[]';
      const history = JSON.parse(historyRaw);
      history.push(attempt);
      localStorage.setItem('mini_global_ai_attempts', JSON.stringify(history));
    } catch (e) {
      console.warn('Error al persistir en almacenamiento local:', e);
    }
  }

  public getLatestEvaluation(): EvaluationResponse | null {
    if (this.latestEvaluation) return this.latestEvaluation;
    const sessionRaw = sessionStorage.getItem('latest_evaluation');
    if (sessionRaw) {
      try { return JSON.parse(sessionRaw); } catch { }
    }
    const localRaw = localStorage.getItem('latest_evaluation');
    if (localRaw) {
      try { return JSON.parse(localRaw); } catch { }
    }
    return null;
  }

  private simulateServerSideEvaluation(uid: string, studentName: string, answers: StudentAnswers): EvaluationResponse {
    const questions = this.defaultPublicQuestions;
    const skillCounts: Record<SkillType, { total: number; correct: number }> = {
      grammar: { total: 0, correct: 0 },
      vocabulary: { total: 0, correct: 0 },
      reading: { total: 0, correct: 0 },
      listening: { total: 0, correct: 0 },
      speaking: { total: 0, correct: 0 }
    };

    let totalCorrect = 0;

    questions.forEach((q) => {
      skillCounts[q.skill].total++;
      const studentAnswer = (answers[q.id] || '').trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const correctAnswer = (this.serverAnswerKeys[q.id] || '').trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');

      if (studentAnswer === correctAnswer) {
        totalCorrect++;
        skillCounts[q.skill].correct++;
      }
    });

    const score = Math.round((totalCorrect / questions.length) * 100);
    const skillsScore = {
      grammar: Math.round((skillCounts.grammar.correct / skillCounts.grammar.total) * 100),
      vocabulary: Math.round((skillCounts.vocabulary.correct / skillCounts.vocabulary.total) * 100),
      reading: Math.round((skillCounts.reading.correct / skillCounts.reading.total) * 100),
      listening: Math.round((skillCounts.listening.correct / skillCounts.listening.total) * 100),
      speaking: Math.round((skillCounts.speaking.correct / skillCounts.speaking.total) * 100)
    };

    const user = this.getCurrentUser();
    const dynamicStudentName = (user?.displayName || studentName || 'Cadete Espacial').trim();

    const attempt: AssessmentAttempt = {
      id: 'att_' + Date.now(),
      uid,
      studentName: dynamicStudentName,
      studentEmail: user?.email || null,
      score,
      skills: skillsScore,
      level: score >= 80 ? 'A2 Star Commander' : (score >= 50 ? 'A2 Star Cadet' : 'A2 Space Explorer'),
      completedAt: new Date().toISOString()
    };

    const feedback = this.generateCosmoFeedback(attempt);

    return {
      success: true,
      attemptId: attempt.id!,
      attempt,
      feedback
    };
  }

  private generateCosmoFeedback(attempt: AssessmentAttempt): CosmoFeedback {
    const skillEntries = Object.entries(attempt.skills) as [SkillType, number][];
    skillEntries.sort((a, b) => a[1] - b[1]);
    const lowestSkill = skillEntries[0][0];
    const skillCapitalized = lowestSkill.charAt(0).toUpperCase() + lowestSkill.slice(1);
    const scoreWords = this.numberToSpanishWords(attempt.score);

    // Inyectar dinámicamente el displayName del estudiante (obtenido de Firebase Auth)
    const dynamicName = (attempt.studentName || this.getCurrentUser()?.displayName || 'Cadete Espacial').trim();

    let mood: 'celebration' | 'encouragement' | 'curious' = 'encouragement';
    let spoken = '';
    let display = '';
    let imagePrompt = '';

    if (attempt.score >= 80) {
      mood = 'celebration';
      spoken = `¡Hola, ${dynamicName}! Soy Cosmo, tu copiloto marciano. ¡Qué despegue tan brillante en tu misión estelar de inglés! Has conseguido ${scoreWords} puntos de cien. Great job! Eso significa buen trabajo espacial. Tu nave viaja a toda velocidad entre las galaxias. En nuestra próxima aventura intergaláctica entrenaremos más en ${skillCapitalized} para que tu tripulación sea invencible. Let us keep shining together! ¡Hasta el infinito y más allá!`;
      display = `¡Misión estelar completada con éxito, ${dynamicName}! 🚀🐾 Puntuación: ${attempt.score}/100. ¡Great job! Próxima parada: potenciar ${skillCapitalized}. ✨🐱`;
      imagePrompt = `A cute minimalist cartoon red cat wearing a white astronaut suit with red details, helmet adapted for cat ears with a small antenna on top, happily holding a glowing golden star with both paws, joyful wide smile, celebrating a high score with student ${dynamicName}, flat design, cute 2D vector style, clean outlines, minimalist soft dark blue space background with tiny simple stars`;
    } else if (attempt.score >= 50) {
      mood = 'encouragement';
      spoken = `¡Hola, explorador ${dynamicName}! Soy Cosmo, el gato marciano. ¡Buen viaje por el cosmos del inglés! Lograste ${scoreWords} puntos de cien. Good effort! Eso significa que hiciste un gran esfuerzo. Los mejores astronautas siempre revisan sus mapas de vuelo, y nuestra próxima misión será practicar ${skillCapitalized}. Let us practice more! ¡Tu nave está lista para volar aún más alto!`;
      display = `¡Buen viaje por el cosmos, ${dynamicName}! 🛸🐾 Obtuviste ${attempt.score}/100. ¡Good effort! Vamos a calibrar tus motores en ${skillCapitalized}. 🌟🐱`;
      imagePrompt = `A cute minimalist cartoon red cat wearing a white astronaut suit with red details, helmet with cat ear shapes and a tiny antenna, holding a glowing star map with a magnifying glass, encouraging student ${dynamicName}, thumbs up, flat design, cute 2D vector style, solid pastel dark blue background`;
    } else {
      mood = 'curious';
      spoken = `¡Hola, cadete ${dynamicName}! Aquí Cosmo desde la estación espacial. El espacio es enorme y cada misión nos enseña cosas nuevas. Obtuviste ${scoreWords} puntos de cien. Do not give up! Eso significa que nunca nos rendimos. Es hora de encender los propulsores para repasar ${skillCapitalized}. Come on, let us try again! ¡Pronto serás el mejor capitán de toda la galaxia!`;
      display = `¡El espacio está lleno de nuevas misiones, ${dynamicName}! 🪐🐾 Obtuviste ${attempt.score}/100. ¡Never give up! Cosmo te ayudará a conquistar ${skillCapitalized}. 🚀❤️`;
      imagePrompt = `A cute minimalist cartoon red cat wearing a white astronaut suit with red details, cute round cat ears in helmet, pointing forward with a tiny paw and smiling warmly to encourage ${dynamicName}, flat design, cute 2D vector style, solid clean navy blue space background`;
    }

    return {
      spokenFeedback: spoken,
      displayMessage: display,
      imagePrompt,
      mood,
      focusSkill: skillCapitalized
    };
  }

  private numberToSpanishWords(n: number): string {
    if (n === 100) return 'cien';
    if (n === 0) return 'cero';
    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const specials: { [k: number]: string } = {
      11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
      16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
      21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco'
    };

    if (specials[n]) return specials[n];
    if (n < 10) return units[n];
    if (n % 10 === 0) return tens[Math.floor(n / 10)];
    if (n < 30) return 'veinti' + units[n % 10];
    return `${tens[Math.floor(n / 10)]} y ${units[n % 10]}`;
  }
}
