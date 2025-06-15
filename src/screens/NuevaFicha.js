// src/screens/NuevaFicha.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
    Image,
    Button,
    ActivityIndicator,
} from 'react-native';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import appMoscasSAG from '../../credenciales';
import { useNavigation } from '@react-navigation/native'; // Mantener esto si `NuevaFicha` también se usa independientemente
import * as ImagePicker from 'expo-image-picker';

// Importaciones condicionales para el DatePicker
let DatePickerWeb;
let DateTimePickerNative;

if (Platform.OS === 'web') {
    DatePickerWeb = require('react-datepicker').default;
    require('react-datepicker/dist/react-datepicker.css');
} else {
    DateTimePickerNative = require('@react-native-community/datetimepicker').default;
}

// Inicializar Firestore y Storage usando la instancia de Firebase
const db = getFirestore(appMoscasSAG);
const storage = getStorage(appMoscasSAG);

// Añadimos props para recibir datos iniciales y una función para cerrar
export default function NuevaFicha({ initialNTrampa, initialCoords, onClose }) {
    const initialState = {
        region: '',
        oficina: '',
        cuadrante: '',
        subcuadrante: '',
        ruta: '',
        n_trampa: initialNTrampa ? String(initialNTrampa) : '', // Usar prop si existe
        condicion_fija: false,
        condicion_movil: false,
        condicion_temporal: false,
        huso: '19',
        fecha: new Date(),
        actividad: '',
        prospector: '',
        localizacion: initialCoords ? `Lat: ${initialCoords.lat.toFixed(6)}, Lng: ${initialCoords.lng.toFixed(6)}` : '', // Usar coords si existen
        observaciones: '',
        deleted: false,
        deletedAt: null,
    };

    const [state, setState] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation(); // Esto solo se usará si NuevaFicha es una pantalla de navegación

    const [image, setImage] = useState(null);

    const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
    const [isDatePickerWebOpen, setIsDatePickerWebOpen] = useState(false);

    useEffect(() => {
        console.log('El estado de la imagen ha cambiado a:', image ? 'Imagen seleccionada' : 'No hay imagen');
    }, [image]);

    // Usar useEffect para actualizar el estado si las props iniciales cambian
    useEffect(() => {
        setState(prevState => ({
            ...prevState,
            n_trampa: initialNTrampa ? String(initialNTrampa) : prevState.n_trampa,
            localizacion: initialCoords ? `Lat: ${initialCoords.lat.toFixed(6)}, Lng: ${initialCoords.lng.toFixed(6)}` : prevState.localizacion,
        }));
    }, [initialNTrampa, initialCoords]);


    const pickImage = async () => {
        console.log('--- Inicando proceso de selección de imagen ---');
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('Estado del permiso de galería:', status);
            if (status !== 'granted') {
                Alert.alert('Permiso Requerido', 'Necesitamos permiso para acceder a tu galería para subir imágenes.');
                console.warn('Permiso de galería no concedido.');
                return;
            }
        }

        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });

            console.log('Resultado completo de ImagePicker:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImageUri = result.assets[0].uri;
                console.log('Imagen seleccionada URI:', selectedImageUri);
                setImage(selectedImageUri);
            } else if (result.canceled) {
                console.log('Selección de imagen cancelada por el usuario.');
            } else {
                console.warn('Selección de imagen fallida o sin assets.');
            }
        } catch (error) {
            console.error('Error al intentar seleccionar la imagen:', error);
            Alert.alert('Error', 'Ocurrió un error al intentar abrir el selector de imágenes.');
        }
        console.log('--- Fin del proceso de selección de imagen ---');
    };

    const uploadImage = async (uri) => {
        console.log('--- Iniciando subida de imagen a Firebase Storage ---');
        console.log('URI de la imagen a subir:', uri);
        try {
            if (!uri) {
                console.warn('URI de imagen no proporcionada para la subida.');
                return null;
            }

            const response = await fetch(uri);
            const blob = await response.blob();
            console.log('Blob de imagen creado exitosamente.');

            const fileName = `ficha_image_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            const storageRef = ref(storage, `fichas_images/${fileName}`);
            console.log('Referencia de Storage creada:', storageRef.fullPath);

            console.log('Subiendo bytes de la imagen...');
            const snapshot = await uploadBytes(storageRef, blob);
            console.log('Bytes subidos correctamente. Metadatos del snapshot:', snapshot.metadata);

            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log('URL de descarga de la imagen obtenida:', downloadURL);
            return downloadURL;
        } catch (error) {
            console.error('Error detallado al subir la imagen a Firebase Storage:', error);
            Alert.alert('Error de Subida', `No se pudo subir la imagen. Detalles: ${error.message || 'Error desconocido'}. Por favor, revisa las reglas de seguridad de Firebase Storage.`);
            return null;
        }
        console.log('--- Fin del proceso de subida de imagen ---');
    };

    const handleChangeText = (value, name) => {
        setState({ ...state, [name]: value });
    };

    const handleCheckboxChange = (name) => {
        setState((prevState) => ({
            ...prevState,
            [name]: !prevState[name],
        }));
    };

    const handleShowNativeDatePicker = () => {
        setShowNativeDatePicker(true);
    };

    const onNativeDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || state.fecha;
        setShowNativeDatePicker(Platform.OS === 'ios');
        setState((prevState) => ({
            ...prevState,
            fecha: currentDate,
        }));
        console.log('Fecha nativa seleccionada:', currentDate.toLocaleDateString());
    };

    const onWebDateChange = (date) => {
        if (date instanceof Date && !isNaN(date.getTime())) {
            setState((prevState) => ({
                ...prevState,
                fecha: date,
            }));
            console.log('Fecha web seleccionada:', date.toLocaleDateString());
        } else {
            console.warn("Fecha seleccionada no válida en web:", date);
        }
        setIsDatePickerWebOpen(false); // Cierra el datepicker al seleccionar una fecha
    };

    const saveFicha = async () => {
        console.log('--- Iniciando proceso de guardado de ficha ---');
        console.log('Estado actual de la ficha antes de validación:', state);
        console.log('Imagen seleccionada antes de validación:', image);

        // Validación de Campos Obligatorios
        const numericFields = ['region', 'cuadrante', 'subcuadrante', 'n_trampa'];
        for (const field of numericFields) {
            if (!state[field].trim() || isNaN(Number(state[field]))) {
                Alert.alert('Error de Validación', `El campo "${field}" es obligatorio y debe ser un número válido.`);
                console.warn(`Validación fallida: Campo "${field}" inválido.`);
                return;
            }
        }

        const textFields = ['oficina', 'ruta', 'actividad', 'prospector', 'localizacion'];
        for (const field of textFields) {
            if (!state[field].trim()) {
                Alert.alert('Error de Validación', `El campo "${field}" es obligatorio.`);
                console.warn(`Validación fallida: Campo "${field}" vacío.`);
                return;
            }
        }

        if (!state.fecha || !(state.fecha instanceof Date) || isNaN(state.fecha.getTime())) {
            Alert.alert('Error de Validación', 'Por favor, seleccione una fecha válida.');
            console.warn('Validación fallida: Fecha inválida.');
            return;
        }

        setLoading(true);
        if (Platform.OS === 'web') {
            alert('Guardando ficha, por favor espera.');
        } else {
            Alert.alert('Guardando...', 'Guardando ficha, por favor espera.', [{ text: 'OK', onPress: () => console.log('Alerta de guardado cerrada.') }]);
        }
        console.log('Estado de carga activado.');

        let imageUrl = null;
        if (image) {
            try {
                imageUrl = await uploadImage(image);
                if (!imageUrl) {
                    console.error('La URL de la imagen es nula después de intentar subirla.');
                    if (Platform.OS === 'web') {
                        alert('Error: No se pudo obtener la URL de la imagen. La ficha no se guardará.');
                    } else {
                        Alert.alert('Error', 'No se pudo obtener la URL de la imagen. La ficha no se guardará.');
                    }
                    setLoading(false);
                    return;
                }
                console.log('URL de la imagen para la ficha:', imageUrl);
            } catch (uploadError) {
                console.error('Error crítico al subir la imagen en saveFicha:', uploadError);
                if (Platform.OS === 'web') {
                    alert('Error: Ocurrió un problema irrecuperable al subir la imagen. La ficha no se guardará.');
                } else {
                    Alert.alert('Error', 'Ocurrió un problema irrecuperable al subir la imagen. La ficha no se guardará.');
                }
                setLoading(false);
                return;
            }
        } else {
            console.log('No hay imagen seleccionada. La ficha se guardará sin imagen.');
        }

        try {
            const dataToSave = { ...state };
            dataToSave.region = Number(dataToSave.region);
            dataToSave.cuadrante = Number(dataToSave.cuadrante);
            dataToSave.subcuadrante = Number(dataToSave.subcuadrante);
            dataToSave.n_trampa = Number(dataToSave.n_trampa);
            if (imageUrl) {
                dataToSave.imageUrl = imageUrl;
            } else {
                dataToSave.imageUrl = null;
            }

            dataToSave.createdAt = Timestamp.fromDate(new Date());

            if (dataToSave.fecha instanceof Date && !isNaN(dataToSave.fecha.getTime())) {
                dataToSave.fecha = Timestamp.fromDate(dataToSave.fecha);
            } else {
                console.warn('La fecha no es un objeto Date válido o está vacía, no se convertirá a Timestamp.');
                delete dataToSave.fecha;
            }

            console.log("Preparando datos para guardar en Firestore:", dataToSave);

            const docRef = await addDoc(collection(db, 'fichas'), dataToSave);

            console.log('Documento escrito con ID: ', docRef.id);
            if (Platform.OS === 'web') {
                alert('Ficha guardada correctamente.');
            } else {
                Alert.alert('Éxito', 'Ficha guardada correctamente.');
            }

            setState(initialState); // Resetear estado
            setImage(null);
            console.log('Formulario y estado de imagen limpiados.');

            // Si se pasa una función onClose, úsala para cerrar la modal/componente
            if (onClose) {
                onClose();
            } else {
                // De lo contrario, si no hay onClose, navegar a Home (comportamiento original)
                navigation.navigate('Home');
                console.log('Navegando a la pantalla Home.');
            }

        } catch (error) {
            console.error('Error al guardar la ficha en Firestore:', error);
            if (Platform.OS === 'web') {
                alert(`Error: No se pudo guardar la ficha: ${error.message || 'Error desconocido'}`);
            } else {
                Alert.alert('Error', `No se pudo guardar la ficha: ${error.message || 'Error desconocido'}`);
            }
        } finally {
            setLoading(false);
            console.log('Proceso de guardado de ficha finalizado. Estado de carga desactivado.');
        }
    };

    const formatDate = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <ScrollView style={styles.container}>
            {/* Sección 1: Datos de Ubicación */}
            <Text style={styles.sectionTitle}>Datos de Ubicación</Text>
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Región:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'region')}
                        value={state.region}
                        placeholder="Ingrese Región"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Oficina:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'oficina')}
                        value={state.oficina}
                        placeholder="Ingrese Oficina"
                        placeholderTextColor="#888"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Cuadrante:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'cuadrante')}
                        value={state.cuadrante}
                        placeholder="Ingrese Cuadrante"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Subcuadrante:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'subcuadrante')}
                        value={state.subcuadrante}
                        placeholder="Ingrese Subcuadrante"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <View style={styles.fullWidthItem}>
                <Text style={styles.label}>Ruta:</Text>
                <TextInput
                    style={styles.input}
                    onChangeText={(value) => handleChangeText(value, 'ruta')}
                    value={state.ruta}
                    placeholder="Ingrese Ruta"
                    placeholderTextColor="#888"
                />
            </View>

            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>N° Trampa:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'n_trampa')}
                        value={state.n_trampa}
                        placeholder="Ingrese N° Trampa"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                        maxLength={9} // Asegúrate de que esta validación también esté aquí
                        editable={!initialNTrampa} // Si viene de PinCreationModal, no debería ser editable
                    />
                </View>
                <View style={{ width: '48%' }} />
            </View>

            <View style={styles.checkboxRow}>
                <Text style={styles.label}>Condición:</Text>
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
                    onPress={() => {
                        handleCheckboxChange('condicion_temporal');
                        if (Platform.OS === 'web' && isDatePickerWebOpen) {
                            setIsDatePickerWebOpen(false);
                        }
                    }}
                >
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
                <View style={[styles.item, Platform.OS === 'web' && styles.datePickerContainerWeb, isDatePickerWebOpen && Platform.OS === 'web' && styles.datePickerOpenMargin]}>
                    <Text style={styles.label}>Fecha:</Text>
                    {Platform.OS === 'web' ? (
                        <DatePickerWeb
                            selected={state.fecha}
                            onChange={onWebDateChange}
                            dateFormat="dd/MM/yyyy"
                            customInput={<TextInput style={styles.inputDatePickerWeb} placeholder="DD/MM/AAAA" placeholderTextColor="#888" />}
                            popperPlacement="bottom"
                            popperModifiers={[
                                {
                                    name: 'offset',
                                    options: {
                                        offset: [0, 5],
                                    },
                                },
                                {
                                    name: 'flip',
                                    options: {
                                        fallbackPlacements: ['top', 'top-start', 'bottom-start'],
                                    },
                                },
                                {
                                    name: 'preventOverflow',
                                    options: {
                                        enabled: true,
                                    },
                                },
                                {
                                    name: 'hide',
                                    enabled: false,
                                },
                            ]}
                            onCalendarOpen={() => setIsDatePickerWebOpen(true)}
                            onCalendarClose={() => setIsDatePickerWebOpen(false)}
                            onClickOutside={() => setIsDatePickerWebOpen(false)}
                        />
                    ) : (
                        <TouchableOpacity onPress={handleShowNativeDatePicker} style={styles.inputTouchable}>
                            <TextInput
                                style={styles.input}
                                value={formatDate(state.fecha)}
                                placeholder="DD/MM/AAAA"
                                placeholderTextColor="#888"
                                editable={false}
                            />
                        </TouchableOpacity>
                    )}
                    {showNativeDatePicker && Platform.OS !== 'web' && (
                        <DateTimePickerNative
                            testID="dateTimePicker"
                            value={state.fecha || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onNativeDateChange}
                            locale="es-ES"
                        />
                    )}
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Actividad:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'actividad')}
                        value={state.actividad}
                        placeholder="Ingrese Actividad"
                        placeholderTextColor="#888"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Prospector:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'prospector')}
                        value={state.prospector}
                        placeholder="Ingrese Prospector"
                        placeholderTextColor="#888"
                    />
                </View>
                <View style={styles.item}>
                    <Text style={styles.label}>Localización:</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={(value) => handleChangeText(value, 'localizacion')}
                        value={state.localizacion}
                        placeholder="Ingrese Localización"
                        placeholderTextColor="#888"
                        editable={!initialCoords} // Si viene de PinCreationModal, no debería ser editable
                    />
                </View>
            </View>

            <View style={styles.fullWidthItem}>
                <Text style={styles.label}>Observaciones:</Text>
                <TextInput
                    style={styles.largeInput}
                    onChangeText={(value) => handleChangeText(value, 'observaciones')}
                    value={state.observaciones}
                    placeholder="Ingrese Observaciones"
                    placeholderTextColor="#888"
                    multiline={true}
                    numberOfLines={4}
                />
            </View>

            {/* Sección de Selección de Imagen */}
            <Text style={styles.sectionTitle}>
                Imagen de la Ficha{' '}
                <Text style={styles.optionalText}>(Opcional)</Text>
            </Text>
            <View style={styles.imagePickerContainer}>
                <Button title="Seleccionar Imagen" onPress={pickImage} color="#2E7D32" disabled={loading} />
                {image && (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="contain" />
                        <TouchableOpacity onPress={() => setImage(null)} style={styles.clearImageButton}>
                            <Text style={styles.clearImageButtonText}>X Quitar Imagen</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            {/* Fin Sección de Selección de Imagen */}

            <TouchableOpacity style={styles.button} onPress={saveFicha} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar Ficha'}</Text>
            </TouchableOpacity>
            {onClose && ( // Botón para cerrar si se le pasa la prop onClose
                <TouchableOpacity style={[styles.button, styles.buttonCloseFicha]} onPress={onClose} disabled={loading}>
                    <Text style={styles.buttonText}>Cerrar Formulario</Text>
                </TouchableOpacity>
            )}
            {loading && (
                <ActivityIndicator size="large" color="#2E7D32" style={styles.activityIndicator} />
            )}
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
        color: '#2E7D32',
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
    inputTouchable: {
        flex: 1,
    },
    datePickerContainerWeb: {
        position: 'relative',
        zIndex: 10,
    },
    inputDatePickerWeb: {
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 14,
        color: '#333',
        height: 38,
        width: '100%',
    },
    datePickerOpenMargin: {
        marginBottom: 250,
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
        marginLeft: 10,
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
        backgroundColor: '#2E7D32',
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
        marginLeft: 10,
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
        backgroundColor: '#2E7D32',
        borderRadius: 6,
    },
    radioLabel: {
        fontSize: 14,
        color: '#333',
    },
    button: {
        backgroundColor: '#2E7D32',
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonCloseFicha: { // Estilo para el nuevo botón de cerrar en NuevaFicha
        backgroundColor: '#6c757d', // Un color gris para "cerrar"
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    imagePickerContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    imagePreviewContainer: {
        marginTop: 20,
        width: 250,
        height: 250,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
        ...Platform.select({
            web: {
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
            },
        }),
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    activityIndicator: {
        marginTop: 20,
    },
    clearImageButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: '#2E7D32',
        borderRadius: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    clearImageButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    optionalText: {
        fontSize: 14,
        color: '#888',
        fontWeight: 'normal',
    },
});