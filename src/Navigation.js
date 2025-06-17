// src/Navigation.js
import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback, useContext } from 'react'; // <-- AÑADE useContext
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, ActivityIndicator, View, StyleSheet, Text, SafeAreaView } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Asegúrate de que esta es la ÚNICA línea para importar appMoscasSAG
import appMoscasSAG from '../credenciales';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Mantén esta importación

// Importa tu AuthContext
import { AuthContext } from './context/AuthContext'; // <-- Importa tu AuthContext

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
// --- NUEVOS COMPONENTES DE PANTALLA ---
import UserProfileScreen from './screens/UserProfileScreen'; // ¡AÑADE ESTO!
import AdminUserManagementScreen from './screens/AdminUserManagementScreen'; // ¡AÑADE ESTO!
// --- FIN NUEVOS COMPONENTES ---

const Stack = createStackNavigator();
const auth = getAuth(appMoscasSAG); // Aún necesitas la instancia de auth aquí para onAuthStateChanged

SplashScreen.preventAutoHideAsync();

export default function Navigation() {
  // Ya no necesitas los estados 'user' y 'initializing' aquí,
  // porque los obtendrás del AuthContext
  const { user, userClaims, loading } = useContext(AuthContext); // <-- Obtén user, userClaims y loading del contexto

  // Carga las fuentes
  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });

  // El useEffect de onAuthStateChanged AHORA ESTÁ EN TU AuthContext.js
  // Puedes eliminar el `useEffect` y los estados `initializing` y `user` de este componente.
  // Tu `AuthContext.js` ya maneja toda la lógica de suscripción al estado de autenticación
  // y de obtención de claims.

  // Callback para ocultar la splash screen una vez que el contenido esté montado
  const onLayoutRootView = useCallback(async () => {
    // Si las fuentes están cargadas Y el AuthContext ha terminado de cargar el usuario inicial
    if (fontsLoaded && !loading) { // <-- Usa 'loading' del contexto
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]); // <-- Dependencia de 'loading' del contexto

  // Si la app no está completamente lista (fuentes no cargadas o auth en proceso), muestra un indicador de carga
  if (!fontsLoaded || loading) { // <-- Usa 'loading' del contexto
    return (
      <View style={styles.loadingContainer} onLayout={onLayoutRootView}> {/* onLayout aquí para ocultar splash */}
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Cargando aplicación...</Text>
      </View>
    );
  }

  // Si la app está lista, renderiza la navegación principal
  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
            headerTintColor: "white",
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: "rgba(138, 154, 91, 0.81)" },
            headerTitleStyle: {
              fontFamily: 'Montserrat-Bold',
              fontSize: 18,
            },
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
                  headerShown: false
                }}
              />
              <Stack.Screen name="NuevaFicha" component={NuevaFicha} options={{ title: "NUEVA FICHA" }} />
              <Stack.Screen name="ListaFichas" component={ListaFichas} options={{ title: "LISTADO DE FICHAS" }} />
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

              {/* --- NUEVAS RUTAS BASADAS EN ROLES --- */}
              <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "MI PERFIL" }} />

              {/* RUTA PROTEGIDA PARA ADMINISTRADORES */}
              {userClaims?.admin && ( // <-- Muestra esta pantalla SOLO si userClaims.admin es true
                <Stack.Screen name="AdminManagement" component={AdminUserManagementScreen} options={{ title: "GESTIÓN DE USUARIOS" }} />
              )}
              {/* --- FIN NUEVAS RUTAS --- */}
            </>
          ) : ( // Si no hay usuario (deslogeado), muestra la pantalla de Login
            <Stack.Screen
              name="Login"
              component={Login}
              options={{
                title: "MONITOREO DE TRAMPAS",
                headerRight: () => null,
                headerShown: false,
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
  loadingText: {
    marginTop: 10,
    color: '#555',
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
  },
  safeArea: {
    flex: 1,
  },
});