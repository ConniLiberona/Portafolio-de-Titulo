import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const EditUserModal = ({ visible, user, onClose, onSave }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState(''); // Contraseña se dejará vacía si no se cambia

  useEffect(() => {
    if (user) {
      setNewEmail(user.email);
      setNewPassword(''); // Siempre resetear la contraseña por seguridad
    }
  }, [user]);

  const handleSavePress = () => {
    // Llama a la función onSave pasada por props con el UID, nuevo email y nueva contraseña
    onSave(user.uid, newEmail, newPassword);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Modificar Usuario: {user?.email}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nuevo Email"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Nueva Contraseña (dejar en blanco para no cambiar)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.textStyle}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSavePress}
            >
              <Text style={styles.textStyle}>Guardar Cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    width: '100%',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    elevation: 2,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: "#4CAF50", // Verde para guardar
  },
  cancelButton: {
    backgroundColor: "#F44336", // Rojo para cancelar
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  }
});

export default EditUserModal;
