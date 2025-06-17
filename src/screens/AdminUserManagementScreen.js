// src/screens/AdminUserManagementScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminUserManagementScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Usuarios (Admin)</Text>
      <Text>Aquí se listarán los usuarios y se podrán asignar roles.</Text>
      {/* Aquí irá la lógica para listar usuarios, el formulario para asignar roles, etc. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});