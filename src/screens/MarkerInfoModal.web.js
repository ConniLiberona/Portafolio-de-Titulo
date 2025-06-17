// src/screens/MarkerInfoModal.js (o .web.js)

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert } from 'react-native';
import { getFirestore, doc, updateDoc, deleteDoc, collection, query, getDocs, where } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';
import { useNavigation } from '@react-navigation/native'; // Para la navegación a DetalleFicha

const { width, height } = Dimensions.get('window');

const db = getFirestore(appMoscasSAG); // Inicializa Firestore

// Estados válidos para el pin (duplicados aquí para que el modal sea autocontenido, pero idealmente se importaría de un archivo común)
const validPinStates = [
  'Activa',
  'Próxima a vencer',
  'Vencida',
  'Inactiva/Retirada',
  'Requiere revisión',
];

// Función para obtener el color asociado a cada estado
const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Activa': return '#4CAF50'; // Verde
    case 'Próxima a vencer': return '#FFC107'; // Amarillo
    case 'Vencida': return '#F44336'; // Rojo
    case 'Inactiva/Retirada': return '#9E9E9E'; // Gris
    case 'Requiere revisión': return '#2196F3'; // Azul
    default: return '#007bff'; // Azul por defecto (si no hay coincidencia)
  }
};

export default function MarkerInfoModal({ visible, onClose, markerData, onUpdateMarker, onDeleteMarker, openErrorModal, openSuccessModal }) {
  const [currentMarkerData, setCurrentMarkerData] = useState(markerData);
  const [associatedFichas, setAssociatedFichas] = useState([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (visible && markerData) {
      setCurrentMarkerData(markerData);
      fetchFichasForTrampa(markerData.n_trampa);
    } else if (!visible) {
        setAssociatedFichas([]); // Limpiar fichas al cerrar
    }
  }, [visible, markerData]);

  // Función para cargar fichas relacionadas con un n_trampa
  const fetchFichasForTrampa = async (n_trampa) => {
    setLoadingFichas(true);
    try {
      console.log(`Buscando fichas para n_trampa: ${n_trampa}`);
      const q = query(collection(db, 'fichas'), where('n_trampa', '==', n_trampa));
      const querySnapshot = await getDocs(q);
      const fichas = [];
      querySnapshot.forEach((doc) => {
        const fichaData = doc.data();
        if (!fichaData.deleted) {
          fichas.push({ id: doc.id, ...fichaData });
        }
      });
      setAssociatedFichas(fichas);
      console.log(`Fichas encontradas para ${n_trampa}:`, fichas);
    } catch (error) {
      console.error("Error al cargar fichas para la trampa: ", error);
      openErrorModal('No se pudieron cargar las fichas asociadas.');
      setAssociatedFichas([]);
    } finally {
      setLoadingFichas(false);
    }
  };

  // Función para ir a la pantalla de detalle de ficha
  const handleGoToFichaDetail = (fichaId) => {
    console.log("Navegando a detalles de ficha:", fichaId);
    navigation.navigate('DetalleFicha', { fichaId: fichaId });
  };

  // Manejar el cambio de estado del pin
  const handleChangePinState = async (pinId, newEstado) => {
    try {
      const pinRef = doc(db, 'pins', pinId);
      const updates = { estado: newEstado };

      if (newEstado === 'Inactiva/Retirada') {
        updates.retirada = true;
      } else {
        updates.retirada = false;
      }

      if (newEstado === 'Requiere revisión') {
        updates.plaga_detectada = true;
      } else {
        updates.plaga_detectada = false;
      }

      await updateDoc(pinRef, updates);
      setCurrentMarkerData(prevData => ({ ...prevData, ...updates, estado: newEstado }));
      openSuccessModal(`Estado de la trampa actualizado a: ${newEstado}`);
      onUpdateMarker(pinId, updates); // Notifica al MapScreen para actualizar su estado de markers
    } catch (error) {
      console.error("Error al actualizar el estado de la trampa: ", error);
      openErrorModal('No se pudo actualizar el estado de la trampa.');
    }
  };

  // Manejar eliminación del pin
  const handleDelete = () => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar esta trampa? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "pins", currentMarkerData.id));
              openSuccessModal("Trampa eliminada correctamente.");
              onDeleteMarker(currentMarkerData.id); // Notifica al MapScreen
              onClose(); // Cerrar el modal después de eliminar
            } catch (error) {
              console.error("Error al eliminar la trampa: ", error);
              openErrorModal("No se pudo eliminar la trampa.");
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  if (!markerData) {
    return null; // No renderizar si no hay datos de marcador
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <Text style={styles.modalTitle}>Trampa N° {currentMarkerData.n_trampa !== 'N/A' ? currentMarkerData.n_trampa : 'N/A'}</Text>
            <Text style={styles.modalText}>Descripción: {currentMarkerData.description}</Text>
            <Text style={styles.modalText}>
              Estado: <Text style={{ fontWeight: 'bold', color: getEstadoColor(currentMarkerData.estado) }}>{currentMarkerData.estado}</Text>
            </Text>
            <Text style={styles.modalText}>Lat: {currentMarkerData.lat.toFixed(4)}, Lng: {currentMarkerData.lng.toFixed(4)}</Text>
            {currentMarkerData.fecha_instalacion && (
              <Text style={styles.modalText}>Instalación: {currentMarkerData.fecha_instalacion.toLocaleDateString()}</Text>
            )}
            {currentMarkerData.timestamp && (
              <Text style={styles.modalText}>Última Actualización: {currentMarkerData.timestamp.toLocaleDateString()}</Text>
            )}

            <View style={styles.actionSection}>
              <Text style={styles.actionLabel}>Cambiar Estado:</Text>
              <View style={styles.radioGroup}>
                {validPinStates.map((estado) => (
                  <TouchableOpacity
                    key={estado}
                    style={styles.radioButton}
                    onPress={() => handleChangePinState(currentMarkerData.id, estado)}
                  >
                    <View style={[
                      styles.radioCircle,
                      currentMarkerData.estado === estado && styles.selectedRadioCircle,
                    ]}>
                      {currentMarkerData.estado === estado && (
                        <View style={[
                          styles.innerRadioCircle,
                          { backgroundColor: getEstadoColor(estado) }
                        ]} />
                      )}
                    </View>
                    <View style={[
                      styles.colorIndicator,
                      { backgroundColor: getEstadoColor(estado) }
                    ]} />
                    <Text style={styles.radioLabel}>{estado.split('/')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.fichasContainer}>
                <Text style={styles.actionLabel}>Fichas Asociadas ({loadingFichas ? 'Cargando...' : associatedFichas.length}):</Text>
                {loadingFichas ? (
                  <Text style={styles.loadingFichasText}>Cargando fichas...</Text>
                ) : associatedFichas.length > 0 ? (
                  <View style={styles.fichaButtonsGrid}>
                    {associatedFichas.map((ficha) => (
                      <TouchableOpacity
                        key={ficha.id}
                        style={styles.fichaButton}
                        onPress={() => handleGoToFichaDetail(ficha.id)}
                      >
                        <Text style={styles.fichaButtonText}>📄 Trampa {ficha.n_trampa}</Text>
                        {ficha.fecha && (
                          <Text style={styles.fichaButtonDate}>
                            {ficha.fecha.toDate().toLocaleDateString()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noFichasText}>No hay fichas asociadas a esta trampa.</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Eliminar Trampa</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Fondo semitransparente oscuro
  },
  modalView: {
    margin: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 25,
    alignItems: 'stretch', // Para que el contenido interno se estire
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: width * 0.9, // 90% del ancho de la pantalla
    maxHeight: height * 0.8, // 80% de la altura de la pantalla
    overflow: 'hidden', // Asegura que el ScrollView maneje el desbordamiento
    position: 'relative', // Para posicionar el botón de cerrar
  },
  scrollViewContent: {
    flexGrow: 1, // Permite que el ScrollView ocupe todo el espacio disponible
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 5,
  },
  actionSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  actionLabel: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 5,
    width: '48%', // Dos opciones por fila
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  selectedRadioCircle: {
    borderColor: '#007bff',
  },
  innerRadioCircle: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  radioLabel: {
    fontSize: 15,
    color: '#333',
    flexShrink: 1,
  },
  fichasContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  fichaButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 5,
  },
  fichaButton: {
    backgroundColor: '#e0f7fa',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b2ebf2',
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    boxShadow: '0 0 5px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
  fichaButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00796b',
    textAlign: 'center',
  },
  fichaButtonDate: {
    fontSize: 11,
    color: '#00796b',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingFichasText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 5,
  },
  noFichasText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 5,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    boxShadow: '0 0 5px rgba(0,0,0,0.2)',
    cursor: 'pointer',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ccc',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
});