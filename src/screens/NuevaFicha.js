import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales'; // Asegúrate que la ruta a tus credenciales es correcta
import { useNavigation } from '@react-navigation/native';

// Importaciones condicionales para el DatePicker
let DatePickerWeb;
let DateTimePickerNative;

if (Platform.OS === 'web') {
  DatePickerWeb = require('react-datepicker').default;
  // Importa el CSS aquí para web.
  require('react-datepicker/dist/react-datepicker.css');
} else {
  DateTimePickerNative = require('@react-native-community/datetimepicker').default;
}

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
    fecha: new Date(), // Inicializar con la fecha actual como objeto Date
    actividad: '',
    prospector: '',
    localizacion: '',
    observaciones: '',
  };

  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Estado para el DatePicker nativo
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  // Estado para controlar si el DatePicker web está abierto (para el margen dinámico)
  const [isDatePickerWebOpen, setIsDatePickerWebOpen] = useState(false);

  const handleChangeText = (value, name) => {
    setState({ ...state, [name]: value });
  };

  const handleCheckboxChange = (name) => {
    setState((prevState) => ({
      ...prevState,
      [name]: !prevState[name],
    }));
  };

  // Función para mostrar el DatePicker nativo
  const handleShowNativeDatePicker = () => {
    setShowNativeDatePicker(true);
  };

  // Función para el cambio de fecha del DatePicker nativo
  const onNativeDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || state.fecha;
    setShowNativeDatePicker(Platform.OS === 'ios');
    setState((prevState) => ({
      ...prevState,
      fecha: currentDate,
    }));
  };

  // Función para el cambio de fecha del DatePicker web (directamente el objeto Date)
  const onWebDateChange = (date) => {
    if (date instanceof Date && !isNaN(date.getTime())) {
      setState((prevState) => ({
        ...prevState,
        fecha: date,
      }));
    } else {
      console.warn("Fecha seleccionada no válida en web:", date);
    }
    setIsDatePickerWebOpen(false); // Cierra el calendario después de seleccionar
  };

  const saveFicha = async () => {
    // --- Inicio de la Validación de Campos ---
    // Validar campos de texto y numéricos como obligatorios
    if (
        !state.region.trim() || isNaN(Number(state.region)) ||
        !state.oficina.trim() ||
        !state.cuadrante.trim() || isNaN(Number(state.cuadrante)) ||
        !state.subcuadrante.trim() || isNaN(Number(state.subcuadrante)) ||
        !state.ruta.trim() ||
        !state.n_trampa.trim() || isNaN(Number(state.n_trampa)) ||
        !state.actividad.trim() ||
        !state.prospector.trim() ||
        !state.localizacion.trim()
    ) {
      Alert.alert('Error', 'Por favor, complete todos los campos obligatorios (los campos numéricos deben ser números válidos).');
      return;
    }

    // Validar la fecha por separado para un mensaje más específico si falla
    if (!state.fecha || !(state.fecha instanceof Date) || isNaN(state.fecha.getTime())) {
        Alert.alert('Error', 'Por favor, seleccione una fecha válida.');
        return;
    }
    // --- Fin de la Validación de Campos ---

    setLoading(true);

    try {
      // Prepara los datos para guardar, convirtiendo los campos numéricos a tipo Number
      const dataToSave = { ...state };
      dataToSave.region = Number(dataToSave.region);
      dataToSave.cuadrante = Number(dataToSave.cuadrante);
      dataToSave.subcuadrante = Number(dataToSave.subcuadrante);
      dataToSave.n_trampa = Number(dataToSave.n_trampa);

      console.log("Datos a guardar en Firestore:", {
        ...dataToSave, // Loguea los datos ya convertidos
        // Opcional: Si quieres ver cómo Firestore lo interpretaría como Timestamp, puedes añadirlo así:
        fecha: dataToSave.fecha instanceof Date && !isNaN(dataToSave.fecha.getTime())
          ? Timestamp.fromDate(dataToSave.fecha)
          : null,
      });

      // El SDK de Firestore convertirá automáticamente el objeto Date (dataToSave.fecha) a Timestamp.
      const docRef = await addDoc(collection(db, 'fichas'), dataToSave);

      console.log('Documento escrito con ID: ', docRef.id);
      Alert.alert('Alerta', 'Guardado con éxito');
      // Reiniciar el estado después de guardar para limpiar el formulario
      setState(initialState);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error al guardar la ficha:', error);
      Alert.alert('Error', `No se pudo guardar la ficha: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para formatear la fecha para visualización
  const formatDate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''; // Manejo robusto de fecha inválida
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Meses son 0-index
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
        <View style={{ width: '48%' }} /> {/* Espacio vacío para balancear el layout */}
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
        {/* Aquí el contenedor del DatePicker con el margen condicional */}
        <View style={[styles.item, styles.datePickerContainerWeb, isDatePickerWebOpen && styles.datePickerOpenMargin]}>
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
  inputTouchable: {
    flex: 1,
  },
  datePickerContainerWeb: {
    position: 'relative',
    zIndex: 1000,
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
    marginBottom: 220,
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
});