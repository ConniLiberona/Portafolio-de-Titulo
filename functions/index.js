// functions/index.js (o index.ts)

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializa el SDK de Admin solo una vez
admin.initializeApp();

// 1. Función Callable para listar usuarios (Solo para administradores)
exports.listUsers = functions.https.onCall(async (data, context) => {
    // 1.1. Verificar autenticación y rol de administrador del llamador
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) { // Verifica el custom claim 'admin'
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden listar usuarios.');
    }

    try {
        const listUsersResult = await admin.auth().listUsers(); // Puedes pasar maxResults para paginación
        const users = listUsersResult.users.map(userRecord => {
            return {
                uid: userRecord.uid,
                email: userRecord.email,
                customClaims: userRecord.customClaims || {}, // Asegurarse de devolver los claims
            };
        });
        return { users: users };
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        throw new functions.https.HttpsError('internal', 'Error al obtener la lista de usuarios.', error.message);
    }
});


// 2. Función Callable para crear un nuevo usuario y asignar rol
exports.createUserAndAssignRole = functions.https.onCall(async (data, context) => {
    // 2.1. Verificar autenticación y rol de administrador del llamador
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden crear y asignar roles de usuario.');
    }

    const email = data.email;
    const password = data.password;
    const role = data.role; // 'admin' o 'commonUser'

    if (!email || !password || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Email, contraseña y rol son obligatorios.');
    }

    if (password.length < 6) { // Firebase Auth requiere al menos 6 caracteres
        throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
    }

    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            // displayName: 'Nuevo Usuario', // Opcional
        });

        const customClaims = {};
        if (role === 'admin') {
            customClaims.admin = true;
            // Si asignas 'admin', asegúrate de que no tenga 'commonUser'
            // Esto es una simplificación, tu lógica de roles puede ser más compleja
        } else if (role === 'commonUser') {
            customClaims.commonUser = true;
        } else {
            // Si el rol es desconocido, puedes decidir no asignar ninguno o lanzar un error
            console.warn(`Rol desconocido '${role}' para el usuario ${email}. No se asignarán claims.`);
        }

        if (Object.keys(customClaims).length > 0) {
            await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
            console.log(`Claims '${JSON.stringify(customClaims)}' asignados al usuario: ${userRecord.email}`);
        }

        return { message: `Usuario ${email} creado exitosamente con el rol: ${role}.` };

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'El email proporcionado ya está en uso.');
        } else if (error.code === 'auth/invalid-password') {
            throw new functions.https.HttpsError('invalid-argument', 'La contraseña es demasiado débil.');
        }
        console.error('Error al crear usuario y asignar rol:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo crear el usuario.', error.message);
    }
});

// 3. Función Callable para actualizar el rol de un usuario existente
exports.updateUserRole = functions.https.onCall(async (data, context) => {
    // 3.1. Verificar autenticación y rol de administrador del llamador
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden actualizar roles de usuario.');
    }

    const uid = data.uid;
    const newClaims = data.claims; // e.g., { admin: true, commonUser: false }

    if (!uid || !newClaims) {
        throw new functions.https.HttpsError('invalid-argument', 'UID y nuevos claims son obligatorios.');
    }

    try {
        // Se sobreescribirán los claims existentes con los nuevos.
        // Para MERGEAR claims, primero obtén los claims actuales y luego combínalos.
        // Ejemplo de MERGE:
        // const currentUser = await admin.auth().getUser(uid);
        // const mergedClaims = { ...currentUser.customClaims, ...newClaims };
        // await admin.auth().setCustomUserClaims(uid, mergedClaims);

        // Para sobreescribir completamente (más simple si siempre envías todos los claims deseados):
        await admin.auth().setCustomUserClaims(uid, newClaims);

        console.log(`Claims '${JSON.stringify(newClaims)}' actualizados para el UID: ${uid}`);
        return { message: `Rol del usuario ${uid} actualizado exitosamente.` };

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
        }
        console.error('Error al actualizar rol del usuario:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo actualizar el rol del usuario.', error.message);
    }
});

// Mantén tu función addInitialAdmin si todavía la usas para configurar el primer admin
// O si ya tienes un admin, puedes eliminarla de la UI.
exports.addInitialAdmin = functions.https.onCall(async (data, context) => {
    // Esta función no requiere que el llamador sea admin, ya que está diseñada
    // para establecer el PRIMER admin. Deberías eliminarla de tu UI una vez usada.
    const email = data.email;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email requerido.');
    }

    try {
        const user = await admin.auth().getUserByEmail(email);
        if (user.customClaims && user.customClaims.admin) {
            return { message: `${email} ya es administrador.` };
        }
        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        return { message: `Usuario ${email} ahora es administrador.` };
    } catch (error) {
        console.error("Error en addInitialAdmin:", error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
        }
        throw new functions.https.HttpsError('internal', 'Error al establecer el administrador inicial.', error.message);
    }
});

// Mantén tu función assignCommonUserRoleOnCreate (se dispara automáticamente al crear usuario)
exports.assignCommonUserRoleOnCreate = functions.auth.user().onCreate(async (user) => {
    console.log('Nuevo usuario creado por Auth, UID:', user.uid, 'Email:', user.email);
    try {
        // Evita sobreescribir si ya tiene un rol (ej. si fue creado con createUserAndAssignRole y ya es admin)
        const userRecord = await admin.auth().getUser(user.uid);
        if (userRecord.customClaims && (userRecord.customClaims.admin || userRecord.customClaims.commonUser)) {
            console.log(`Usuario ${user.email} ya tiene claims, no se asignará commonUser: true.`);
            return null; // Salir si ya tiene claims
        }

        await admin.auth().setCustomUserClaims(user.uid, { commonUser: true });
        console.log(`Claims 'commonUser: true' asignados al nuevo usuario: ${user.email}`);
    } catch (error) {
        console.error(`Error al asignar commonUser claim al usuario ${user.email}:`, error);
    }
});