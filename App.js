import 'react-native-gesture-handler';
import React from 'react'; // Asegúrate de importar React
import Navigation from './src/Navigation';
import { AuthProvider } from './src/context/AuthContext'; // <--- Importa AuthProvider

export default function App() {
  return (
    <AuthProvider> {/* Envuelve tu componente principal con AuthProvider */}
      <Navigation />
    </AuthProvider>
  );
}