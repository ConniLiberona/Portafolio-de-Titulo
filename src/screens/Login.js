// src/screens/Login.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image } from 'react-native';

// Importaciones de Firebase
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import appMoscasSAG from '../../credenciales'; // Ajusta la ruta si es necesario

// Obtiene la instancia de autenticación de Firebase
const auth = getAuth(appMoscasSAG);

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
      {/* Puedes colocar aquí la imagen del SAG si la tienes */}
      {/* <Image source={require('../assets/sag_logo.png')} style={styles.logo} /> */}

      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#999"
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
    backgroundColor: '#f2f2f2',
  },
  // logo: {
  //   width: 150,
  //   height: 150,
  //   marginBottom: 30,
  //   resizeMode: 'contain',
  // },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#2E7D32', // <-- VERDE Principal (SAG)
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});