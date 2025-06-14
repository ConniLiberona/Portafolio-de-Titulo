// src/screens/Home.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native'; // <--- Quitamos Alert
import { useNavigation } from '@react-navigation/native';

import { getAuth, signOut } from 'firebase/auth';
import appMoscasSAG from '../../credenciales'; // ¡Ruta confirmada!

const auth = getAuth(appMoscasSAG);

export default function Home() {
  const navigation = useNavigation();

  const handleLogout = async () => {
    console.log("¡Botón 'Cerrar Sesión' PRESIONADO! (Inicio de handleLogout)");

    // *** CAMBIO CLAVE: Llama directamente a la lógica de cierre de sesión ***
    // Ya no usamos Alert.alert para depurar el problema de la alerta en web.
    console.log("handleLogout: Intentando signOut DIRECTAMENTE (sin alerta de confirmación)...");
    try {
      if (!auth) {
        console.error("handleLogout: La instancia de autenticación (auth) no está definida.");
        // Podrías poner un alert nativo de navegador aquí para web si quieres
        alert("Error: No se pudo inicializar la autenticación. Por favor, reinicia la app.");
        return;
      }

      const currentUserBeforeLogout = auth.currentUser;
      console.log("handleLogout: Usuario actual ANTES de signOut:", currentUserBeforeLogout ? currentUserBeforeLogout.email : "Ninguno");

      await signOut(auth); // Ejecuta el cierre de sesión de Firebase
      console.log("handleLogout: Llamada a signOut() completada.");

      const currentUserAfterLogout = auth.currentUser;
      console.log("handleLogout: Usuario actual DESPUÉS de signOut:", currentUserAfterLogout ? currentUserAfterLogout.email : "Ninguno (se espera)");

    } catch (error) {
      console.error("handleLogout: Error al cerrar sesión:", error.code, error.message);
      // Podrías poner un alert nativo de navegador aquí para web si quieres
      alert(`Error: No se pudo cerrar la sesión: ${error.message}.`);
    }
    // *** FIN CAMBIO CLAVE ***
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Menú Principal</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MapScreen')}>
        <Text style={styles.buttonText}>🗺️ Mapa - Visualizar Trampas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NuevaFicha')}>
        <Text style={styles.buttonText}>📝 Agregar Nueva Ficha</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ListaFichas')}>
        <Text style={styles.buttonText}>📄 Listado de Fichas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('GestionUsuarios')}>
        <Text style={styles.buttonText}>👥 Gestión de Usuarios</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Papelera')}>
        <Text style={styles.buttonText}>🗑️ Papelera</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Configuracion')}>
        <Text style={styles.buttonText}>⚙️ Configuración</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={styles.buttonText}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2E7D32', // Verde SAG
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginVertical: 10,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#6c757d', // Gris para diferenciarlo
    marginTop: 30,
  },
});