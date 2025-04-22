import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView } from 'react-native';

export default function NuevaFicha() {
  const [newItem, setNewItem] = useState({
    id_ficha: 0,
    region: 0,
    oficina: '',
    ruta: '',
    cuadrante: 0,
    subcuadrante: 0,
    condicion: 0,
    huso: 0,
    n_trampa: 0,
    fecha_vigencia: '',
    fecha: new Date(),
    actividad: '',
    procpectoria: '',
    localizacion: '',
    observaciones: '',
    codigo: 0,
    version: '',
    datum: '',
    modelo: '',
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {[
        ['id_ficha', 'ID Ficha'],
        ['region', 'Región'],
        ['oficina', 'Oficina'],
        ['ruta', 'Ruta'],
        ['cuadrante', 'Cuadrante'],
        ['subcuadrante', 'Subcuadrante'],
        ['condicion', 'Condición'],
        ['huso', 'Huso'],
        ['n_trampa', 'N° de Trampa'],
        ['fecha_vigencia', 'Fecha Vigencia'],
        ['fecha', 'Fecha'],
        ['actividad', 'Actividad'],
        ['procpectoria', 'Procpectoria'],
        ['localizacion', 'Localización'],
        ['observaciones', 'Observaciones'],
        ['codigo', 'Código'],
        ['version', 'Versión'],
        ['datum', 'Datum'],
        ['modelo', 'Modelo'],
      ].map(([key, placeholder]) => (
        <View style={styles.cajaTexto} key={key}>
          <TextInput
            placeholder={placeholder}
            style={{ paddingHorizontal: 15 }}
            onChangeText={(text) => setNewItem({ ...newItem, [key]: text })}
          />
        </View>
      ))}
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
});
