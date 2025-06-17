// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Función invocable para asignar rol de administrador
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Solo usuarios autenticados pueden asignar roles.",
    );
  }

  const userEmail = data.email;
  if (!userEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El correo electrónico del usuario es requerido.",
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(userEmail);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
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
    // Usamos userRecord en lugar de user para mayor claridad con Firebase Authentication UserRecord
    await admin.auth().setCustomUserClaims(userRecord.uid, { commonUser: true });
    console.log(`Rol de commonUser asignado a: ${userRecord.email}`);
    return null;
  } catch (error) {
    console.error("Error al asignar rol a nuevo usuario:", error);
    return null;
  }
});