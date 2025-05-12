import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import appMoscasSAG from '../../credenciales';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native'; // Importa useNavigation

const db = getFirestore(appMoscasSAG);

export default function ListaFichas() {
  const [lista, setLista] = useState([]);
  const navigation = useNavigation(); // Obtén la función navigation

  useEffect(() => {
    const getLista = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'fichas'));
        const docs = [];
        querySnapshot.forEach((doc) => {
          const { id_ficha, region } = doc.data();
          docs.push({
            id: doc.id,
            id_ficha
          });
        });
        setLista(docs);
      } catch (error) {
        console.log(error);
      }
    };
    getLista();
  }, []);

  const handleFichaPress = (fichaId) => {
    // Navega a la pantalla de detalles de la ficha, pasando el ID
    navigation.navigate('DetalleFicha', { fichaId: fichaId });
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Listado de Fichas</Text>
        {lista.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.listItem}
            onPress={() => handleFichaPress(item.id)} // Llama a la función al presionar
          >
            <Text style={styles.itemText}>{item.id_ficha}</Text>
            <Text style={styles.subItemText}>{item.region}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#f4f4f4', // Un fondo gris muy claro
      paddingHorizontal: 20,
      paddingTop: 30,
  },
  title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 35,
      color: '#37474F', // Un gris azulado oscuro elegante
      textAlign: 'center',
  },
  listItem: {
      backgroundColor: '#FFFFFF',
      paddingVertical: 20,
      paddingHorizontal: 25,
      borderRadius: 12, // Bordes más redondeados para suavidad
      marginBottom: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 }, // Sombra más pronunciada
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  itemText: {
      fontSize: 20,
      fontWeight: '600', // Un peso ligeramente menor que 'bold' para elegancia
      color: '#263238', // Otro tono gris azulado oscuro
  },
  arrowIcon: {
      fontSize: 24,
      color: '#546E7A', // Un gris azulado más claro para el icono
  },
});