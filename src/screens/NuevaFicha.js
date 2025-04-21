import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity, Alert } from 'react-native';

export default function NuevaFicha(){


    return (
        <>
        <View style={styles.cajaTexto}>
            <TextInput placeholder='Región' style={{paddingHorizontal:15}}/>
        </View>
        </>
        
        );
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
      borderRadius: 25,
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
    cajaTexto:{
        paddingVertical:20,
        backgroundColor:'#cccccc90',
        marginVertical:10
    },
  })