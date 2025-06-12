import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList, // Usamos FlatList para listas eficientes
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
  orderBy,
  getDocs,
  doc,
  updateDoc, // Para restaurar
  deleteDoc, // Para eliminar permanentemente
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage'; // Para eliminar imagen de Storage
import appMoscasSAG from '../../credenciales';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // useFocusEffect para recargar al volver

const db = getFirestore(appMoscasSAG);
const storage = getStorage(appMoscasSAG); // Inicializa Storage

// Función auxiliar para extraer la ruta de Storage desde una URL de descarga
// La misma que usamos en EditarFicha
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

  // Función para cargar las fichas eliminadas
  const fetchFichasEliminadas = async () => {
    setLoading(true);
    setError(null);
    try {
      const fichasCollectionRef = collection(db, 'fichas');
      // Consulta: donde 'deleted' es true, ordenadas por 'deletedAt' descendente
      const q = query(
        fichasCollectionRef,
        where('deleted', '==', true),
        orderBy('deletedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFichasEliminadas(data);
      console.log("Fichas en papelera cargadas:", data.length);
    } catch (e) {
      setError('Error al cargar las fichas de la papelera.');
      console.error("Error fetching deleted fichas:", e);
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect recarga los datos cada vez que la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      fetchFichasEliminadas();
      return () => {
        // Opcional: limpieza si fuera necesaria al desenfocar
      };
    }, [])
  );

  const handleRestoreFicha = async (fichaId) => {
    let confirmRestore = false;
    if (Platform.OS === 'web') {
      confirmRestore = window.confirm("¿Estás seguro de que quieres restaurar esta ficha?");
    } else {
      confirmRestore = await new Promise((resolve) => {
        Alert.alert(
          "Restaurar Ficha",
          "¿Estás seguro de que quieres restaurar esta ficha?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Restaurar", onPress: () => resolve(true) }
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        );
      });
    }

    if (!confirmRestore) {
      return;
    }

    try {
      const docRef = doc(db, 'fichas', fichaId);
      await updateDoc(docRef, {
        deleted: false,
        deletedAt: null // Opcional: limpiar el campo deletedAt
      });
      Alert.alert("Éxito", "Ficha restaurada correctamente.");
      fetchFichasEliminadas(); // Recargar la lista
    } catch (e) {
      Alert.alert("Error", `No se pudo restaurar la ficha: ${e.message}`);
      console.error("Error restoring ficha:", e);
    }
  };

  const handlePermanentDelete = async (fichaId, imageUrl) => {
    let confirmPermanentDelete = false;
    if (Platform.OS === 'web') {
      confirmPermanentDelete = window.confirm("¡ATENCIÓN! ¿Estás seguro de que quieres eliminar esta ficha PERMANENTEMENTE? Esta acción no se puede deshacer.");
    } else {
      confirmPermanentDelete = await new Promise((resolve) => {
        Alert.alert(
          "Eliminar Permanentemente",
          "¡ATENCIÓN! ¿Estás seguro de que quieres eliminar esta ficha PERMANENTEMENTE? Esta acción NO se puede deshacer.",
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Eliminar", onPress: () => resolve(true), style: "destructive" }
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        );
      });
    }

    if (!confirmPermanentDelete) {
      return;
    }

    try {
      // 1. Eliminar la imagen asociada de Storage (si existe)
      if (imageUrl) {
        const imagePath = getStoragePathFromUrl(imageUrl);
        if (imagePath) {
          const imageRef = ref(storage, imagePath);
          try {
            await deleteObject(imageRef);
            console.log("Imagen asociada eliminada de Storage:", imagePath);
          } catch (deleteError) {
            if (deleteError.code !== 'storage/object-not-found') {
              console.warn("Advertencia: No se pudo eliminar la imagen asociada de Storage (procediendo con la eliminación de la ficha):", deleteError);
            } else {
              console.log("Imagen asociada no encontrada en Storage.");
            }
          }
        }
      }

      // 2. Eliminar el documento de Firestore
      const docRef = doc(db, 'fichas', fichaId);
      await deleteDoc(docRef);
      Alert.alert("Éxito", "Ficha eliminada permanentemente.");
      fetchFichasEliminadas(); // Recargar la lista
    } catch (e) {
      Alert.alert("Error", `No se pudo eliminar la ficha permanentemente: ${e.message}`);
      console.error("Error permanently deleting ficha:", e);
    }
  };

  const renderItem = ({ item }) => {
    const deletedDate = item.deletedAt && typeof item.deletedAt.toDate === 'function'
      ? item.deletedAt.toDate().toLocaleDateString('es-ES')
      : 'N/A';

    return (
      <View style={styles.fichaCard}>
        <Text style={styles.cardTitle}>N° Trampa: {item.n_trampa || 'N/A'}</Text>
        <Text style={styles.cardDetail}>Oficina: {item.oficina || 'N/A'}</Text>
        <Text style={styles.cardDetail}>Eliminada el: {deletedDate}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButtonRestore}
            onPress={() => handleRestoreFicha(item.id)}
          >
            <Text style={styles.actionButtonText}>Restaurar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonDelete}
            onPress={() => handlePermanentDelete(item.id, item.imageUrl)}
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
    borderLeftColor: '#D32F2F', // Rojo para indicar eliminado
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
    backgroundColor: '#4CAF50', // Verde para restaurar
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  actionButtonDelete: {
    backgroundColor: '#F44336', // Rojo para eliminar permanentemente
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