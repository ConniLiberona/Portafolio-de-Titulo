import React, { createContext, useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth'; // Usamos getAuth para acceder a la instancia de auth
import appMoscasSAG from '../../credenciales'; // Asume que tus credenciales están ahí

const auth = getAuth(appMoscasSAG); // Obtiene la instancia de autenticación

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Estado para saber si Firebase ya cargó el usuario inicial
  const [userClaims, setUserClaims] = useState({}); // Nuevo estado para los Custom Claims

  useEffect(() => {
    // onAuthStateChanged se dispara al iniciar sesión, cerrar sesión, o al cargar la app
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Si hay un usuario, obtenemos su token y claims
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true); // 'true' fuerza la recarga
          setUserClaims(idTokenResult.claims);
          setUser(firebaseUser); // Guarda el objeto de usuario de Firebase
        } catch (error) {
          console.error("Error al obtener ID Token y Claims:", error);
          setUser(null); // En caso de error, el usuario no está completamente autenticado
          setUserClaims({});
        }
      } else {
        // Si no hay usuario, limpiamos todo
        setUser(null);
        setUserClaims({});
      }
      setLoading(false); // La carga inicial ha terminado
    });

    // Limpia la suscripción cuando el componente se desmonte
    return unsubscribe;
  }, []);

  // Proporciona el usuario, los claims y el estado de carga a los componentes hijos
  const contextValue = {
    user,
    userClaims,
    loading,
    // Podrías añadir funciones para actualizar claims si fuera necesario, aunque onAuthStateChanged suele bastar
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};