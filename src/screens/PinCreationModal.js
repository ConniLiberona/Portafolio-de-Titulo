import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import NuevaFicha from './NuevaFicha'; // Importa el componente NuevaFicha

const { width, height } = Dimensions.get('window');

// Estados válidos para el pin
const validPinStates = [
    'Activa',
    'Próxima a vencer',
    'Vencida',
    'Inactiva/Retirada',
    'Requiere revisión',
];

// Función para obtener el color asociado a cada estado
const getStateColor = (estado) => {
    switch (estado) {
        case 'Activa': return '#4CAF50'; // Verde
        case 'Próxima a vencer': return '#FFC107'; // Amarillo
        case 'Vencida': return '#F44336'; // Rojo
        case 'Inactiva/Retirada': return '#9E9E9E'; // Gris
        case 'Requiere revisión': return '#2196F3'; // Azul
        default: return '#007bff'; // Azul por defecto (si no hay coincidencia)
    }
};

export default function PinCreationModal({ visible, onClose, onSave, coords }) {
    const [description, setDescription] = useState('');
    const [selectedEstado, setSelectedEstado] = useState(validPinStates?.[0] || '');
    const [nTrampa, setNTrampa] = useState(''); // Estado para el número de trampa
    const [showNuevaFicha, setShowNuevaFicha] = useState(false); // Nuevo estado para controlar la visibilidad de NuevaFicha

    useEffect(() => {
        if (visible) {
            setDescription('');
            setSelectedEstado(validPinStates?.[0] || '');
            setNTrampa(''); // Limpiar el campo del número de trampa al abrir
            setShowNuevaFicha(false); // Asegurarse de que NuevaFicha esté oculta al abrir la modal de pin
        }
    }, [visible, validPinStates]);

    const handleSave = () => {
        if (description.trim() === '') {
            alert('La descripción no puede estar vacía.');
            return;
        }
        if (selectedEstado === '') {
            alert('Debes seleccionar un estado para la trampa.');
            return;
        }
        const cleanedNTrampa = nTrampa.trim();
        if (cleanedNTrampa.length === 0) {
            alert('El número de trampa no puede estar vacío.');
            return;
        }
        if (!/^\d{9}$/.test(cleanedNTrampa)) {
            alert('El número de trampa debe ser de 9 dígitos numéricos.');
            return;
        }

        const numeroTrampa = parseInt(cleanedNTrampa, 10);

        onSave({
            lat: coords.lat,
            lng: coords.lng,
            description: description.trim(),
            estado: selectedEstado,
            n_trampa: numeroTrampa,
        });
        onClose();
    };

    const handleCreateFicha = () => {
        // Validación mínima antes de abrir NuevaFicha
        const cleanedNTrampa = nTrampa.trim();
        if (cleanedNTrampa.length === 0 || !/^\d{9}$/.test(cleanedNTrampa)) {
            alert('Para crear una ficha, el "Número de Trampa" debe ser de 9 dígitos numéricos.');
            return;
        }
        setShowNuevaFicha(true); // Mostrar el componente NuevaFicha
    };

    const handleCloseNuevaFicha = () => {
        setShowNuevaFicha(false); // Ocultar el componente NuevaFicha
    };

    // Renderizar NuevaFicha si showNuevaFicha es true
    if (showNuevaFicha) {
        // Pasamos nTrampa y coords a NuevaFicha para pre-rellenar
        return (
            <NuevaFicha
                initialNTrampa={parseInt(nTrampa.trim(), 10)}
                initialCoords={coords}
                onClose={() => {
                    handleCloseNuevaFicha();
                    // Opcional: podrías querer cerrar también PinCreationModal aquí
                    // onClose();
                }}
                // Puedes agregar una prop onFichaSaved si necesitas hacer algo específico
                // después de que la ficha se guarda desde NuevaFicha.
                // Por ahora, simplemente cierra NuevaFicha.
            />
        );
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <ScrollView contentContainerStyle={styles.scrollViewContent}>
                        <Text style={styles.modalTitle}>Nueva Trampa</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Número de Trampa (9 dígitos):</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ej: 123456789"
                                value={nTrampa}
                                onChangeText={(text) => {
                                    const filteredText = text.replace(/[^0-9]/g, '');
                                    if (filteredText.length <= 9) {
                                        setNTrampa(filteredText);
                                    }
                                }}
                                keyboardType="numeric"
                                maxLength={9}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Descripción:</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                placeholder="Ej: Trampa Norte Campo 3"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Estado Inicial:</Text>
                            <View style={styles.radioGroup}>
                                {validPinStates.map((estado) => (
                                    <TouchableOpacity
                                        key={estado}
                                        style={styles.radioButton}
                                        onPress={() => setSelectedEstado(estado)}
                                    >
                                        <View style={[
                                            styles.radioCircle,
                                            selectedEstado === estado && styles.selectedRadioCircle,
                                        ]}>
                                            {selectedEstado === estado && (
                                                <View style={[
                                                    styles.innerRadioCircle,
                                                    { backgroundColor: getStateColor(estado) } // Color del estado
                                                ]} />
                                            )}
                                        </View>
                                        {/* Pequeño cuadro de color al lado de la etiqueta */}
                                        <View style={[
                                            styles.colorIndicator,
                                            { backgroundColor: getStateColor(estado) }
                                        ]} />
                                        <Text style={styles.radioLabel}>{estado.split('/')[0]}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={onClose}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonSave]}
                                onPress={handleSave}
                            >
                                <Text style={styles.buttonText}>Guardar Trampa</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Botón para crear ficha con emoji */}
                        <TouchableOpacity
                            style={[styles.button, styles.buttonCreateFicha]}
                            onPress={handleCreateFicha}
                        >
                            <Text style={styles.buttonText}>📝 Crear Nueva Ficha</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalView: {
        margin: 20,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        padding: 25,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        width: width * 0.9,
        maxWidth: 550,
        maxHeight: height * 0.9,
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#555',
        fontWeight: 'bold',
    },
    textInput: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        fontSize: 16,
        minHeight: 45,
        backgroundColor: 'white',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    radioGroup: {
        flexDirection: 'column',
        marginTop: 10,
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    radioCircle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#666',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        backgroundColor: '#fff',
    },
    selectedRadioCircle: {
        borderColor: '#007bff',
    },
    innerRadioCircle: {
        height: 12,
        width: 12,
        borderRadius: 6,
    },
    // Nuevo estilo para el indicador de color
    colorIndicator: {
        width: 15, // Ancho del cuadro de color
        height: 15, // Alto del cuadro de color
        borderRadius: 3, // Ligeramente redondeado
        marginRight: 8, // Espacio entre el cuadro de color y el texto
        borderWidth: 1, // Borde para mayor definición
        borderColor: '#ddd', // Color de borde sutil
    },
    radioLabel: {
        fontSize: 16,
        color: '#333',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 10,
    },
    button: {
        paddingVertical: 12,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 5,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonCancel: {
        backgroundColor: '#f44336',
    },
    buttonSave: {
        backgroundColor: '#4CAF50',
    },
    buttonCreateFicha: {
        backgroundColor: 'rgba(138, 154, 91, 0.81)',
        marginTop: 10,
        width: '100%',
        alignSelf: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});