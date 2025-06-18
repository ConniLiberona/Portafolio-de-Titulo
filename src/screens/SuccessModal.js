import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SuccessModal = ({ visible, message, onClose, title = "Operación Exitosa" }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={onClose}
          >
            <Text style={styles.textStyle}>Aceptar</Text>
          </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: 'rgba(138, 154, 91, 0.81)',
  },
  modalText: {
    marginBottom: 25,
    textAlign: "center",
    fontSize: 16,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    elevation: 2,
    minWidth: 120,
  },
  successButton: {
    backgroundColor: "rgba(138, 154, 91, 0.81)",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  }
});

export default SuccessModal;