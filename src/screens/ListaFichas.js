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
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  listItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  itemText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subItemText: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
});