// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Función invocable para asignar rol de administrador (protegida para admins existentes)
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  // 1. Verificar autenticación Y que el usuario que llama ES administrador
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Solo usuarios autenticados pueden asignar roles.",
    );
  }

  // *** AHORA SE VERIFICA QUE EL USUARIO QUE HACE LA LLAMADA ES UN ADMIN ***
  const callerClaims = context.auth.token;
  if (!callerClaims.admin) { // Verifica si el Custom Claim 'admin' es true para el invocador
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo administradores pueden asignar roles de administrador.",
    );
  }
  // ********************************************************************

  const userEmail = data.email;
  if (!userEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El correo electrónico del usuario es requerido.",
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(userEmail);
    // Asigna el Custom Claim 'admin' a true
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    // Opcional: Revoca tokens existentes para forzar al usuario a obtener uno nuevo con los claims actualizados
    await admin.auth().revokeRefreshTokens(user.uid); // <-- Recomendado para que el cambio surta efecto más rápido
    return { message: `Éxito: ${userEmail} ahora es administrador.` };
  } catch (error) {
    console.error("Error al asignar rol de administrador:", error);
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuario no encontrado.",
      );
    }
    throw new functions.https.HttpsError(
      "internal",
      "Error interno al asignar rol.", error.message,
    );
  }
});

// Función para asignar rol de usuario común al crear un nuevo usuario
exports.assignCommonUserRoleOnCreate = functions.auth.user().onCreate(async (userRecord) => {
  try {
    await admin.auth().setCustomUserClaims(userRecord.uid, { commonUser: true });
    console.log(`Rol de commonUser asignado a: ${userRecord.email}`);
    return null;
  } catch (error) {
    console.error("Error al asignar rol a nuevo usuario:", error);
    return null;
  }
});


// ¡¡¡ADVERTENCIA DE SEGURIDAD!!!
// ESTA FUNCIÓN ES SOLO PARA ESTABLECER EL PRIMER ADMINISTRADOR DE FORMA TEMPORAL.
// DEBE SER ELIMINADA DE TU CÓDIGO Y DEPLOY DESPUÉS DE SU ÚNICO USO.
exports.addInitialAdmin = functions.https.onCall(async (data, context) => {
  // NOTA: Esta función no tiene la verificación 'context.auth.token.admin' porque su propósito
  // es precisamente crear el primer admin. POR ESO ES TAN PELIGROSA Y TEMPORAL.
  // En un entorno de producción, nunca deberías tener una función tan abierta.

  const adminEmail = data.email; // El email del usuario que se convertirá en admin

  if (!adminEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'El correo electrónico es requerido para establecer el administrador inicial.');
  }

  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    // Establece el Custom Claim 'admin' a true
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    // Opcional pero recomendado: Revocar los tokens existentes para forzar la actualización en el cliente
    await admin.auth().revokeRefreshTokens(user.uid);

    console.log(`Rol de administrador inicial establecido para: ${adminEmail}`);
    return { message: `Rol de administrador inicial establecido para ${adminEmail}. El usuario deberá reautenticarse para ver los cambios.` };

  } catch (error) {
    console.error("Error al establecer el administrador inicial:", error);
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError('not-found', 'Usuario no encontrado con el correo proporcionado.');
    }
    throw new functions.https.HttpsError('internal', 'Fallo al establecer el rol de administrador inicial.', error.message);
  }
});