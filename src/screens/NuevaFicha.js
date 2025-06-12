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
  ActivityIndicator, // <--- Importar ActivityIndicator para el estado de carga
} from 'react-native';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import appMoscasSAG from '../../credenciales';
import { useNavigation } from '@react-navigation/native';
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
    huso: '19',
    fecha: new Date(),
    actividad: '',
    prospector: '',
    localizacion: '',
    observaciones: '',
  };

  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const [image, setImage] = useState(null);

  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [isDatePickerWebOpen, setIsDatePickerWebOpen] = useState(false);

  useEffect(() => {
    console.log('El estado de la imagen ha cambiado a:', image ? 'Imagen seleccionada' : 'No hay imagen');
  }, [image]);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Usar MediaTypeOptions.Images
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
        setImage(null); // Asegúrate de limpiar la imagen si se cancela
      } else {
        console.warn('Selección de imagen fallida o sin assets.');
        setImage(null);
      }
    } catch (error) {
      console.error('Error al intentar seleccionar la imagen:', error);
      Alert.alert('Error', 'Ocurrió un error al intentar abrir el selector de imágenes.');
      setImage(null);
    }
    console.log('--- Fin del proceso de selección de imagen ---');
  };

  const uploadImage = async (uri) => {
    console.log('--- Iniciando subida de imagen a Firebase Storage ---');
    console.log('URI de la imagen a subir:', uri);
    try {
      if (!uri) {
        console.warn('URI de imagen no proporcionada para la subida.');
        Alert.alert('Error de subida', 'No se encontró la imagen para subir.');
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
    setIsDatePickerWebOpen(false);
  };

  const saveFicha = async () => {
    console.log('--- Iniciando proceso de guardado de ficha ---');
    console.log('Estado actual de la ficha antes de validación:', state);
    console.log('Imagen seleccionada antes de validación:', image);

    // Validación de Campos
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

    if (!image) {
      Alert.alert('Advertencia', 'Por favor, selecciona una imagen antes de guardar la ficha.');
      console.warn('Validación fallida: No hay imagen seleccionada.');
      return;
    }

    setLoading(true);
    Alert.alert('Guardando...', 'Subiendo imagen y guardando ficha, por favor espera.', [{ text: 'OK', onPress: () => console.log('Alerta de guardado cerrada.') }]);
    console.log('Estado de carga activado.');

    let imageUrl = null;
    try {
      imageUrl = await uploadImage(image);
      if (!imageUrl) {
        console.error('La URL de la imagen es nula después de intentar subirla.');
        Alert.alert('Error', 'No se pudo obtener la URL de la imagen. La ficha no se guardará.');
        setLoading(false);
        return;
      }
      console.log('URL de la imagen para la ficha:', imageUrl);
    } catch (uploadError) {
      console.error('Error crítico al subir la imagen en saveFicha:', uploadError);
      Alert.alert('Error', 'Ocurrió un problema irrecuperable al subir la imagen. La ficha no se guardará.');
      setLoading(false);
      return;
    }

    try {
      const dataToSave = { ...state };
      dataToSave.region = Number(dataToSave.region);
      dataToSave.cuadrante = Number(dataToSave.cuadrante);
      dataToSave.subcuadrante = Number(dataToSave.subcuadrante);
      dataToSave.n_trampa = Number(dataToSave.n_trampa);
      dataToSave.imageUrl = imageUrl;
      dataToSave.createdAt = Timestamp.fromDate(new Date()); // Añadir timestamp de creación

      // Convertir la fecha a un Timestamp de Firestore
      if (dataToSave.fecha instanceof Date && !isNaN(dataToSave.fecha.getTime())) {
        dataToSave.fecha = Timestamp.fromDate(dataToSave.fecha);
      } else {
        console.warn('La fecha no es un objeto Date válido o está vacía, no se convertirá a Timestamp.');
        delete dataToSave.fecha; // Eliminar la fecha inválida para evitar errores en Firestore
      }

      console.log("Preparando datos para guardar en Firestore:", dataToSave);

      const docRef = await addDoc(collection(db, 'fichas'), dataToSave);

      console.log('Documento escrito con ID: ', docRef.id);
      Alert.alert('Éxito', 'Ficha guardada correctamente.');
      
      // Reiniciar el estado del formulario
      setState(initialState);
      setImage(null);
      console.log('Formulario y estado de imagen limpiados.');
      
      navigation.navigate('Home');
      console.log('Navegando a la pantalla Home.');

    } catch (error) {
      console.error('Error al guardar la ficha en Firestore:', error);
      Alert.alert('Error', `No se pudo guardar la ficha: ${error.message || 'Error desconocido'}`);
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
            keyboardType="numeric"
          />
        </View>
        <View style={{ width: '48%' }} /> {/* Mantener este View vacío para alinear */}
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
          onPress={() => handleCheckboxChange('condicion_temporal')}
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
              customInput={<TextInput style={styles.inputDatePickerWeb} placeholder="DD/MM/AAAA" />}
              popperPlacement="bottom-start"
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
                    fallbackPlacements: ['top-start', 'bottom-end'],
                  },
                },
              ]}
              onCalendarOpen={() => setIsDatePickerWebOpen(true)}
              onCalendarClose={() => setIsDatePickerWebOpen(false)}
            />
          ) : (
            <TouchableOpacity onPress={handleShowNativeDatePicker} style={styles.inputTouchable}>
              <TextInput
                style={styles.input}
                value={formatDate(state.fecha)}
                placeholder="DD/MM/AAAA"
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
          />
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Localización:</Text>
          <TextInput
            style={styles.input}
            onChangeText={(value) => handleChangeText(value, 'localizacion')}
            value={state.localizacion}
            placeholder="Ingrese Localización"
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
          multiline={true}
          numberOfLines={4}
        />
      </View>

      {/* Sección de Selección de Imagen */}
      <Text style={styles.sectionTitle}>Imagen de la Ficha</Text>
      <View style={styles.imagePickerContainer}>
        <Button title="Seleccionar Imagen" onPress={pickImage} color="#E15252" disabled={loading} />
        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="contain" />
            {/* Opcional: Muestra la URI para depuración */}
            {/* <Text style={styles.imageUriText}>URI: {image}</Text> */}
          </View>
        )}
      </View>
      {/* Fin Sección de Selección de Imagen */}

      <TouchableOpacity style={styles.button} onPress={saveFicha} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar Ficha'}</Text>
      </TouchableOpacity>
      {loading && ( // Mostrar indicador de actividad solo cuando loading es true
        <ActivityIndicator size="large" color="#E15252" style={styles.activityIndicator} />
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
  inputTouchable: {
    flex: 1,
  },
  datePickerContainerWeb: {
    position: 'relative',
    // zIndex: 1000, // No es necesario si se maneja el margen
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
    marginBottom: 220, // Ajusta este valor si el DatePicker sigue siendo cubierto
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
  // Estilos para la sección de imagen
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
    // Corrección para shadow* warnings en React Native Web
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
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    // resizeMode: 'contain', <-- Ahora es una prop, no en style
  },
  activityIndicator: {
    marginTop: 20,
  },
});