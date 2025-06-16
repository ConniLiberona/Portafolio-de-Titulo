// src/screens/Login.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';

// Importaciones de Firebase
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import appMoscasSAG from '../../credenciales';

// Obtiene la instancia de autenticación de Firebase
const auth = getAuth(appMoscasSAG);

// Obtener las dimensiones de la pantalla para ajustar el tamaño del logo y márgenes
const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notificationMessage, setNotificationMessage] = useState(''); // Estado para el mensaje de la notificación
  const [showNotification, setShowNotification] = useState(false); // Estado para mostrar/ocultar la notificación
  const [notificationType, setNotificationType] = useState('success'); // 'success' o 'error' para estilos

  // Función auxiliar para mostrar la notificación
  const showUserNotification = (message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    // Opcional: Ocultar la notificación automáticamente después de unos segundos
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage(''); // Limpiar el mensaje
    }, 5000); // La notificación se ocultará después de 5 segundos
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showUserNotification("Por favor, ingresa tu correo y contraseña.", 'error');
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
      showUserNotification(errorMessage, 'error'); // Mostrar error con la notificación personalizada
    }
  };

const handleForgotPassword = async () => {
  // ... tus console.log existentes ...

  if (!email) {
    showUserNotification("Por favor, ingresa tu correo electrónico para restablecer la contraseña.", 'error');
    return;
  }

  console.log("handleForgotPassword: Email no está vacío. Intentando enviar correo a:", email);

  try {
    await sendPasswordResetEmail(auth, email);
    console.log("handleForgotPassword: Correo de restablecimiento enviado con éxito.");
    showUserNotification(`Se ha enviado un correo de restablecimiento de contraseña a ${email}. Por favor, revisa tu bandeja de entrada (y spam).`);

  } catch (error) {
    // --- CAMBIO CLAVE AQUÍ ---
    console.error("handleForgotPassword: Error al enviar correo de restablecimiento:", error.code, error.message);
    let errorMessage = "Error al enviar el correo de restablecimiento. Inténtalo de nuevo.";

    if (error.code === 'auth/invalid-email') {
      errorMessage = "El formato del correo electrónico es inválido.";
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = "No hay ningún usuario registrado con este correo electrónico.";
    } else if (error.code === 'auth/too-many-requests') { // <-- ¡Manejar este error específicamente!
      errorMessage = "Demasiados intentos. Por favor, inténtalo de nuevo más tarde.";
    }
    showUserNotification(errorMessage, 'error'); // Mostrar error con la notificación personalizada
  }
  console.log("handleForgotPassword: Fin de la ejecución.");
};

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/SAG.png')}
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

      <TouchableOpacity
        style={styles.forgotPasswordButton}
        onPress={() => {
          console.log("¡Clic en el botón de olvido de contraseña detectado!");
          handleForgotPassword();
        }}
      >
        <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      {/* --- COMPONENTE DE NOTIFICACIÓN PERSONALIZADA --- */}
      {showNotification && (
        <View style={[styles.notificationBox, notificationType === 'error' ? styles.notificationBoxError : styles.notificationBoxSuccess]}>
          <Text style={styles.notificationText}>{notificationMessage}</Text>
          <TouchableOpacity onPress={() => setShowNotification(false)} style={styles.notificationCloseButton}>
            <Text style={styles.notificationCloseText}>X</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* --- FIN COMPONENTE DE NOTIFICACIÓN PERSONALIZADA --- */}
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
  logo: {
    width: '100%',
    maxWidth: 350,
    height: (350 / 2),
    marginBottom: height * 0.03,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    // fontFamily: 'Montserrat-Bold',
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
    fontSize: 18,
    // fontFamily: 'Montserrat-Regular',
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
    // fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  forgotPasswordButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  forgotPasswordText: {
    color: '#607D8B',
    fontSize: 15,
    // fontFamily: 'Montserrat-Regular',
    textDecorationLine: 'underline',
  },
  // --- NUEVOS ESTILOS PARA LA NOTIFICACIÓN CUSTOM ---
  notificationBox: {
  position: 'absolute',
  top: 20, // Distancia desde la parte superior
  left: 20, // Distancia desde la izquierda
  right: 20, // Distancia desde la derecha (esto hará que ocupe el ancho disponible)
  // Quita bottom y marginHorizontal si los tenías para esta configuración
  padding: 15,
  borderRadius: 8,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  maxWidth: 400, // Sigue manteniendo un ancho máximo para pantallas grandes
  alignSelf: 'center', // Centra el box horizontalmente si tiene un maxWidth
  zIndex: 1000,
},
  notificationBoxSuccess: {
    backgroundColor: '#4CAF50', // Verde para éxito
  },
  notificationBoxError: {
    backgroundColor: '#F44336', // Rojo para error
  },
  notificationText: {
    color: 'white',
    fontSize: 16,
    flexShrink: 1, // Permite que el texto se ajuste si es largo
    marginRight: 10,
  },
  notificationCloseButton: {
    padding: 5,
  },
  notificationCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // --- FIN NUEVOS ESTILOS ---
});