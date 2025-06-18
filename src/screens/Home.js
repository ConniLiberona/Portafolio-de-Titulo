import React, { useState, useEffect, useRef, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Image, ImageBackground, Animated, Easing, Alert, TextInput, Button } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import appMoscasSAG from '../../credenciales';

import { AuthContext } from '../context/AuthContext';

const auth = getAuth(appMoscasSAG);
const db = getFirestore(appMoscasSAG);
const functionsInstance = getFunctions(appMoscasSAG);

const APP_HORIZONTAL_PADDING = 24;

const DAYS_ACTIVE = 14;
const DAYS_NEAR_EXPIRY = 28;

const determinarEstadoTrampaPorLogicaDeFechas = (fecha_instalacion, plaga_detectada = false, retirada = false) => {
  if (retirada) {
    return "Inactiva/Retirada";
  }

  let instalacion = fecha_instalacion;
  if (instalacion && typeof instalacion.toDate === 'function') {
    instalacion = instalacion.toDate();
  }

  if (!(instalacion instanceof Date) || isNaN(instalacion.getTime())) {
    console.warn("determinarEstadoTrampaPorLogicaDeFechas: fecha_instalacion no es una fecha válida. Retornando 'Fecha Inválida'.", fecha_instalacion);
    return "Fecha Inválida";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  instalacion.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(hoy.getTime() - instalacion.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < DAYS_ACTIVE) {
    return "Activa";
  } else if (diffDays >= DAYS_ACTIVE && diffDays < DAYS_NEAR_EXPIRY) {
    return "Próxima a vencer";
  } else {
    return "Vencida";
  }
};


export default function Home({ navigation }) {
  const isFocused = useIsFocused();

  const { user, userClaims, loading, logout, forceIdTokenRefresh } = useContext(AuthContext);

  useEffect(() => {
    console.log("Home.js: Estado de autenticación y claims:");
    console.log("    user:", user ? user.email : "null");
    console.log("    userClaims:", userClaims);
    console.log("    loading:", loading);
    console.log("    isAdmin (from claims):", userClaims?.admin);
    console.log("    isCommonUser (from claims):", userClaims?.commonUser);

    if (!loading && !user) {
      console.warn("Home.js: No hay usuario autenticado después de cargar.");
    }
    if (!loading && user && !userClaims) {
      console.warn("Home.js: Usuario autenticado pero claims no cargados/disponibles.");
    }
  }, [user, userClaims, loading]);

  const [emailToMakeAdmin, setEmailToMakeAdmin] = useState('');
  const [settingInitialAdmin, setSettingInitialAdmin] = useState(false);

  const [trapCounts, setTrapCounts] = useState({
    'Activa': 0,
    'Próxima a vencer': 0,
    'Vencida': 0,
    'Inactiva/Retirada': 0,
    'Total': 0,
    'Estado Desconocido': 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [lastUpdateDate, setLastUpdateDate] = useState('N/A');

  const animatedOpacityActive = useRef(new Animated.Value(1)).current;
  const animatedOpacityNearExpiry = useRef(new Animated.Value(1)).current;
  const animatedOpacityExpired = useRef(new Animated.Value(1)).current;

  const animatedOpacities = {
    'Activa': animatedOpacityActive,
    'Próxima a vencer': animatedOpacityNearExpiry,
    'Vencida': animatedOpacityExpired,
  };

  const startBlinkingAnimation = (animatedValue) => {
    animatedValue.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.2,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopBlinkingAnimation = (animatedValue) => {
    animatedValue.stopAnimation();
    animatedValue.setValue(1);
  };

  useEffect(() => {
    const statesToBlink = ['Próxima a vencer', 'Vencida'];

    Object.keys(animatedOpacities).forEach(estado => {
      const animatedValue = animatedOpacities[estado];
      if (statesToBlink.includes(estado) && trapCounts[estado] > 0) {
        startBlinkingAnimation(animatedValue);
      } else {
        stopBlinkingAnimation(animatedValue);
      }
    });

    return () => {
      Object.keys(animatedOpacities).forEach(estado => {
        const animatedValue = animatedOpacities[estado];
        stopBlinkingAnimation(animatedValue);
      });
    };
  }, [trapCounts, isFocused]);


  const fetchTrapCounts = async () => {
    setLoadingCounts(true);
    const counts = {
      'Activa': 0,
      'Próxima a vencer': 0,
      'Vencida': 0,
      'Inactiva/Retirada': 0,
      'Total': 0,
      'Estado Desconocido': 0,
    };
    let latestTimestamp = null;

    try {
      const q = query(collection(db, 'pins'));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const estadoGuardadoEnFirestore = data.estado;

        if (typeof estadoGuardadoEnFirestore === 'string' && counts.hasOwnProperty(estadoGuardadoEnFirestore)) {
          counts[estadoGuardadoEnFirestore]++;
        } else if (typeof estadoGuardadoEnFirestore === 'string') {
          console.warn(`Estado no reconocido '${estadoGuardadoEnFirestore}' para el documento '${doc.id}'. Se cuenta en 'Estado Desconocido'.`);
          counts['Estado Desconocido']++;
        } else {
          console.warn(`Documento '${doc.id}' no tiene un campo 'estado' válido. Se cuenta en 'Estado Desconocido'.`);
          counts['Estado Desconocido']++;
        }

        counts.Total++;

        let currentDocTimestamp = null;
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          currentDocTimestamp = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          currentDocTimestamp = data.timestamp;
        }

        if (currentDocTimestamp instanceof Date && !isNaN(currentDocTimestamp.getTime()) &&
          (!latestTimestamp || currentDocTimestamp > latestTimestamp)) {
          latestTimestamp = currentDocTimestamp;
        }
      });

      setTrapCounts(counts);
      if (latestTimestamp) {
        const options = {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        setLastUpdateDate(latestTimestamp.toLocaleDateString('es-CL', options));
      } else {
        setLastUpdateDate('N/A');
      }
    } catch (error) {
      console.error("Error al cargar los conteos de trampas: ", error);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchTrapCounts();
    }
  }, [isFocused]);

  const handleLogout = async () => {
    console.log("¡Botón 'Cerrar Sesión' PRESIONADO! (Inicio de handleLogout)");
    logout();
  };

  const callAddInitialAdmin = async () => {
    if (!emailToMakeAdmin) {
      Alert.alert('Error', 'Por favor, introduce el email del usuario a hacer admin.');
      return;
    }

    setSettingInitialAdmin(true);
    try {
      const addInitialAdminFunction = httpsCallable(functionsInstance, 'addInitialAdmin');
      const result = await addInitialAdminFunction({ email: emailToMakeAdmin });
      Alert.alert('Éxito', result.data.message + '\nPor favor, cierra sesión y vuelve a iniciar para que el rol se actualice.');
      setEmailToMakeAdmin('');

      if (user && user.email === emailToMakeAdmin) {
        await forceIdTokenRefresh();
        console.log("Token refrescado después de establecerse como admin.");
      }
    } catch (error) {
      console.error("Error al llamar addInitialAdmin:", error);
      Alert.alert('Error', error.message || 'No se pudo establecer el administrador inicial.');
    } finally {
      setSettingInitialAdmin(false);
    }
  };

  const StatusRow = ({ estado, count, animatedOpacity }) => (
    <View style={styles.statusItem}>
      <Animated.View
        style={[
          styles.colorIndicator,
          { backgroundColor: getEstadoColor(estado) },
          animatedOpacity ? { opacity: animatedOpacity } : null
        ]}
      />
      <Text style={styles.cardText}>{estado}: <Text style={styles.highlightText}>{count}</Text></Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando información del usuario y roles...</Text>
      </View>
    );
  }

  const isAdmin = userClaims?.admin;
  const isCommonUser = userClaims?.commonUser;

  const showInitialAdminSetup = !isAdmin && !isCommonUser;

  return (
    <ImageBackground
      source={require('../../assets/fondo.jpg')}
      style={styles.fullScreenBackground}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.vignetteOverlay}
      />

      <LinearGradient
        colors={['rgba(240, 242, 245, 0.7)', 'rgba(255, 255, 255, 0.7)', 'rgba(240, 242, 245, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.contentGradientOverlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContentWrapper}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/LogoSAG.jpg')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.serviceText}>SERVICIO AGRICOLA Y GANADERO</Text>

            <View style={styles.welcomeInfoContainer}>
              <Text style={styles.roleText}>
                Rol: {isAdmin ? 'Administrador' : isCommonUser ? 'Usuario Común' : 'Sin Rol Asignado'}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Resumen Operacional</Text>
              {loadingCounts ? (
                <Text style={styles.cardText}>Cargando datos...</Text>
              ) : (
                <>
                  <Text style={styles.cardText}>Total de Trampas: <Text style={styles.highlightText}>{trapCounts.Total}</Text></Text>

                  <StatusRow estado="Activa" count={trapCounts.Activa} animatedOpacity={animatedOpacities['Activa']} />
                  <StatusRow estado="Próxima a vencer" count={trapCounts['Próxima a vencer']} animatedOpacity={animatedOpacities['Próxima a vencer']} />
                  <StatusRow estado="Vencida" count={trapCounts.Vencida} animatedOpacity={animatedOpacities['Vencida']} />
                  {trapCounts['Inactiva/Retirada'] > 0 && (
                    <StatusRow estado="Inactiva/Retirada" count={trapCounts['Inactiva/Retirada']} />
                  )}
                  {trapCounts['Estado Desconocido'] > 0 && (
                    <StatusRow estado="Estado Desconocido" count={trapCounts['Estado Desconocido']} />
                  )}

                  <Text style={styles.cardText}>Última actualización: <Text style={styles.highlightText}>{lastUpdateDate}</Text></Text>
                </>
              )}
            </View>

            <View style={styles.navigationGrid}>
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('MapScreen')}>
                  <Text style={styles.buttonIcon}>🗺️</Text>
                  <Text style={styles.gridButtonText}>Mapa de Trampas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('NuevaFicha')}>
                  <Text style={styles.buttonIcon}>📝</Text>
                  <Text style={styles.gridButtonText}>Nueva Ficha</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('ListaFichas')}>
                  <Text style={styles.buttonIcon}>📄</Text>
                  <Text style={styles.gridButtonText}>Listado de Fichas</Text>
                </TouchableOpacity>

                {isAdmin && (
                  <>
                    <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('GestionUsuarios')}>
                      <Text style={styles.buttonIcon}>👥</Text>
                      <Text style={styles.gridButtonText}>Gestión de Usuarios</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Papelera')}>
                      <Text style={styles.buttonIcon}>🗑️</Text>
                      <Text style={styles.gridButtonText}>Papelera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Configuracion')}>
                      <Text style={styles.buttonIcon}>⚙️</Text>
                      <Text style={styles.gridButtonText}>Configuración</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>


            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
            </TouchableOpacity>

            {showInitialAdminSetup && (
              <View style={styles.tempAdminContainer}>
                <Text style={styles.tempAdminTitle}>CONFIGURACIÓN INICIAL DE ADMIN (TEMPORAL)</Text>
                <TextInput
                  style={styles.tempAdminInput}
                  placeholder="Email del primer Admin"
                  value={emailToMakeAdmin}
                  onChangeText={setEmailToMakeAdmin}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Button
                  title={settingInitialAdmin ? "Estableciendo..." : "Establecer Primer Admin"}
                  onPress={callAddInitialAdmin}
                  disabled={settingInitialAdmin}
                  color="orange"
                />
                <Text style={styles.tempAdminWarning}>
                  ¡ADVERTENCIA: Elimina esta función y esta UI después de usarla!
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  vignetteOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  contentGradientOverlay: {
    flex: 1,
    zIndex: 2,
  },
  scrollViewContentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  mainContentWrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: APP_HORIZONTAL_PADDING,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 0,
  },
  logoImage: {
    width: 150,
    height: 75,
    resizeMode: 'contain',
  },
  serviceText: {
    fontSize: 13,
    color: '#34495E',
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  welcomeInfoContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#34495E',
  },
  roleText: {
    fontSize: 18,
    marginBottom: 0,
    color: '#666',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    width: '100%',
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34495E',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#34495E',
  },
  navigationGrid: {
    width: '100%',
    marginBottom: 5,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  gridButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 15,
    width: '45%',
    marginHorizontal: '2.5%',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    minHeight: 90,
  },
  buttonIcon: {
    fontSize: 26,
    marginBottom: 5,
  },
  gridButtonText: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginTop: 10,
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logoutButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  colorIndicator: {
    width: 15,
    height: 15,
    borderRadius: 3,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tempAdminContainer: {
    marginTop: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: 'red',
    borderRadius: 10,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    backgroundColor: '#ffe0e0',
    shadowColor: 'rgba(255, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  tempAdminTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  tempAdminInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    width: '100%',
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  tempAdminWarning: {
    marginTop: 10,
    fontSize: 12,
    color: 'darkred',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    fontSize: 18,
    color: '#34495E',
    fontWeight: '600',
  }
});

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Activa': return '#4CAF50';
    case 'Próxima a vencer': return '#FFC107';
    case 'Vencida': return '#F44336';
    case 'Inactiva/Retirada': return '#9E9E9E';
    case 'Requiere revisión': return '#2196F3';
    case 'Estado Desconocido': return '#78909C';
    default: return '#000';
  }
};