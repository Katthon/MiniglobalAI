const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function Callable: evaluateAssessment
 * Ejecuta con credenciales de Administrador (bypassing security rules para escribir en /attempts/$uid).
 */
exports.evaluateAssessment = functions.https.onCall(async (data, context) => {
  // 1. Validar que la petición venga de un usuario autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes estar autenticado para enviar la evaluación.'
    );
  }

  const uid = context.auth.uid;
  const { studentName, answers } = data;

  if (!studentName || !answers) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan datos obligatorios (studentName o answers).'
    );
  }

  const db = admin.database();

  // 2. Leer las respuestas correctas de /questions_answer_key (inaccesible para el cliente)
  const answersSnapshot = await db.ref('questions_answer_key').once('value');
  const answerKeys = answersSnapshot.val() || {};

  // 3. Leer las preguntas públicas para saber a qué habilidad pertenece cada ID
  const publicSnapshot = await db.ref('questions_public').once('value');
  const questionsPublic = publicSnapshot.val() || [];

  const skillCounts = {
    grammar: { total: 0, correct: 0 },
    vocabulary: { total: 0, correct: 0 },
    reading: { total: 0, correct: 0 },
    listening: { total: 0, correct: 0 },
    speaking: { total: 0, correct: 0 }
  };

  let totalCorrect = 0;
  const totalQuestions = Object.keys(answerKeys).length || 10;

  questionsPublic.forEach(q => {
    if (!q) return;
    const skill = q.skill;
    if (skillCounts[skill]) {
      skillCounts[skill].total++;
    }

    const studentAns = (answers[q.id] || '').trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    const correctAns = (answerKeys[q.id] || '').trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');

    if (studentAns === correctAns) {
      totalCorrect++;
      if (skillCounts[skill]) {
        skillCounts[skill].correct++;
      }
    }
  });

  const score = Math.round((totalCorrect / totalQuestions) * 100);

  const skillsScore = {
    grammar: skillCounts.grammar.total > 0 ? Math.round((skillCounts.grammar.correct / skillCounts.grammar.total) * 100) : 100,
    vocabulary: skillCounts.vocabulary.total > 0 ? Math.round((skillCounts.vocabulary.correct / skillCounts.vocabulary.total) * 100) : 100,
    reading: skillCounts.reading.total > 0 ? Math.round((skillCounts.reading.correct / skillCounts.reading.total) * 100) : 100,
    listening: skillCounts.listening.total > 0 ? Math.round((skillCounts.listening.correct / skillCounts.listening.total) * 100) : 100,
    speaking: skillCounts.speaking.total > 0 ? Math.round((skillCounts.speaking.correct / skillCounts.speaking.total) * 100) : 100
  };

  const attemptId = 'attempt_' + Date.now();
  const attemptRecord = {
    id: attemptId,
    uid: uid,
    studentName: studentName,
    score: score,
    skills: skillsScore,
    level: 'A2 Star Cadet',
    completedAt: new Date().toISOString()
  };

  // 4. Guardar en /attempts/$uid (Permitido porque admin.database() corre con privilegios de servidor)
  await db.ref(`attempts/${uid}/${attemptId}`).set(attemptRecord);

  // 5. Retornar el resultado con la retroalimentación de Cosmo
  return {
    success: true,
    attemptId: attemptId,
    attempt: attemptRecord,
    feedback: generateCosmoFeedback(attemptRecord)
  };
});

function generateCosmoFeedback(attempt) {
  const skillEntries = Object.entries(attempt.skills);
  skillEntries.sort((a, b) => a[1] - b[1]);
  const lowestSkill = skillEntries[0][0];
  const skillCapitalized = lowestSkill.charAt(0).toUpperCase() + lowestSkill.slice(1);

  let mood = 'encouragement';
  let spoken = '';
  let display = '';
  let imagePrompt = '';

  if (attempt.score >= 80) {
    mood = 'celebration';
    spoken = `¡Hola, ${attempt.studentName}! Soy Cosmo, tu copiloto marciano. ¡Qué despegue tan brillante en tu misión estelar de inglés! Has conseguido ${attempt.score} puntos de cien. Great job! Eso significa buen trabajo espacial. Tu nave viaja a toda velocidad entre las galaxias. En nuestra próxima aventura intergaláctica entrenaremos más en ${skillCapitalized} para que tu tripulación sea invencible. Let us keep shining together! ¡Hasta el infinito y más allá!`;
    display = `¡Misión estelar completada con éxito, ${attempt.studentName}! 🚀🐾 Puntuación: ${attempt.score}/100. ¡Great job! Próxima parada: potenciar ${skillCapitalized}. ✨🐱`;
    imagePrompt = `A cute minimalist cartoon red cat wearing a white astronaut suit with red details, helmet adapted for cat ears with a small antenna on top, happily holding a glowing golden star with both paws, joyful wide smile, celebrating a high score, flat design, cute 2D vector style, clean outlines, minimalist soft dark blue space background with tiny simple stars`;
  } else if (attempt.score >= 50) {
    mood = 'encouragement';
    spoken = `¡Hola, explorador ${attempt.studentName}! Soy Cosmo, el gato marciano. ¡Buen viaje por el cosmos del inglés! Lograste ${attempt.score} puntos de cien. Good effort! Eso significa que hiciste un gran esfuerzo. Los mejores astronautas siempre revisan sus mapas de vuelo, y nuestra próxima misión será practicar ${skillCapitalized}. Let us practice more! ¡Tu nave está lista para volar aún más alto!`;
    display = `¡Buen viaje por el cosmos, ${attempt.studentName}! 🛸🐾 Obtuviste ${attempt.score}/100. ¡Good effort! Vamos a calibrar tus motores en ${skillCapitalized}. 🌟🐱`;
    imagePrompt = `A cute minimalist cartoon red cat wearing a white astronaut suit with red details, helmet with cat ear shapes and a tiny antenna, holding a glowing star map with a magnifying glass, curious and encouraging expression, thumbs up, flat design, cute 2D vector style, solid pastel dark blue background`;
  } else {
    mood = 'curious';
    spoken = `¡Hola, cadete ${attempt.studentName}! Aquí Cosmo desde la estación espacial. El espacio es enorme y cada misión nos enseña cosas nuevas. Obtuviste ${attempt.score} puntos de cien. Do not give up! Eso significa que nunca nos rendimos. Es hora de encender los propulsores para repasar ${skillCapitalized}. Come on, let us try again! ¡Pronto serás el mejor capitán de toda la galaxia!`;
    display = `¡El espacio está lleno de nuevas misiones, ${attempt.studentName}! 🪐🐾 Obtuviste ${attempt.score}/100. ¡Never give up! Cosmo te ayudará a conquistar ${skillCapitalized}. 🚀❤️`;
    imagePrompt = `A cute minimalist cartoon red cat wearing a white astronaut suit with red details, cute round cat ears in helmet, pointing forward with a tiny paw and smiling warmly, encouraging attitude, flat design, cute 2D vector style, solid clean navy blue space background`;
  }

  return {
    spokenFeedback: spoken,
    displayMessage: display,
    imagePrompt,
    mood,
    focusSkill: skillCapitalized
  };
}
