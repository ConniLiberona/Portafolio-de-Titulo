import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales'; // Correct import path
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

const db = getFirestore(appMoscasSAG);

export default function NuevaFicha() {
    const initialState = {
        region: '',
        oficina: '',
        cuadrante: '',
        subcuadrante: '',
        ruta: '',
        n_trampa: '',
        condicion_fija: false,
        condicion_movil: false,
        condicion_temporal: false,
        huso: '19', // Valor por defecto
        fecha: '',          // Nuevo campo
        actividad: '',      // Nuevo campo
        prospector: '',     // Nuevo campo
        localizacion: '',    // Nuevo campo
        observaciones: '',  // Nuevo campo
    };

    const [state, setState] = useState(initialState);
    const [loading, setLoading] = useState(false); // Add loading state
    const navigation = useNavigation(); // Get navigation object

    const handleChangeText = (value, name) => {
        setState({ ...state, [name]: value });
    };

    const handleCheckboxChange = (name) => {
        setState(prevState => ({
            ...prevState,
            [name]: !prevState[name],
        }));
    };

    const saveFicha = async () => {
        if (
            !state.region ||
            !state.oficina ||
            !state.cuadrante ||
            !state.subcuadrante ||
            !state.ruta ||
            !state.n_trampa ||
            !state.fecha ||  //valido los nuevos campos
            !state.actividad ||
            !state.prospector ||
            !state.localizacion
        ) {
            Alert.alert('Error', 'Todos los campos son obligatorios');
            return; // Stop if fields are empty
        }

        setLoading(true); // Start loading
        try {
            await addDoc(collection(db, 'fichas'), {
                ...state,
            });
            Alert.alert('Alerta', 'Guardado con éxito');
            navigation.navigate('Home'); // Use navigation object
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo guardar la ficha'); // improved error
        } finally {
            setLoading(false); // Stop loading
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Sección 1: Datos de Ubicación */}
            <Text style={styles.sectionTitle}>Datos de Ubicación</Text>
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Región:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'region')} value={state.region} placeholder="Ingrese Región" />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Oficina:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'oficina')} value={state.oficina} placeholder="Ingrese Oficina" />
                </View>
            </View>
    
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Cuadrante:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'cuadrante')} value={state.cuadrante} placeholder="Ingrese Cuadrante" />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Subcuadrante:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'subcuadrante')} value={state.subcuadrante} placeholder="Ingrese Subcuadrante" />
                </View>
            </View>
    
            <View style={styles.fullWidthItem}>
                <Text style={styles.label}>Ruta:</Text>
                <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'ruta')} value={state.ruta} placeholder="Ingrese Ruta" />
            </View>
    
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>N° Trampa:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'n_trampa')} value={state.n_trampa} placeholder="Ingrese N° Trampa" />
                </View>
                {/* Podemos dejar este espacio vacío si queremos mantener la estructura de dos columnas */}
                <View style={{ width: '48%' }} />
            </View>
    
            <View style={styles.checkboxRow}>
                <Text style={styles.label}>Condición:</Text>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleCheckboxChange('condicion_fija')}>
                    <View style={[styles.checkbox, state.condicion_fija && styles.checkboxActive]} />
                    <Text style={styles.checkboxLabel}>Fija</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleCheckboxChange('condicion_movil')}>
                    <View style={[styles.checkbox, state.condicion_movil && styles.checkboxActive]} />
                    <Text style={styles.checkboxLabel}>Móvil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleCheckboxChange('condicion_temporal')}>
                    <View style={[styles.checkbox, state.condicion_temporal && styles.checkboxActive]} />
                    <Text style={styles.checkboxLabel}>Temporal</Text>
                </TouchableOpacity>
            </View>
    
            <View style={styles.husoRow}>
                <Text style={styles.label}>Huso:</Text>
                <TouchableOpacity style={styles.radioContainer} onPress={() => handleChangeText('18', 'huso')}>
                    <View style={[styles.radio, state.huso === '18' && styles.radioActive]} />
                    <Text style={styles.radioLabel}>18°</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.radioContainer} onPress={() => handleChangeText('19', 'huso')}>
                    <View style={[styles.radio, state.huso === '19' && styles.radioActive]} />
                    <Text style={styles.radioLabel}>19°</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.radioContainer} onPress={() => handleChangeText('12', 'huso')}>
                    <View style={[styles.radio, state.huso === '12' && styles.radioActive]} />
                    <Text style={styles.radioLabel}>12°</Text>
                </TouchableOpacity>
            </View>
    
            {/* Sección 2: Datos de Actividad */}
            <Text style={styles.sectionTitle}>Datos de Actividad</Text>
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Fecha:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'fecha')} value={state.fecha} placeholder="DD/MM/AAAA" />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Actividad:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'actividad')} value={state.actividad} placeholder="Ingrese Actividad" />
                </View>
            </View>
    
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Prospector:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'prospector')} value={state.prospector} placeholder="Ingrese Prospector" />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Localización:</Text>
                    <TextInput style={styles.input} onChangeText={(value) => handleChangeText(value, 'localizacion')} value={state.localizacion} placeholder="Ingrese Localización" />
                </View>
            </View>
    
            <View style={styles.fullWidthItem}>
                <Text style={styles.label}>Observaciones:</Text>
                <TextInput
                    style={styles.largeInput}
                    onChangeText={(value) => handleChangeText(value, 'observaciones')}
                    value={state.observaciones}
                    placeholder="Ingrese Observaciones"
                    multiline={true}
                    numberOfLines={4}
                />
            </View>
    
            <TouchableOpacity style={styles.button} onPress={saveFicha} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar Ficha'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 15,
        paddingBottom: 30,
        backgroundColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#E15252',
        textAlign: 'left',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'center',
    },
    item: {
        width: '48%',
        marginBottom: 8,
    },
    label: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#444',
        marginBottom: 3,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 14,
        color: '#333',
        height: 38,
    },
    fullWidthItem: {
        width: '100%',
        marginBottom: 8,
    },
    largeInput: {
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 14,
        color: '#333',
        height: 70,
        textAlignVertical: 'top',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        marginLeft: 10, // Añadimos un margen izquierdo
    },
    checkbox: {
        width: 16,
        height: 16,
        borderWidth: 2,
        borderColor: '#555',
        borderRadius: 4,
        marginRight: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: '#E15252',
        borderRadius: 4,
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
    },
    husoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
        marginLeft: 10, // Añadimos un margen izquierdo
    },
    radio: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#555',
        marginRight: 4,
    },
    radioActive: {
        backgroundColor: '#E15252',
        borderRadius: 6,
    },
    radioLabel: {
        fontSize: 14,
        color: '#333',
    },
    button: {
        backgroundColor: '#E15252',
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
