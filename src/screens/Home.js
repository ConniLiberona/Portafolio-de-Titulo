import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'

export default function Home() {
  const navigation = useNavigation()

//Agregar ruta en los Navigate!!!!  
  return (
    <>

    <View style={styles.container}>
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('')}>
      <Text style={styles.buttonText}>Mapa - Visualizar Trampas</Text>
    </TouchableOpacity>
    </View>

    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NuevaFicha')}>
        <Text style={styles.buttonText}>Agregar Nueva Ficha</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.container}>
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('')}>
      <Text style={styles.buttonText}>Listado de Fichas</Text>
    </TouchableOpacity>
    </View>
    <View style={styles.container}>
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('')}>
      <Text style={styles.buttonText}>Solicitudes Enviadas</Text>
    </TouchableOpacity>
    </View>
    <View style={styles.container}>
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('')}>
      <Text style={styles.buttonText}>Configuración</Text>
    </TouchableOpacity>
    </View>
  </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center', // corregido typo: "alightItems" → "alignItems"
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    marginBottom: 30,
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
})
