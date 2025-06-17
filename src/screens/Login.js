// src/screens/Login.js
import React, { useState, useContext } from 'react'; // <-- Importa useContext
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';

// Importaciones de Firebase
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import appMoscasSAG from '../../credenciales';

// Importa tu AuthContext
import { AuthContext } from '../context/AuthContext'; // <-- Asegúrate de que la ruta sea correcta

// Obtiene la instancia de autenticación de Firebase
const auth = getAuth(appMoscasSAG);

// Obtener las dimensiones de la pantalla para ajustar el tamaño del logo y márgenes
const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('success');

  // Usa el AuthContext
  const { setUser, setUserClaims } = useContext(AuthContext); // Aunque onAuthStateChanged ya lo actualiza,
                                                             // si no tienes un listener global, necesitarías esto.
                                                             // Dado que ya lo tienes en AuthContext,
                                                             // no es estrictamente necesario aquí, pero lo mantengo
                                                             // como referencia de cómo se actualizaría si no hubiera
                                                             // un listener global.

  const showUserNotification = (message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage('');
    }, 5000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showUserNotification("Por favor, ingresa tu correo y contraseña.", 'error');
      return;
    }
    try {
      // signInWithEmailAndPassword ya disparará el onAuthStateChanged en AuthContext
      // que a su vez obtendrá los claims.
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario ha iniciado sesión');
      showUserNotification('Inicio de sesión exitoso.', 'success'); // Notificación de éxito
      // La navegación se maneja automáticamente por Navigation.js (onAuthStateChanged)
      // No necesitas obtener claims aquí, el AuthContext ya lo hace.

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
      showUserNotification(errorMessage, 'error');
    }
  };

  const handleForgotPassword = async () => {
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
      console.error("handleForgotPassword: Error al enviar correo de restablecimiento:", error.code, error.message);
      let errorMessage = "Error al enviar el correo de restablecimiento. Inténtalo de nuevo.";

      if (error.code === 'auth/invalid-email') {
        errorMessage = "El formato del correo electrónico es inválido.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No hay ningún usuario registrado con este correo electrónico.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Demasiados intentos. Por favor, inténtalo de nuevo más tarde.";
      }
      showUserNotification(errorMessage, 'error');
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

      {showNotification && (
        <View style={[styles.notificationBox, notificationType === 'error' ? styles.notificationBoxError : styles.notificationBoxSuccess]}>
          <Text style={styles.notificationText}>{notificationMessage}</Text>
          <TouchableOpacity onPress={() => setShowNotification(false)} style={styles.notificationCloseButton}>
            <Text style={styles.notificationCloseText}>X</Text>
          </TouchableOpacity>
        </View>
      )}
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
  notificationBox: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
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
    maxWidth: 400,
    alignSelf: 'center',
    zIndex: 1000,
  },
  notificationBoxSuccess: {
    backgroundColor: '#4CAF50',
  },
  notificationBoxError: {
    backgroundColor: '#F44336',
  },
  notificationText: {
    color: 'white',
    fontSize: 16,
    flexShrink: 1,
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
});