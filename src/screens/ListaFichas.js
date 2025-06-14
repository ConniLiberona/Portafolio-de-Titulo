import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { getFirestore, collection, getDocs, doc, query, orderBy, where } from 'firebase/firestore'; // Importa 'where'
import appMoscasSAG from '../../credenciales';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const db = getFirestore(appMoscasSAG);

export default function ListaFichas() {
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  // Función para cargar las fichas de Firestore
  const fetchFichas = async () => {
    setLoading(true);
    setError(null);
    try {
      const fichasCollection = collection(db, 'fichas');
      // Consulta: Ordena por n_trampa ascendente y EXCLUYE las fichas marcadas como eliminadas
      const q = query(
        fichasCollection,
        where('deleted', '==', false), // <--- CAMBIO CLAVE AQUÍ: Solo fichas no eliminadas
        orderBy('n_trampa', 'asc')
      );
      const fichasSnapshot = await getDocs(q);
      const fichasList = fichasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFichas(fichasList);
      console.log("Fichas activas cargadas:", fichasList.length); // Para depuración
    } catch (e) {
      setError('Error al cargar las fichas.');
      console.error("Error fetching documents: ", e);
    } finally {
      setLoading(false);
    }
  };

  // Usa useFocusEffect para recargar los datos cada vez que la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      fetchFichas();
      return () => {
        // Limpieza si fuera necesaria, por ejemplo, cancelar listeners de Firestore
      };
    }, [])
  );

  // Función para manejar la navegación al detalle de una ficha
  const handlePressFicha = (fichaId, currentFichaData) => {
    navigation.navigate('DetalleFicha', { fichaId: fichaId, currentFichaData: currentFichaData });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E15252" />
        <Text style={styles.messageText}>Cargando fichas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.messageText}>Error: {error}</Text>
      </View>
    );
  }

  if (fichas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.messageText}>No hay fichas activas registradas.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listado de Fichas</Text>
      <FlatList
        data={fichas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.fichaItem}
            onPress={() => handlePressFicha(item.id, item)}
          >
            <Text style={styles.fichaText}>N° Trampa: {item.n_trampa || 'N/A'}</Text>
            {/* Puedes añadir más detalles si lo deseas */}
            {/* <Text style={styles.fichaDetail}>Ruta: {item.ruta}</Text> */}
            {/* <Text style={styles.fichaDetail}>Oficina: {item.oficina}</Text> */}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#2E7D32',
    textAlign: 'center',
  },
  fichaItem: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fichaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  fichaDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  messageText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});