const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.listUsers = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden listar usuarios.');
    }

    try {
        const listUsersResult = await admin.auth().listUsers();
        const users = listUsersResult.users.map(userRecord => {
            return {
                uid: userRecord.uid,
                email: userRecord.email,
                customClaims: userRecord.customClaims || {},
            };
        });
        return { users: users };
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        throw new functions.https.HttpsError('internal', 'Error al obtener la lista de usuarios.', error.message);
    }
});


exports.createUserAndAssignRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden crear y asignar roles de usuario.');
    }

    const email = data.email;
    const password = data.password;
    const role = data.role;

    if (!email || !password || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Email, contraseña y rol son obligatorios.');
    }

    if (password.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
    }

    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
        });

        const customClaims = {};
        if (role === 'admin') {
            customClaims.admin = true;
        } else if (role === 'commonUser') {
            customClaims.commonUser = true;
        } else {
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

exports.updateUserRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden actualizar roles de usuario.');
    }

    const uid = data.uid;
    const newClaims = data.claims;

    if (!uid || !newClaims) {
        throw new functions.https.HttpsError('invalid-argument', 'UID y nuevos claims son obligatorios.');
    }

    try {
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

// NUEVA FUNCIÓN: Eliminar un usuario
exports.deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden eliminar usuarios.');
    }

    const uid = data.uid;

    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'UID del usuario es obligatorio para eliminar.');
    }

    if (uid === context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'No puedes eliminar tu propia cuenta de usuario a través de esta función.');
    }

    try {
        await admin.auth().deleteUser(uid);
        console.log(`Usuario con UID: ${uid} eliminado exitosamente.`);
        return { message: `Usuario eliminado exitosamente.` };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
        }
        console.error('Error al eliminar usuario:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo eliminar el usuario.', error.message);
    }
});

// NUEVA FUNCIÓN: Actualizar email de un usuario
exports.updateUserEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden actualizar el email de un usuario.');
    }

    const uid = data.uid;
    const newEmail = data.email;

    if (!uid || !newEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'UID y nuevo email son obligatorios.');
    }

    try {
        await admin.auth().updateUser(uid, { email: newEmail });
        console.log(`Email del usuario ${uid} actualizado a ${newEmail}.`);
        return { message: `Email actualizado a ${newEmail}.` };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
        } else if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'El nuevo email ya está en uso por otra cuenta.');
        }
        console.error('Error al actualizar email del usuario:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo actualizar el email del usuario.', error.message);
    }
});

// NUEVA FUNCIÓN: Actualizar contraseña de un usuario
exports.updateUserPassword = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'La función requiere autenticación.');
    }
    if (!context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden actualizar la contraseña de un usuario.');
    }

    const uid = data.uid;
    const newPassword = data.password;

    if (!uid || !newPassword) {
        throw new functions.https.HttpsError('invalid-argument', 'UID y nueva contraseña son obligatorios.');
    }

    if (newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
    }

    try {
        await admin.auth().updateUser(uid, { password: newPassword });
        console.log(`Contraseña del usuario ${uid} actualizada.`);
        return { message: `Contraseña del usuario actualizada exitosamente.` };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
        }
        console.error('Error al actualizar contraseña del usuario:', error);
        throw new functions.https.HttpsError('internal', 'No se pudo actualizar la contraseña del usuario.', error.message);
    }
});


exports.addInitialAdmin = functions.https.onCall(async (data, context) => {
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

exports.assignCommonUserRoleOnCreate = functions.auth.user().onCreate(async (user) => {
    console.log('Nuevo usuario creado por Auth, UID:', user.uid, 'Email:', user.email);
    try {
        const userRecord = await admin.auth().getUser(user.uid);
        if (userRecord.customClaims && (userRecord.customClaims.admin || userRecord.customClaims.commonUser)) {
            console.log(`Usuario ${user.email} ya tiene claims, no se asignará commonUser: true.`);
            return null;
        }

        await admin.auth().setCustomUserClaims(user.uid, { commonUser: true });
        console.log(`Claims 'commonUser: true' asignados al nuevo usuario: ${user.email}`);
    } catch (error) {
        console.error(`Error al asignar commonUser claim al usuario ${user.email}:`, error);
    }
});