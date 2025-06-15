import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ConfirmationModal = ({ visible, message, onConfirm, onCancel, title = "Confirmar Acción" }) => {
  return (
    <Modal
      animationType="fade" // Puedes cambiar a "slide" si prefieres
      transparent={true}
      visible={visible}
      onRequestClose={onCancel} // Para manejar el botón de retroceso en Android, aunque en web es menos común
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.textStyle}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.textStyle}>Confirmar</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)', // Fondo oscuro semitransparente
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000", // Para React Native
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25, // Para React Native
    shadowRadius: 4,     // Para React Native
    elevation: 5,        // Para Android
    boxShadow: '0 0 10px rgba(0,0,0,0.3)', // Para Web (complementa shadow*)
    maxWidth: 400, // Para que no se estire demasiado en pantallas grandes
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2, // Para Android
    minWidth: 100,
  },
  confirmButton: {
    backgroundColor: "#DC3545", // Rojo para confirmar eliminación
  },
  cancelButton: {
    backgroundColor: "#2196F3", // Azul para cancelar
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  }
});

export default ConfirmationModal;