import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import appMoscasSAG from '../../credenciales';
import { AuthContext } from '../context/AuthContext';

import ConfirmationModal from './ConfirmationModal';
import InfoModal from './InfoModal';

const functionsInstance = getFunctions(appMoscasSAG);

export default function GestionUsuarios() {
  const { user, userClaims, loading } = useContext(AuthContext);
  const isAdmin = userClaims?.admin;

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [assignAdminToNewUser, setAssignAdminToNewUser] = useState(false);

 
  const [editingUser, setEditingUser] = useState(null); 
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState(''); 

  
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null); 

 
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');
  const [infoModalType, setInfoModalType] = useState('success'); 


  const openInfoModal = (title, message, type = 'success') => {
    setInfoModalTitle(title);
    setInfoModalMessage(message);
    setInfoModalType(type);
    setIsInfoModalVisible(true);
  };

  
  const closeInfoModal = () => {
    setIsInfoModalVisible(false);
    setInfoModalTitle('');
    setInfoModalMessage('');
    setInfoModalType('success');
  };

  useEffect(() => {
    console.log("DEBUG: useEffect - loading:", loading, "isAdmin:", isAdmin);
    if (!loading && isAdmin) {
      fetchUsers();
    } else if (!loading && !isAdmin) {

      openInfoModal("Acceso Denegado", "Solo los administradores pueden gestionar usuarios.", "error");
      console.log("DEBUG: Acceso denegado. El usuario no es administrador.");
    }
  }, [loading, isAdmin]);

  const fetchUsers = async () => {
    console.log("DEBUG: Iniciando fetchUsers...");
    setLoadingUsers(true);
    try {
      const listUsersFunction = httpsCallable(functionsInstance, 'listUsers');
      const result = await listUsersFunction();
      console.log("DEBUG: Usuarios obtenidos exitosamente.");
      setUsers(result.data.users);
    } catch (error) {
      console.error("DEBUG: Error en fetchUsers:", error);

      openInfoModal("Error", "No se pudieron cargar los usuarios: " + error.message, "error");
    } finally {
      setLoadingUsers(false);
      console.log("DEBUG: fetchUsers finalizado.");
    }
  };

  const handleCreateUser = async () => {
    console.log("DEBUG: Intentando crear usuario...");
    if (!newUserEmail || !newUserPassword) {

      openInfoModal("Error", "Email y Contraseña son obligatorios.", "error");
      console.log("DEBUG: Error de validación: email o contraseña vacíos.");
      return;
    }

    try {
      const createUserFunction = httpsCallable(functionsInstance, 'createUserAndAssignRole');
      const result = await createUserFunction({
        email: newUserEmail,
        password: newUserPassword,
        role: assignAdminToNewUser ? 'admin' : 'commonUser'
      });
      console.log("DEBUG: Usuario creado con éxito. Resultado:", result.data);

      openInfoModal("Éxito", result.data.message);
      setNewUserEmail('');
      setNewUserPassword('');
      setAssignAdminToNewUser(false);
      fetchUsers();
    } catch (error) {
      console.error("DEBUG: Error al crear usuario en handleCreateUser:", error);
    
      openInfoModal("Error", error.message || "No se pudo crear el usuario.", "error");
    }
  };

  const handleUpdateUserRole = async (uid, currentClaims, newAdminStatus) => {
    console.log("DEBUG: Intentando actualizar rol para UID:", uid, "Nuevo estado admin:", newAdminStatus);
    if (uid === user.uid && currentClaims?.admin && !newAdminStatus) {

      openInfoModal("Error", "No puedes quitarte a ti mismo el rol de administrador.", "error");
      console.log("DEBUG: Error: Intento de quitar rol de admin al propio usuario.");
      return;
    }

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
    console.log("DEBUG: Nuevos claims a establecer:", newClaims);

    try {
      const updateUserRoleFunction = httpsCallable(functionsInstance, 'updateUserRole');
      const result = await updateUserRoleFunction({ uid, claims: newClaims });
      console.log("DEBUG: Rol actualizado con éxito. Resultado:", result.data);
  
      openInfoModal("Éxito", result.data.message + "\nEl usuario deberá cerrar sesión y volver a iniciar para que el rol se actualice.");
      fetchUsers();
    } catch (error) {
      console.error("DEBUG: Error al actualizar rol en handleUpdateUserRole:", error);
    
      openInfoModal("Error", error.message || "No se pudo actualizar el rol del usuario.", "error");
    }
  };


  const handleDeleteUser = (uid, email) => {
    console.log("DEBUG: Botón Eliminar presionado para:", email, "UID:", uid);

    if (uid === user.uid) {
 
      openInfoModal("Error", "No puedes eliminar tu propia cuenta de usuario.", "error");
      console.log("DEBUG: Error: Intento de eliminar la propia cuenta de usuario.");
      return;
    }


    setUserToDelete({ uid, email });
    setIsDeleteModalVisible(true);
    console.log("DEBUG: Mostrando ConfirmationModal para eliminar usuario.");
  };


  const confirmDelete = async () => {
    setIsDeleteModalVisible(false); 
    if (!userToDelete) {
      console.log("DEBUG: No hay usuario para eliminar en el estado. Cancelando confirmación.");
      return;
    }

    const { uid, email } = userToDelete;
    console.log("DEBUG: Usuario confirmó eliminación de:", email);
    try {
      console.log("DEBUG: Preparando llamada a httpsCallable('deleteUser') con UID:", uid);
      const deleteUserFunction = httpsCallable(functionsInstance, 'deleteUser');
      console.log("DEBUG: Instancia de deleteUserFunction creada. Realizando llamada...");
      const result = await deleteUserFunction({ uid });
      console.log("DEBUG: deleteUserFunction llamada con éxito. Resultado:", result.data);
    
      openInfoModal("Éxito", result.data.message);
      fetchUsers(); 
    } catch (error) {
      console.error("DEBUG: Error CRÍTICO en la llamada o ejecución de deleteUserFunction:", error);

      if (error.code) {
        console.error("DEBUG: Código de error de Firebase Functions:", error.code);
      }
      if (error.details) {
        console.error("DEBUG: Detalles del error de Firebase Functions:", error.details);
      }
   
      openInfoModal("Error", error.message || "No se pudo eliminar el usuario.", "error");
    } finally {
      setUserToDelete(null); 
    }
  };


  const cancelDelete = () => {
    console.log("DEBUG: Eliminación cancelada por el usuario (desde modal).");
    setIsDeleteModalVisible(false); 
    setUserToDelete(null); 
  };



  const handleStartEditUser = (userItem) => {
    console.log("DEBUG: Botón Modificar presionado para:", userItem.email, "UID:", userItem.uid);
    setEditingUser(userItem.uid);
    setEditEmail(userItem.email);
    setEditPassword(''); 
   
    openInfoModal(
      "Modificar Usuario", 
      `Funcionalidad para modificar el usuario ${userItem.email}. 
      Deberías abrir un formulario o modal aquí para cambiar email/contraseña.`,
      "info" 
    );

  };

  if (loading || loadingUsers) {
    console.log("DEBUG: Mostrando indicador de carga...");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Cargando gestión de usuarios...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    console.log("DEBUG: Usuario no es admin. Mostrando mensaje de acceso denegado.");
    return (
      <View style={styles.container}>
        <Text style={styles.permissionDeniedText}>No tienes permisos para acceder a esta sección.</Text>
      </View>
    );
  }

  console.log("DEBUG: Renderizando Gestión de Usuarios (Admin).");
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

      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.cardTitle}>Usuarios Existentes</Text>
        <FlatList
          data={users}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userRole}>
                  Rol: {item.customClaims?.admin ? 'Administrador' : item.customClaims?.commonUser ? 'Usuario Común' : 'Ninguno'}
                </Text>
              </View>
              <View style={styles.userActions}>
                <Button
                  title={item.customClaims?.admin ? "Quitar Admin" : "Hacer Admin"}
                  onPress={() => handleUpdateUserRole(item.uid, item.customClaims, !item.customClaims?.admin)}
                  color={item.customClaims?.admin ? "#FF6347" : "#4CAF50"} 
                />
                <TouchableOpacity 
                    style={[styles.actionButton, styles.modifyButton]}
                    onPress={() => handleStartEditUser(item)}
                >
                    <Text style={styles.buttonText}>Modificar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(item.uid, item.email)}
                >
                    <Text style={styles.buttonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Renderiza el ConfirmationModal */}
      {isDeleteModalVisible && userToDelete && (
        <ConfirmationModal
          visible={isDeleteModalVisible}
          title="Confirmar Eliminación"
          message={`¿Estás seguro de que quieres eliminar al usuario ${userToDelete.email}? Esta acción es irreversible.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Renderiza el InfoModal para éxito/error/información */}
      {isInfoModalVisible && (
        <InfoModal
          visible={isInfoModalVisible}
          title={infoModalTitle}
          message={infoModalMessage}
          type={infoModalType}
          onClose={closeInfoModal}
        />
      )}
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
    justifyContent: 'center',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexWrap: 'wrap', 
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
    minWidth: 150, 
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: 14,
    color: '#777',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modifyButton: {
    backgroundColor: '#007bff', 
  },
  deleteButton: {
    backgroundColor: '#DC3545', 
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
