// src/screens/PinCreationModal.js
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Estados válidos para el pin
const validPinStates = [
  'Activa',
  'Próxima a vencer',
  'Vencida',
  'Inactiva/Retirada',
  'Requiere revisión',
];

// Función auxiliar para obtener el color del botón de estado
const getStatusButtonColor = (estado) => {
  switch (estado) {
    case 'Activa': return '#4CAF50';
    case 'Próxima a vencer': return '#FFC107';
    case 'Vencida': return '#F44336';
    case 'Inactiva/Retirada': return '#9E9E9E';
    case 'Requiere revisión': return '#2196F3';
    default: return '#007bff';
  }
};

export default function PinCreationModal({ visible, onClose, onSave, coords }) {
  const [description, setDescription] = useState('');
  const [selectedEstado, setSelectedEstado] = useState(validPinStates?.[0] || '');
  const [nTrampa, setNTrampa] = useState(''); // Estado para el número de trampa

  useEffect(() => {
    if (visible) {
      setDescription('');
      setSelectedEstado(validPinStates?.[0] || '');
      setNTrampa(''); // Limpiar el campo del número de trampa al abrir
    }
  }, [visible, validPinStates]);

  const handleSave = () => {
    if (description.trim() === '') {
      alert('La descripción no puede estar vacía.');
      return;
    }
    if (selectedEstado === '') {
      alert('Debes seleccionar un estado para la trampa.');
      return;
    }
    // VALIDACIÓN PARA n_trampa DE 9 DÍGITOS
    const cleanedNTrampa = nTrampa.trim();
    if (cleanedNTrampa.length === 0) {
      alert('El número de trampa no puede estar vacío.');
      return;
    }
    if (!/^\d{9}$/.test(cleanedNTrampa)) { // Asegura que sean exactamente 9 dígitos numéricos
      alert('El número de trampa debe ser de 9 dígitos numéricos.');
      return;
    }

    // Decidir si guardar como número o string
    // Opción A: Guardar como número (si los ceros iniciales no son relevantes para la búsqueda/comparación)
    const numeroTrampa = parseInt(cleanedNTrampa, 10);

    // Opción B: Guardar como string (si los ceros iniciales son importantes, ej. "000123456")
    // const numeroTrampa = cleanedNTrampa; // Mantener como string

    onSave({
      lat: coords.lat,
      lng: coords.lng,
      description: description.trim(),
      estado: selectedEstado,
      n_trampa: numeroTrampa, // Usar 'numeroTrampa' (int) o 'cleanedNTrampa' (string) según tu decisión
    });
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Nueva Trampa</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Trampa (9 dígitos):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: 123456789"
              value={nTrampa}
              onChangeText={(text) => {
                  // Permitir solo dígitos y limitar a 9 caracteres
                  const filteredText = text.replace(/[^0-9]/g, '');
                  if (filteredText.length <= 9) {
                      setNTrampa(filteredText);
                  }
              }}
              keyboardType="numeric" // Sugiere teclado numérico
              maxLength={9} // Limita la entrada a 9 caracteres
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Trampa Norte Campo 3"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estado Inicial:</Text>
            <View style={styles.statusOptionsContainer}>
              {validPinStates.map((estado) => (
                <TouchableOpacity
                  key={estado}
                  style={[
                    styles.statusOptionButton,
                    { backgroundColor: getStatusButtonColor(estado) },
                    selectedEstado === estado && styles.selectedStatusOption,
                  ]}
                  onPress={() => setSelectedEstado(estado)}
                >
                  <Text style={styles.statusOptionText}>{estado.split('/')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSave]}
              onPress={handleSave}
            >
              <Text style={styles.buttonTextSmall}>Guardar Trampa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 25,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: width * 0.75,
    maxWidth: 550,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: 'bold',
  },
  textInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    fontSize: 16,
    minHeight: 45,
    backgroundColor: 'white',
  },
  statusOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 15,
  },
  statusOptionButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginVertical: 5,
    minWidth: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  selectedStatusOption: {
    borderWidth: 2,
    borderColor: '#007bff',
  },
  statusOptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonCancel: {
    backgroundColor: '#f44336',
  },
  buttonSave: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSmall: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});