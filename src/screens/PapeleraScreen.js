import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import appMoscasSAG from '../../credenciales';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ConfirmationModal from './ConfirmationModal';

const db = getFirestore(appMoscasSAG);
const storage = getStorage(appMoscasSAG);

function getStoragePathFromUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathAndQuery = urlObj.pathname;
    const parts = pathAndQuery.split('/o/');
    if (parts.length < 2) return null;
    const encodedPath = parts[1];
    return decodeURIComponent(encodedPath);
  } catch (e) {
    console.error("Error al parsear URL de Storage para eliminación:", e);
    return null;
  }
}

export default function PapeleraScreen() {
  const [fichasEliminadas, setFichasEliminadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFicha, setSelectedFicha] = useState(null);

  const fetchFichasEliminadas = async () => {
    setLoading(true);
    setError(null);
    try {
      const fichasCollectionRef = collection(db, 'fichas');
      const q = query(
        fichasCollectionRef,
        where('deleted', '==', true),
      );
      const querySnapshot = await getDocs(q);
      let data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort((a, b) => {
        const convertToDate = (value) => {
          if (value && typeof value.toDate === 'function') {
            return value.toDate();
          }
          if (typeof value === 'string') {
            try {
              const d = new Date(value);
              if (!isNaN(d.getTime())) {
                return d;
              }
            } catch (e) {
              console.warn("No se pudo parsear la fecha como string:", value, e);
            }
          }
          return new Date(0);
        };

        const dateA = convertToDate(a.deletedAt);
        const dateB = convertToDate(b.deletedAt);

        return dateB.getTime() - dateA.getTime();
      });

      setFichasEliminadas(data);
    } catch (e) {
      setError('Error al cargar y ordenar las fichas de la papelera. Verifique la consola para más detalles.');
      console.error("Error fetching or sorting deleted fichas:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFichasEliminadas();
      return () => {
        // Opcional: limpieza si fuera necesaria al desenfocar
      };
    }, [])
  );

  const promptRestore = (ficha) => {
    setSelectedFicha(ficha);
    setShowRestoreModal(true);
  };

  const promptPermanentDelete = (ficha) => {
    setSelectedFicha(ficha);
    setShowDeleteModal(true);
  };

  const handleConfirmRestore = async () => {
    setShowRestoreModal(false);
    if (!selectedFicha) return;

    try {
      const docRef = doc(db, 'fichas', selectedFicha.id);
      await updateDoc(docRef, {
        deleted: false,
        deletedAt: null
      });
      Alert.alert("Éxito", "Ficha restaurada correctamente.");
      fetchFichasEliminadas();
    } catch (e) {
      Alert.alert("Error", `No se pudo restaurar la ficha: ${e.message}`);
      console.error("Error restoring ficha:", e);
    } finally {
      setSelectedFicha(null);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    setShowDeleteModal(false);
    if (!selectedFicha) return;

    try {
      if (selectedFicha.imageUrl) {
        const imagePath = getStoragePathFromUrl(selectedFicha.imageUrl);
        if (imagePath) {
          const imageRef = ref(storage, imagePath);
          try {
            await deleteObject(imageRef);
          } catch (deleteError) {
            if (deleteError.code !== 'storage/object-not-found') {
              console.warn("Advertencia: No se pudo eliminar la imagen asociada de Storage (procediendo con la eliminación de la ficha):", deleteError);
            } else {
              console.log("Imagen asociada no encontrada en Storage.");
            }
          }
        }
      }

      const docRef = doc(db, 'fichas', selectedFicha.id);
      await deleteDoc(docRef);
      Alert.alert("Éxito", "Ficha eliminada permanentemente.");
      fetchFichasEliminadas();
    } catch (e) {
      Alert.alert("Error", `No se pudo eliminar la ficha permanentemente: ${e.message}`);
      console.error("Error permanently deleting ficha:", e);
    } finally {
      setSelectedFicha(null);
    }
  };

  const handleCancelModal = () => {
    setShowRestoreModal(false);
    setShowDeleteModal(false);
    setSelectedFicha(null);
  };

  const renderItem = ({ item }) => {
    const deletedDate = item.deletedAt
      ? (typeof item.deletedAt.toDate === 'function'
           ? item.deletedAt.toDate().toLocaleDateString('es-ES', {
               year: 'numeric', month: 'long', day: 'numeric',
               hour: '2-digit', minute: '2-digit'
             })
           : (typeof item.deletedAt === 'string'
               ? new Date(item.deletedAt).toLocaleDateString('es-ES', {
                   year: 'numeric', month: 'long', day: 'numeric',
                   hour: '2-digit', minute: '2-digit'
                 })
               : 'N/A (sin fecha de eliminación)'
             )
         )
      : 'N/A (sin fecha de eliminación)';

    return (
      <View style={styles.fichaCard}>
        <Text style={styles.cardTitle}>N° Trampa: {item.n_trampa || 'N/A'}</Text>
        <Text style={styles.cardDetail}>Oficina: {item.oficina || 'N/A'}</Text>
        <Text style={styles.cardDetail}>Eliminada el: {deletedDate}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButtonRestore}
            onPress={() => promptRestore(item)}
          >
            <Text style={styles.actionButtonText}>Restaurar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonDelete}
            onPress={() => promptPermanentDelete(item)}
          >
            <Text style={styles.actionButtonText}>Eliminar Permanentemente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E15252" />
        <Text style={styles.messageText}>Cargando papelera...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (fichasEliminadas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.messageText}>La papelera está vacía. 🎉</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🗑️ Papelera de Fichas</Text>
      <FlatList
        data={fichasEliminadas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
      />

      <ConfirmationModal
        visible={showRestoreModal}
        title="Restaurar Ficha"
        message="¿Estás seguro de que quieres restaurar esta ficha?"
        onConfirm={handleConfirmRestore}
        onCancel={handleCancelModal}
        confirmButtonColor="#4CAF50"
        cancelButtonColor="#2196F3"
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Eliminar Permanentemente"
        message="¡ATENCIÓN! ¿Estás seguro de que quieres eliminar esta ficha PERMANENTEMENTE? Esta acción NO se puede deshacer."
        onConfirm={handleConfirmPermanentDelete}
        onCancel={handleCancelModal}
        confirmButtonColor="#F44336"
        cancelButtonColor="#2196F3"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  fichaCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#D32F2F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  actionButtonRestore: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  actionButtonDelete: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});