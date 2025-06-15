import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert } from 'react-native';
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
            Alert.alert('Error', 'La descripción no puede estar vacía.'); // Usar Alert nativo
            return;
        }
        if (selectedEstado === '') {
            Alert.alert('Error', 'Debes seleccionar un estado para la trampa.');
            return;
        }
        const cleanedNTrampa = nTrampa.trim();
        if (cleanedNTrampa.length === 0) {
            Alert.alert('Error', 'El número de trampa no puede estar vacío.');
            return;
        }
        // Valida que sean exactamente 9 dígitos numéricos
        if (!/^\d{9}$/.test(cleanedNTrampa)) {
            Alert.alert('Error', 'El número de trampa debe ser de 9 dígitos numéricos.');
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
        // onClose(); // Comentado para que el usuario pueda ver el resultado o decidir qué hacer
    };

    const handleCreateFicha = () => {
        // Validación mínima antes de abrir NuevaFicha
        const cleanedNTrampa = nTrampa.trim();
        if (cleanedNTrampa.length === 0 || !/^\d{9}$/.test(cleanedNTrampa)) {
            Alert.alert('Error', 'Para crear una ficha, el "Número de Trampa" debe ser de 9 dígitos numéricos.');
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
                    // onClose(); // Descomenta si deseas que al cerrar NuevaFicha también se cierre PinCreationModal
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
                        <Text style={styles.modalCoords}>Lat: {coords?.lat.toFixed(6)}, Lng: {coords?.lng.toFixed(6)}</Text>


                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Número de Trampa (9 dígitos):</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ej: 123456789"
                                value={nTrampa}
                                onChangeText={(text) => {
                                    const filteredText = text.replace(/[^0-9]/g, ''); // Solo números
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
        alignItems: 'stretch', // Permite que los hijos tomen el 100% del ancho
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        width: width * 0.9, // Usa el 90% del ancho de la pantalla
        maxWidth: 550, // Limita el ancho máximo para pantallas grandes
        maxHeight: height * 0.9, // Limita la altura máxima para pantallas altas
        overflow: 'hidden', // Importante para que el ScrollView interno funcione correctamente
    },
    scrollViewContent: {
        flexGrow: 1, // Permite que ScrollView se expanda y sea desplazable si el contenido excede el maxHeight
        // justifyContent: 'center', // Comentado para que el contenido empiece desde arriba del scroll
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10, // Reducido un poco para ahorrar espacio
        color: '#333',
        textAlign: 'center',
    },
    modalCoords: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
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
        flexDirection: 'row', // CAMBIO: Ahora los botones de estado se organizan en fila
        flexWrap: 'wrap',     // CAMBIO: Permitirá que los botones se envuelvan a la siguiente línea
        marginTop: 10,
        justifyContent: 'flex-start', // Alinea los botones al inicio de la fila
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 5, // Reducido padding para compactar
        paddingHorizontal: 5, // Reducido padding para compactar
        marginRight: 10, // Espacio entre los botones
    },
    radioCircle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#666',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8, // Reducido espacio
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
    colorIndicator: {
        width: 15,
        height: 15,
        borderRadius: 3,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    radioLabel: {
        fontSize: 15, // Ligeramente reducido
        color: '#333',
        // flexShrink: 1, // Permite que el texto se encoja si no hay espacio
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Mejor distribución para 2 botones
        marginTop: 20,
        marginBottom: 10,
        width: '100%', // Asegura que ocupe todo el ancho
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
        marginTop: 15, // Aumentado el margen superior
        width: '100%',
        alignSelf: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center', // Centra el texto dentro del botón
    },
});