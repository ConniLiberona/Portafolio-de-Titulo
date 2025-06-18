import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import appMoscasSAG from '../../credenciales';

const auth = getAuth(appMoscasSAG);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userClaims, setUserClaims] = useState({});

    const forceIdTokenRefresh = useCallback(async () => {
        if (auth.currentUser) {
            try {
                const idTokenResult = await auth.currentUser.getIdTokenResult(true);
                setUserClaims(idTokenResult.claims);
                console.log('AuthContext: ID Token forzado a refrescarse. Claims actualizados:', idTokenResult.claims);
                return idTokenResult.claims;
            } catch (error) {
                console.error("AuthContext: Error forzando refresco de ID Token:", error);
                return null;
            }
        }
        return null;
    }, []);

    const logout = useCallback(async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserClaims({});
            console.log("AuthContext: Sesión cerrada.");
        } catch (error) {
            console.error("AuthContext: Error al cerrar sesión:", error);
        }
    }, []);


    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const idTokenResult = await firebaseUser.getIdTokenResult();
                    setUserClaims(idTokenResult.claims);
                    setUser(firebaseUser);
                    console.log("AuthContext: onAuthStateChanged - Usuario cargado. Claims:", idTokenResult.claims);
                } catch (error) {
                    console.error("AuthContext: Error al obtener ID Token y Claims en onAuthStateChanged:", error);
                    setUser(null);
                    setUserClaims({});
                }
            } else {
                setUser(null);
                setUserClaims({});
                console.log("AuthContext: onAuthStateChanged - No hay usuario.");
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const contextValue = {
        user,
        userClaims,
        loading,
        logout,
        forceIdTokenRefresh,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};