import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getAuth, signOut } from 'firebase/auth'; // Importa signOut para la función de logout
import appMoscasSAG from '../../credenciales'; // Asume que tus credenciales están ahí

const auth = getAuth(appMoscasSAG); // Obtiene la instancia de autenticación

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Estado para saber si Firebase ya cargó el usuario inicial
    const [userClaims, setUserClaims] = useState({}); // Nuevo estado para los Custom Claims

    // Función para forzar la actualización del ID Token del usuario actual
    // Esto es CRUCIAL para que los cambios en los custom claims se reflejen en el cliente
    const forceIdTokenRefresh = useCallback(async () => {
        if (auth.currentUser) {
            try {
                // 'true' fuerza el refresco del token, obteniendo los últimos claims desde Firebase
                const idTokenResult = await auth.currentUser.getIdTokenResult(true);
                setUserClaims(idTokenResult.claims);
                console.log('AuthContext: ID Token forzado a refrescarse. Claims actualizados:', idTokenResult.claims);
                return idTokenResult.claims; // Retorna los claims actualizados si es necesario
            } catch (error) {
                console.error("AuthContext: Error forzando refresco de ID Token:", error);
                // Opcional: Si el refresco falla, podrías considerar desloguear al usuario
                // logout();
                return null;
            }
        }
        return null;
    }, []);

    // Función para cerrar sesión, también limpia el estado del contexto
    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserClaims({}); // Limpia los claims al cerrar sesión
            console.log("AuthContext: Sesión cerrada.");
        } catch (error) {
            console.error("AuthContext: Error al cerrar sesión:", error);
            // Podrías mostrar un Alert aquí si lo deseas
        }
    }, []);


    useEffect(() => {
        // onAuthStateChanged se dispara al iniciar sesión, cerrar sesión, o al cargar la app
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // Si hay un usuario, obtenemos su token y claims
                try {
                    // NO usamos `true` aquí, ya que onAuthStateChanged ya nos da el token más reciente
                    // o dispara una nueva actualización si el token ya está refrescado.
                    // El `forceIdTokenRefresh` es para forzar esto en momentos específicos.
                    const idTokenResult = await firebaseUser.getIdTokenResult();
                    setUserClaims(idTokenResult.claims);
                    setUser(firebaseUser); // Guarda el objeto de usuario de Firebase
                    console.log("AuthContext: onAuthStateChanged - Usuario cargado. Claims:", idTokenResult.claims);
                } catch (error) {
                    console.error("AuthContext: Error al obtener ID Token y Claims en onAuthStateChanged:", error);
                    setUser(null); // En caso de error, el usuario no está completamente autenticado
                    setUserClaims({});
                }
            } else {
                // Si no hay usuario, limpiamos todo
                setUser(null);
                setUserClaims({});
                console.log("AuthContext: onAuthStateChanged - No hay usuario.");
            }
            setLoading(false); // La carga inicial ha terminado
        });

        // Limpia la suscripción cuando el componente se desmonte
        return unsubscribe;
    }, []);

    // Proporciona el usuario, los claims, el estado de carga y las funciones de acción a los componentes hijos
    const contextValue = {
        user,
        userClaims,
        loading,
        logout, // ¡Ahora exportamos logout!
        forceIdTokenRefresh, // ¡Ahora exportamos forceIdTokenRefresh!
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};