// src/Navigation.js
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// ¡ASEGÚRATE DE QUE ESTA ES LA ÚNICA LÍNEA PARA IMPORTAR appMoscasSAG!
import appMoscasSAG from '../credenciales'; // <--- RUTA AHORA ES CORRECTA: dos niveles arriba
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Importaciones de Pantallas
import Login from './screens/Login';
import Home from './screens/Home';
import NuevaFicha from './screens/NuevaFicha';
import ListaFichas from './screens/ListaFichas';
import DetalleFicha from './screens/DetalleFicha';
import MapScreenNative from './screens/MapScreen';
import MapScreenWeb from './screens/MapScreen.web';
import EditarFicha from './screens/EditarFicha';
import PapeleraScreen from './screens/PapeleraScreen';

const Stack = createStackNavigator();
const auth = getAuth(appMoscasSAG); // Obtiene la instancia de autenticación

export default function Navigation() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Navigation: onAuthStateChanged - Estado de autenticación cambiado.");
      console.log("Navigation: firebaseUser recibido:", firebaseUser ? firebaseUser.email : "null");
      setUser(firebaseUser); // Actualiza el estado del usuario para forzar la re-renderización
      if (initializing) {
        setInitializing(false);
      }
    });
    return subscriber; // Se desuscribe del listener cuando el componente se desmonta
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez al montar

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10, color: '#555' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTintColor: "white",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#2E7D32" },
          presentation: 'modal',
        }}
      >
        {user ? ( // Si hay un usuario (logeado), muestra las pantallas de la app
          <>
            <Stack.Screen
              name="Home"
              component={Home}
              options={{
                title: "HOME",
                headerRight: () => null, // Oculta el botón de logout por defecto en la cabecera
              }}
            />
            <Stack.Screen name="NuevaFicha" component={NuevaFicha} options={{ title: "NUEVA FICHA" }} />
            <Stack.Screen name="ListaFichas" component={ListaFichas} options={{ title: "LISTADO DE FICHAS" }} />
            <Stack.Screen name="DetalleFicha" component={DetalleFicha} options={{ title: "DETALLE DE FICHA" }} />
            <Stack.Screen
              name="MapScreen"
              component={Platform.OS === 'web' ? MapScreenWeb : MapScreenNative}
              options={{ title: 'MAPA DE TRAMPAS' }}
            />
            <Stack.Screen name="EditarFicha" component={EditarFicha} options={{ title: "EDITAR FICHA" }} />
            <Stack.Screen name="Papelera" component={PapeleraScreen} options={{ title: "PAPELERA" }} />
            {/* Puedes añadir más pantallas aquí si son parte de la app principal */}
          </>
        ) : ( // Si no hay usuario (deslogeado), muestra la pantalla de Login
          <Stack.Screen
            name="Login"
            component={Login}
            options={{
              title: "MONITOREO DE TRAMPAS",
              headerRight: () => null, // Oculta cualquier botón en la cabecera del login
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});