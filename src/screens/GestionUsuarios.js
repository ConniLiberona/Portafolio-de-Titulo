import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import appMoscasSAG from '../../credenciales';
import { AuthContext } from '../context/AuthContext';

const functionsInstance = getFunctions(appMoscasSAG);

export default function GestionUsuarios() {
  const { user, userClaims, loading } = useContext(AuthContext);
  const isAdmin = userClaims?.admin;

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [assignAdminToNewUser, setAssignAdminToNewUser] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) {
      fetchUsers();
    } else if (!loading && !isAdmin) {
      Alert.alert("Acceso Denegado", "Solo los administradores pueden gestionar usuarios.");
    }
  }, [loading, isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const listUsersFunction = httpsCallable(functionsInstance, 'listUsers');
      const result = await listUsersFunction();
      setUsers(result.data.users);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      Alert.alert("Error", "No se pudieron cargar los usuarios: " + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      Alert.alert("Error", "Email y Contraseña son obligatorios.");
      return;
    }

    try {
      const createUserFunction = httpsCallable(functionsInstance, 'createUserAndAssignRole');
      const result = await createUserFunction({
        email: newUserEmail,
        password: newUserPassword,
        role: assignAdminToNewUser ? 'admin' : 'commonUser'
      });
      Alert.alert("Éxito", result.data.message);
      setNewUserEmail('');
      setNewUserPassword('');
      setAssignAdminToNewUser(false);
      fetchUsers();
    } catch (error) {
      console.error("Error al crear usuario:", error);
      Alert.alert("Error", error.message || "No se pudo crear el usuario.");
    }
  };

  const handleUpdateUserRole = async (uid, currentClaims, newAdminStatus) => {
    const newClaims = {
      ...currentClaims,
      admin: newAdminStatus,
      commonUser: !newAdminStatus
    };
    if (newAdminStatus) {
      delete newClaims.commonUser;
    } else {
      newClaims.commonUser = true;
    }


    try {
      const updateUserRoleFunction = httpsCallable(functionsInstance, 'updateUserRole');
      const result = await updateUserRoleFunction({ uid, claims: newClaims });
      Alert.alert("Éxito", result.data.message + "\nEl usuario deberá cerrar sesión y volver a iniciar para que el rol se actualice.");
      fetchUsers();
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      Alert.alert("Error", error.message || "No se pudo actualizar el rol del usuario.");
    }
  };

  if (loading || loadingUsers) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Cargando gestión de usuarios...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionDeniedText}>No tienes permisos para acceder a esta sección.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Usuarios</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crear Nuevo Usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={newUserEmail}
          onChangeText={setNewUserEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña (mín. 6 caracteres)"
          value={newUserPassword}
          onChangeText={setNewUserPassword}
          secureTextEntry
        />
        <View style={styles.checkboxContainer}>
          <Button
            title={assignAdminToNewUser ? "✔ Es Administrador" : "Es Administrador"}
            onPress={() => setAssignAdminToNewUser(!assignAdminToNewUser)}
          />
        </View>
        <Button title="Crear Usuario" onPress={handleCreateUser} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Usuarios Existentes</Text>
        <FlatList
          data={users}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <Text style={styles.userEmail}>{item.email}</Text>
              <Text style={styles.userRole}>
                Rol: {item.customClaims?.admin ? 'Administrador' : item.customClaims?.commonUser ? 'Usuario Común' : 'Ninguno'}
              </Text>
              <Button
                title={item.customClaims?.admin ? "Quitar Admin" : "Hacer Admin"}
                onPress={() => handleUpdateUserRole(item.uid, item.customClaims, !item.customClaims?.admin)}
                color={item.customClaims?.admin ? "red" : "green"}
              />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionDeniedText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  userRole: {
    fontSize: 14,
    color: '#777',
    marginRight: 10,
  },
});