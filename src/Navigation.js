import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, ActivityIndicator, View, StyleSheet, Text, SafeAreaView } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import appMoscasSAG from '../credenciales';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import { AuthContext } from './context/AuthContext';

import Login from './screens/Login';
import Home from './screens/Home';
import NuevaFicha from './screens/NuevaFicha';
import ListaFichas from './screens/ListaFichas';
import DetalleFicha from './screens/DetalleFicha';
import MapScreenNative from './screens/MapScreen';
import MapScreenWeb from './screens/MapScreen.web';
import EditarFicha from './screens/EditarFicha';
import PapeleraScreen from './screens/PapeleraScreen';
import GestionUsuarios from './screens/GestionUsuarios';

const Stack = createStackNavigator();
const auth = getAuth(appMoscasSAG);

SplashScreen.preventAutoHideAsync();

export default function Navigation() {
    const { user, userClaims, loading } = useContext(AuthContext);

    const [fontsLoaded] = useFonts({
        'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
        'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    });

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded && !loading) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded, loading]);

    if (!fontsLoaded || loading) {
        return (
            <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <Text style={styles.loadingText}>Cargando aplicación...</Text>
            </View>
        );
    }

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

                            {userClaims?.admin && (
                                <Stack.Screen
                                    name="GestionUsuarios"
                                    component={GestionUsuarios}
                                    options={{ title: "GESTIÓN DE USUARIOS" }}
                                />
                            )}
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