// src/screens/Home.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Image, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { getAuth, signOut } from 'firebase/auth';
import appMoscasSAG from '../../credenciales'; // Asegúrate de que la ruta a tus credenciales sea correcta

const auth = getAuth(appMoscasSAG);

// Definimos un padding horizontal común para toda la app
const APP_HORIZONTAL_PADDING = 24;

export default function Home() {
  const navigation = useNavigation();

  const handleLogout = async () => {
    console.log("¡Botón 'Cerrar Sesión' PRESIONADO! (Inicio de handleLogout)");
    console.log("handleLogout: Intentando signOut DIRECTAMENTE (sin alerta de confirmación)...");
    try {
      if (!auth) {
        console.error("handleLogout: La instancia de autenticación (auth) no está definida.");
        alert("Error: No se pudo inicializar la autenticación. Por favor, reinicia la app.");
        return;
      }
      await signOut(auth);
      console.log("handleLogout: Llamada a signOut() completada.");
    } catch (error) {
      console.error("handleLogout: Error al cerrar sesión:", error.code, error.message);
      alert(`Error: No se pudo cerrar la sesión: ${error.message}.`);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/fondo.jpg')} // <--- RUTA DE TU IMAGEN DE FONDO
      style={styles.fullScreenBackground}
      resizeMode="cover"
    >
      {/* Capa de viñeta: un gradiente oscuro en los bordes para dar profundidad */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.vignetteOverlay}
      />

      {/* Capa principal del gradiente de fondo, con transparencia para ver la imagen y la viñeta */}
      <LinearGradient
        colors={['rgba(240, 242, 245, 0.7)', 'rgba(255, 255, 255, 0.7)', 'rgba(240, 242, 245, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.contentGradientOverlay}
      >
        {/* ScrollView para asegurar que el contenido es desplazable */}
        <ScrollView
          contentContainerStyle={styles.scrollViewContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Wrapper principal para todo el contenido dentro del ScrollView */}
          <View style={styles.mainContentWrapper}>
            {/* Contenedor para el Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/LogoSAG.jpg')} // Asegúrate que la ruta y extensión sean correctas
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Texto "SERVICIO AGRICOLA Y GANADERO" */}
            <Text style={styles.serviceText}>SERVICIO AGRICOLA Y GANADERO</Text>

            {/* Sección de Resumen/Estadísticas Rápidas */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Resumen Operacional</Text>
              <Text style={styles.cardText}>Trampas activas: <Text style={styles.highlightText}>120</Text></Text>
              <Text style={styles.cardText}>Fichas pendientes: <Text style={styles.highlightText}>5</Text></Text>
              <Text style={styles.cardText}>Última actualización: <Text style={styles.highlightText}>14/06/2025</Text></Text>
            </View>

            {/* Módulo de Navegación de Botones en Cuadrícula */}
            <View style={styles.navigationGrid}>
              {/* Fila 1 de botones */}
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('MapScreen')}>
                  <Text style={styles.buttonIcon}>🗺️</Text>
                  <Text style={styles.gridButtonText}>Mapa de Trampas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('NuevaFicha')}>
                  <Text style={styles.buttonIcon}>📝</Text>
                  <Text style={styles.gridButtonText}>Nueva Ficha</Text>
                </TouchableOpacity>
              </View>

              {/* Fila 2 de botones */}
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('ListaFichas')}>
                  <Text style={styles.buttonIcon}>📄</Text>
                  <Text style={styles.gridButtonText}>Listado de Fichas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('GestionUsuarios')}>
                  <Text style={styles.buttonIcon}>👥</Text>
                  <Text style={styles.gridButtonText}>Gestión de Usuarios</Text>
                </TouchableOpacity>
              </View>

              {/* Fila 3 de botones */}
              <View style={styles.gridRow}>
                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Papelera')}>
                  <Text style={styles.buttonIcon}>🗑️</Text>
                  <Text style={styles.gridButtonText}>Papelera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Configuracion')}>
                  <Text style={styles.buttonIcon}>⚙️</Text>
                  <Text style={styles.gridButtonText}>Configuración</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón de Cerrar Sesión */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
            </TouchableOpacity>
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
    paddingVertical: 10, // Más reducido para compactar aún más el contenido
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
    marginTop: 20, // Reducido aún más para subir el logo
    marginBottom: 0, // Eliminado o muy reducido para acercar el logo al texto
  },
  logoImage: {
    width: 150,
    height: 75,
    resizeMode: 'contain',
  },
  serviceText: {
    fontSize: 13, // Ligeramente más pequeño para una línea más compacta
    fontFamily: 'Montserrat-Regular', // Usando Regular, que es más "plana" que Bold
    // Si tienes 'Montserrat-Light', puedes usarlo aquí: 'Montserrat-Light',
    color: '#34495E',
    marginTop: 5, // Un poco de espacio entre el logo y este texto
    marginBottom: 15, // Reducido para acercar el texto a la tarjeta de resumen
    textAlign: 'center',
    letterSpacing: 0.8, // Ligeramente menos espaciado para compactar
    opacity: 0.8,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15, // Reducido
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
    color: '#8A9A5B',
  },
  navigationGrid: {
    width: '100%',
    marginBottom: 15, // Reducido
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 18, // Ligeramente más pequeño
    paddingHorizontal: 15,
    flex: 1,
    flexShrink: 1,
    minWidth: '45%',
    marginHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    minHeight: 90, // Altura mínima de botón reducida
  },
  buttonIcon: {
    fontSize: 26, // Icono un poco más pequeño
    marginBottom: 5,
  },
  gridButtonText: {
    color: '#2C3E50',
    fontSize: 13, // Texto del botón un poco más pequeño
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8A9A5B',
    paddingVertical: 10, // Reducido
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15, // Reducido
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    shadowColor: 'rgba(138, 154, 91, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#8A9A5B',
    fontSize: 14, // Texto del botón de logout más pequeño
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});