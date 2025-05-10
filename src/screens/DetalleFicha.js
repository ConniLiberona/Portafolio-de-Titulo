import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales'; // Asegúrate de la ruta correcta

const db = getFirestore(appMoscasSAG);

export default function DetalleFicha({ route }) {
  const { fichaId } = route.params;
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return <Text>Cargando detalles de la ficha...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  if (!ficha) {
    return <Text>No se encontraron detalles para esta ficha.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de Ficha</Text>
      {Object.entries(ficha).map(([key, value]) => (
        <View key={key} style={styles.detailItem}>
          <Text style={styles.label}>{key}:</Text>
          <Text style={styles.value}>{value ? value.toString() : 'N/A'}</Text>
        </View>
      ))}
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  detailItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
});