import { StyleSheet, Text, View, TextInput, ScrollView, Button, Alert, TouchableOpacity} from 'react-native';
import appMoscasSAG from '../../credenciales'
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

const db = getFirestore(appMoscasSAG)

export default function ListaFichas(props){

    const [lista, setLista] = useState([])

    useEffect(() => {
        const getLista = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'fichas'))
                const docs = []
                querySnapshot.forEach((doc) => {
                    const { id_ficha, region } = doc.data()
                    docs.push({
                        id: doc.id,
                        id_ficha,
                        region,
                    })
                })
                setLista(docs);                
            } catch (error) {
                console.log(error);
            }
        }
        getLista()
    }, [])

    return (
        <ScrollView>
            <View style={styles.container}>
                {lista.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                        <Text style={styles.itemText}>{item.id_ficha}</Text>
                        <Text style={styles.subItemText}>{item.region}</Text>
                    </View>
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
    }
});
