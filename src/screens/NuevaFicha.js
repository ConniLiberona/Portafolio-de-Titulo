import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Button, Alert} from 'react-native';
import appMoscasSAG from '../../credenciales'
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, getDoc, setDoc} from 'firebase/firestore';

const db = getFirestore(appMoscasSAG)

export default function NuevaFicha(props) {

  const initialState = {
    id_ficha: '',
    region: '',
  }

  const [state, setState] = useState(initialState)

  const handleChangeText = (value, name) =>{
    setState({...state, [name]:value})
  }

  const saveFicha = async() =>{
    try{
      await addDoc(collection(db, 'fichas'),{
          ...state
      });
      Alert.alert('Alerta',"Guardado con exito")
      props.navigation.navigate('Home')
    }
    catch (error){
      console.error(error)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
  <View style={styles.cajaTexto}>
    <TextInput
      placeholder="ID Ficha"
      style={{ paddingHorizontal: 15 }}
      onChangeText={(value)=>handleChangeText(value, 'id_ficha')} 
      value={state.id_ficha}
    />
  </View>

  <View style={styles.cajaTexto}>
    <TextInput
      placeholder="Región"
      style={{ paddingHorizontal: 15 }}
      onChangeText={(value)=>handleChangeText(value, 'region')} 
      value={state.region}
    />
  </View>

  <View>
    <Button title='Guardar Ficha' onPress={saveFicha}/>
  </View> 


</ScrollView>

  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  cajaTexto: {
    paddingVertical: 20,
    backgroundColor: '#cccccc90',
    marginVertical: 10,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#E15252',
    paddingVertical: 15,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});
