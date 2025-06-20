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
  ActivityIndicator,
} from 'react-native';
import { getFirestore, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import appMoscasSAG from '../../credenciales';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

let DatePickerWeb;
let DateTimePickerNative;

if (Platform.OS === 'web') {
  DatePickerWeb = require('react-datepicker').default;
  require('react-datepicker/dist/react-datepicker.css');
} else {
  DateTimePickerNative = require('@react-native-community/datetimepicker').default;
}

const db = getFirestore(appMoscasSAG);
const storage = getStorage(appMoscasSAG);

function getStoragePathFromUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathAndQuery = urlObj.pathname;
    const parts = pathAndQuery.split('/o/');
    if (parts.length < 2) return null;
    const encodedPath = parts[1];
    return decodeURIComponent(encodedPath);
  } catch (e) {
    console.error("Error al parsear URL de Storage:", e);
    return null;
  }
}

export default function EditarFicha({ route }) {
  const { fichaId, currentFichaData } = route.params;
  const navigation = useNavigation();

  const [state, setState] = useState(currentFichaData || {});
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [isDatePickerWebOpen, setIsDatePickerWebOpen] = useState(false);

  useEffect(() => {
    if (currentFichaData) {
      if (currentFichaData.fecha && typeof currentFichaData.fecha.toDate === 'function') {
        setState(prevState => ({
          ...prevState,
          fecha: currentFichaData.fecha.toDate(),
        }));
      } else if (currentFichaData.fecha && !(currentFichaData.fecha instanceof Date)) {
        console.warn("Fecha no es un Timestamp ni Date al cargar, valor:", currentFichaData.fecha);
      }

      setState(prevState => ({
        ...prevState,
        region: String(prevState.region || ''),
        cuadrante: String(prevState.cuadrante || ''),
        subcuadrante: String(prevState.subcuadrante || ''),
        n_trampa: String(prevState.n_trampa || ''),
      }));

      if (currentFichaData.imageUrl) {
        setCurrentImageUrl(currentFichaData.imageUrl);
      }
    }
  }, [currentFichaData]);

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
  };

  const onWebDateChange = (date) => {
    if (date instanceof Date && !isNaN(date.getTime())) {
      setState((prevState) => ({
        ...prevState,
        fecha: date,
      }));
    } else {
      console.warn("Fecha seleccionada no válida en web:", date);
    }
    setIsDatePickerWebOpen(false);
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería de imágenes para que esto funcione.');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const updateFicha = async () => {
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
      Alert.alert('Error', 'Por favor, complete todos los campos obligatorios y asegúrese de que los campos numéricos sean números válidos.');
      return;
    }

    if (!state.fecha || !(state.fecha instanceof Date) || isNaN(state.fecha.getTime())) {
      Alert.alert('Error', 'Por favor, seleccione una fecha válida.');
      return;
    }

    setLoading(true);

    try {
      const docRef = doc(db, 'fichas', fichaId);
      const dataToUpdate = { ...state };
      let finalImageUrl = currentImageUrl;

      if (selectedImage) {
        if (currentImageUrl) {
          const oldPath = getStoragePathFromUrl(currentImageUrl);
          if (oldPath) {
            const oldImageRef = ref(storage, oldPath);
            try {
              await deleteObject(oldImageRef);
              console.log("Imagen antigua eliminada de Storage:", oldPath);
            } catch (deleteError) {
              if (deleteError.code !== 'storage/object-not-found') {
                console.error("Error al eliminar imagen antigua de Storage:", deleteError);
              } else {
                console.log("La imagen antigua no se encontró en Storage (posiblemente ya eliminada o URL inválida).");
              }
            }
          }
        }

        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const imageName = `ficha_${fichaId}_${Date.now()}`;
        const imageRef = ref(storage, `fichas_images/${imageName}`);

        await uploadBytes(imageRef, blob);
        finalImageUrl = await getDownloadURL(imageRef);
        console.log("Nueva imagen subida, URL:", finalImageUrl);
      }

      dataToUpdate.imageUrl = finalImageUrl;

      dataToUpdate.region = Number(dataToUpdate.region);
      dataToUpdate.cuadrante = Number(dataToUpdate.cuadrante);
      dataToUpdate.subcuadrante = Number(dataToUpdate.subcuadrante);
      dataToUpdate.n_trampa = Number(dataToUpdate.n_trampa);
      dataToUpdate.fecha = Timestamp.fromDate(dataToUpdate.fecha);

      console.log("Datos a actualizar en Firestore:", dataToUpdate);

      await updateDoc(docRef, dataToUpdate);

      Alert.alert('Alerta', 'Ficha actualizada con éxito');
      navigation.goBack();
    } catch (error) {
      console.error('Error al actualizar la ficha:', error);
      Alert.alert('Error', `No se pudo actualizar la ficha: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
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
      <Text style={styles.title}>Editar Ficha ({state.n_trampa || 'N/A'})</Text>

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

      <Text style={styles.sectionTitle}>Datos de Actividad</Text>
      <View style={styles.row}>
        <View style={[styles.item, styles.datePickerContainerWeb, isDatePickerWebOpen && styles.datePickerOpenMargin]}>
          <Text style={styles.label}>Fecha:</Text>
          {Platform.OS === 'web' ? (
            <DatePickerWeb
              selected={state.fecha instanceof Date && !isNaN(state.fecha.getTime()) ? state.fecha : null}
              onChange={onWebDateChange}
              dateFormat="dd/MM/yyyy"
              customInput={<TextInput style={styles.inputDatePickerWeb} placeholder="DD/MM/AAAA" />}
              popperPlacement="bottom-start"
              popperModifiers={[
                { name: 'offset', options: { offset: [0, 5] } },
                { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-end'] } },
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
              value={state.fecha instanceof Date && !isNaN(state.fecha.getTime()) ? state.fecha : new Date()}
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

      <Text style={styles.sectionTitle}>Imagen de la Ficha</Text>
      <View style={styles.formGroup}>
        {!selectedImage && currentImageUrl && (
          <Image
            source={{ uri: currentImageUrl }}
            style={styles.fichaImagePreview}
          />
        )}
        {selectedImage && (
          <Image
            source={{ uri: selectedImage }}
            style={styles.fichaImagePreview}
          />
        )}

        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Text style={styles.buttonText}>Seleccionar/Cambiar Imagen</Text>
        </TouchableOpacity>

        {selectedImage && (
          <TouchableOpacity style={styles.clearImageButton} onPress={() => setSelectedImage(null)}>
            <Text style={styles.clearImageButtonText}>Limpiar Selección</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={updateFicha} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Actualizando...' : 'Actualizar Ficha'}</Text>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
    color: '#2E7D32',
    textAlign: 'center',
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fichaImagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imagePickerButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  clearImageButton: {
    backgroundColor: '#9E9E9E',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
    alignItems: 'center',
  },
  clearImageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});