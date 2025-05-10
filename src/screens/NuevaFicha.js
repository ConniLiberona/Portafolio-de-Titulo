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
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Región:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'region')}
                        value={state.region}
                        placeholder="Ingrese Región"
                    />
                </View>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Oficina:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'oficina')}
                        value={state.oficina}
                        placeholder="Ingrese Oficina"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Cuadrante:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'cuadrante')}
                        value={state.cuadrante}
                        placeholder="Ingrese Cuadrante"
                    />
                </View>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Subcuadrante:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'subcuadrante')}
                        value={state.subcuadrante}
                        placeholder="Ingrese Subcuadrante"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Ruta:</Text>
                </View>
                <View style={styles.largeInputContainer}>
                    <TextInput
                        style={styles.largeInput}
                        onChangeText={(value) => handleChangeText(value, 'ruta')}
                        value={state.ruta}
                        placeholder="Ingrese Ruta"
                    />
                </View>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>N° Trampa:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'n_trampa')}
                        value={state.n_trampa}
                        placeholder="Ingrese N° Trampa"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Condición:</Text>
                </View>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleCheckboxChange('condicion_fija')}
                >
                    <View style={[styles.checkbox, state.condicion_fija && styles.checkboxActive]} />
                    <Text style={styles.checkboxLabel}>Fija</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleCheckboxChange('condicion_movil')}
                >
                    <View style={[styles.checkbox, state.condicion_movil && styles.checkboxActive]} />
                    <Text style={styles.checkboxLabel}>Móvil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleCheckboxChange('condicion_temporal')}
                >
                    <View style={[styles.checkbox, state.condicion_temporal && styles.checkboxActive]} />
                    <Text style={styles.checkboxLabel}>Temporal</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Huso:</Text>
                </View>
                <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => handleChangeText('18', 'huso')}
                >
                    <View style={[styles.radio, state.huso === '18' && styles.radioActive]} />
                    <Text style={styles.radioLabel}>18°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => handleChangeText('19', 'huso')}
                >
                    <View style={[styles.radio, state.huso === '19' && styles.radioActive]} />
                    <Text style={styles.radioLabel}>19°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.radioContainer}
                    onPress={() => handleChangeText('12', 'huso')}
                >
                    <View style={[styles.radio, state.huso === '12' && styles.radioActive]} />
                    <Text style={styles.radioLabel}>12°</Text>
                </TouchableOpacity>
            </View>

            {/* Sección 2: Datos de Actividad */}
            <Text style={styles.sectionTitle}>Datos de Actividad</Text>
            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Fecha:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'fecha')}
                        value={state.fecha}
                        placeholder="DD/MM/AAAA"
                    />
                </View>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Actividad:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'actividad')}
                        value={state.actividad}
                        placeholder="Ingrese Actividad"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Prospector:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'prospector')}
                        value={state.prospector}
                        placeholder="Ingrese Prospector"
                    />
                </View>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Localización:</Text>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'localizacion')}
                        value={state.localizacion}
                        placeholder="Ingrese Localización"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Observaciones:</Text>
                </View>
                <View style={styles.largeInputContainer}>
                    <TextInput
                        style={styles.largeInput}
                        onChangeText={(value) => handleChangeText(value, 'observaciones')}
                        value={state.observaciones}
                        placeholder="Ingrese Observaciones"
                        multiline={true}  //habilito multiline
                        numberOfLines={4} //defino cuantas lineas quiero que se vean por defecto
                    />
                </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={saveFicha} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar Ficha'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 30,
        marginBottom: 10,
        color: '#E15252',
        textAlign: 'left',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    labelContainer: {
        flex: 0.4,
        marginRight: 10,
    },
    label: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#444',
    },
    inputContainer: {
        flex: 0.6,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    input: {
        fontSize: 16,
        color: '#333',
        height: 40,
    },
    largeInputContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    largeInput: {
        fontSize: 16,
        color: '#333',
        height: 40,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 2,
        borderColor: '#555',
        borderRadius: 5,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: '#E15252',
        borderRadius: 5,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#333',
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#555',
        marginRight: 5,
    },
    radioActive: {
        backgroundColor: '#E15252',
        borderRadius: 9,
    },
    radioLabel: {
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#E15252',
        paddingVertical: 15,
        borderRadius: 10,
        marginTop: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputMultiline: {
        fontSize: 16,
        color: '#333',
        height: 80,
        textAlignVertical: 'top',
    },
});
