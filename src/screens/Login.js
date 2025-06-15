// src/screens/Login.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';

// Importaciones de Firebase
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import appMoscasSAG from '../../credenciales'; // Ajusta la ruta si es necesario

// Obtiene la instancia de autenticación de Firebase
const auth = getAuth(appMoscasSAG);

// Obtener las dimensiones de la pantalla para ajustar el tamaño del logo y márgenes
const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos Vacíos", "Por favor, ingresa tu correo y contraseña.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario ha iniciado sesión');
      // La navegación se maneja automáticamente por Navigation.js (onAuthStateChanged)
    } catch (error) {
      console.error("Error al iniciar sesión:", error.code, error.message);
      let errorMessage = "Error al iniciar sesión. Por favor, verifica tus credenciales.";
      if (error.code === 'auth/invalid-email') {
        errorMessage = "El formato del correo electrónico es inválido.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "El usuario ha sido deshabilitado.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Correo electrónico o contraseña incorrectos.";
      }
      Alert.alert("Error de Inicio de Sesión", errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      {/* Aquí colocamos la imagen del SAG */}
      <Image
        source={require('../../assets/SAG.png')} // Ruta de tu imagen SAG.png
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#939393"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#939393"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Ingresar</Text>
      </TouchableOpacity>

      {/* Aquí podrías añadir un botón de "Registrarse" o "Olvidé mi contraseña" si los tienes */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f2f2f2', // Fondo plano y claro
  },
  logo: {
    width: '100%',
    maxWidth: 350,
    height: (350 / 2), // Mantener la proporción (asumiendo 2:1)
    marginBottom: height * 0.03,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: height * 0.03,
    width: '100%',
    maxWidth: 350,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 18, // <-- AUMENTADO EL TAMAÑO DE LA FUENTE AQUÍ
    fontFamily: 'Montserrat-Regular',
    color: '#333',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: '#8A9A5B',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: 'rgba(138, 154, 91, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});