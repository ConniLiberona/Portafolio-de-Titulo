import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native'; // Importa Platform
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales'; // Asegúrate de la ruta correcta
import { useNavigation } from '@react-navigation/native';

const db = getFirestore(appMoscasSAG);

export default function DetalleFicha({ route }) {
  const { fichaId } = route.params;
  console.log('fichaId recibido en DetalleFicha:', fichaId);
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchFicha = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'fichas', fichaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFicha(docSnap.data());
        } else {
          setError('Ficha no encontrada');
        }
      } catch (e) {
        setError('Error al cargar la ficha');
        console.error('Error fetching ficha:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchFicha();
  }, [fichaId]);

  // Función para eliminar la ficha
  const handleDeleteFicha = async () => {
    let confirmDeletion = false;

    if (Platform.OS === 'web') {
      // Usar window.confirm para web
      confirmDeletion = window.confirm("¿Estás seguro de que quieres eliminar esta ficha?");
    } else {
      // Usar Alert.alert para iOS/Android (el comportamiento nativo es más robusto)
      await new Promise((resolve) => {
        Alert.alert(
          "Eliminar Ficha",
          "¿Estás seguro de que quieres eliminar esta ficha?",
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => resolve(false) // Resuelve con false si cancela
            },
            {
              text: "Eliminar",
              onPress: () => resolve(true), // Resuelve con true si confirma
              style: "destructive"
            }
          ],
          { cancelable: true, onDismiss: () => resolve(false) } // Manejar el dismiss (clic fuera)
        );
      }).then(result => {
        confirmDeletion = result;
      });
    }

    if (!confirmDeletion) {
      return; // Si el usuario canceló la eliminación
    }

    // Si la eliminación fue confirmada
    try {
      console.log('Intentando eliminar ficha con ID:', fichaId);
      await deleteDoc(doc(db, 'fichas', fichaId));
      Alert.alert("Éxito", "Ficha eliminada correctamente."); // Esta alerta funcionará en ambos casos
      navigation.goBack(); // O navigation.navigate('ListaFichas');
    } catch (e) {
      Alert.alert("Error", `No se pudo eliminar la ficha: ${e.message}`);
      console.error("Error al eliminar ficha:", e);
    }
  };


  // Función para modificar la ficha
  const handleModifyFicha = () => {
    navigation.navigate('EditarFicha', { fichaId: fichaId, currentFichaData: ficha });
  };

  // Función auxiliar para formatear la fecha si es un objeto Timestamp
  const formatValue = (key, value) => {
    if (key === 'fecha' && value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (value === null || typeof value === 'undefined' || value === '') {
        return 'N/A';
    }
    return value.toString();
  };

  // Función para capitalizar las claves de forma más legible
  const formatKey = (key) => {
    return key.replace(/_/g, ' ')
               .replace(/\b\w/g, char => char.toUpperCase());
  };


  if (loading) {
    return <Text style={styles.messageText}>Cargando detalles de la ficha...</Text>;
  }

  if (error) {
    return <Text style={styles.messageText}>Error: {error}</Text>;
  }

  if (!ficha) {
    return <Text style={styles.messageText}>No se encontraron detalles para esta ficha.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de Ficha</Text>
      {Object.entries(ficha).map(([key, value]) => (
        <View key={key} style={styles.detailItem}>
          <Text style={styles.label}>{formatKey(key)}:</Text>
          <Text style={styles.value}>{formatValue(key, value)}</Text>
        </View>
      ))}

      {/* Botones de acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.modifyButton]} onPress={handleModifyFicha}>
          <Text style={styles.buttonText}>Modificar Ficha</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteFicha}>
          <Text style={styles.buttonText}>Eliminar Ficha</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#37474F',
    textAlign: 'center',
  },
  detailItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#607D8B',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  value: {
    fontSize: 16,
    color: '#424242',
  },
  messageText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  modifyButton: {
    backgroundColor: '#FFC107',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});