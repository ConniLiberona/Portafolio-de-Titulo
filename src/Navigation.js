// src/Navigation.js
import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, ActivityIndicator, View, StyleSheet, Text, SafeAreaView } from 'react-native';
import * as SplashScreen from 'expo-splash-screen'; // Solo necesitamos SplashScreen

// Asegúrate de que esta es la ÚNICA línea para importar appMoscasSAG
import appMoscasSAG from '../credenciales';
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
const auth = getAuth(appMoscasSAG);

// Mantenemos la splash screen visible hasta que indiquemos lo contrario
SplashScreen.preventAutoHideAsync();

export default function Navigation() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [appReady, setAppReady] = useState(false); // Estado para indicar que la app está lista

  // Hook para manejar el estado de la aplicación y autenticación
  useEffect(() => {
    async function prepareApp() {
      try {
        // No hay fuentes personalizadas que cargar aquí, solo la lógica de autenticación
        // Puedes añadir otras cargas de recursos aquí si es necesario
      } catch (e) {
        console.warn("Error al preparar la app:", e);
      } finally {
        // Marcamos la app como lista una vez que la preparación inicial ha terminado
        setAppReady(true);
      }
    }

    prepareApp(); // Ejecuta la preparación inicial de la app

    // Listener para el estado de autenticación de Firebase
    const subscriber = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Navigation: onAuthStateChanged - Estado de autenticación cambiado.");
      console.log("Navigation: firebaseUser recibido:", firebaseUser ? firebaseUser.email : "null");
      setUser(firebaseUser);
      if (initializing) {
        setInitializing(false); // Una vez que sabemos el estado inicial de autenticación
      }
    });

    return () => subscriber(); // Limpia el listener al desmontar el componente
  }, [initializing]); // La dependencia `initializing` asegura que el efecto se ejecuta al cambiar este estado.

  // Callback para ocultar la splash screen una vez que el contenido esté montado
  const onLayoutRootView = useCallback(async () => {
    // Si la app está lista Y la inicialización de Firebase ha terminado
    if (appReady && !initializing) {
      await SplashScreen.hideAsync(); // Oculta la splash screen
    }
  }, [appReady, initializing]); // Dependencias para que se ejecute cuando estos estados cambien

  // Si la app no está completamente lista (auth en proceso), muestra un indicador de carga
  if (!appReady || initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10, color: '#555' }}>Cargando aplicación...</Text>
      </View>
    );
  }

  // Si la app está lista, renderiza la navegación principal
  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}> {/* onLayout para ocultar la splash screen */}
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
            headerTintColor: "white",
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "rgba(138, 154, 91, 0.81)" },
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
                  headerRight: () => null,
                  headerShown: false // Oculta la cabecera por defecto en Home
                }}
              />
              <Stack.Screen name="NuevaFicha" component={NuevaFicha} options={{ title: "NUEVA FICHA" }} />
              <Stack.Screen name="ListaFichas" component={ListaFichas} options={{ title: "LISTADO DE FICHAS"}} />
              <Stack.Screen name="DetalleFicha" component={DetalleFicha} options={{ title: "DETALLE DE FICHA" }} />
              <Stack.Screen
                name="MapScreen"
                component={Platform.OS === 'web' ? MapScreenWeb : MapScreenNative}
                options={{
                  title: 'MAPA DE TRAMPAS'
                }}
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
                headerRight: () => null,
                headerShown: false, // Oculta cualquier botón en la cabecera del login
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 154, 91, 0.4)',
  },
  safeArea: {
    flex: 1, // ¡Crucial! Asegura que la aplicación ocupe toda la altura disponible
  },
});