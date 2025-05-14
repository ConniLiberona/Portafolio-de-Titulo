import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert  } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore(appMoscasSAG);

export default function DetalleFicha({ route }) {
  const { fichaId, fichaData } = route.params;
  const [ficha, setFicha] = useState(fichaData || {});
  const [loading, setLoading] = useState(!fichaData);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (!fichaData && fichaId) {
      const fetchFicha = async () => {
        setLoading(true);
        setError(null);
        try {
          const docRef = doc(db, 'fichas', fichaId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFicha(docSnap.data());
          } else {
            setError('Ficha no encontrada');
          }
        } catch (e) {
          setError('Error al cargar la ficha');
          console.error('Error fetching ficha:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchFicha();
    } else if (!fichaData && !fichaId) {
      setError('No se proporcionó ID ni datos de la ficha.');
      setLoading(false);
    }
  }, [fichaId, fichaData]);

  const handleChangeText = (name, value) => {
    setFicha(prevState => ({ ...prevState, [name]: value }));
  };

  const handleCheckboxChange = (name) => {
    if (isEditing) {
      setFicha(prevState => ({
        ...prevState,
        [name]: !prevState[name],
      }));
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const saveChanges = async () => {
    setLoading(true);
    try {
      const fichaRef = doc(db, 'fichas', fichaId);
      await updateDoc(fichaRef, ficha);
      Alert.alert('Éxito', 'Los cambios se han guardado correctamente');
      setIsEditing(false); // Salir del modo de edición

      // Re-cargar los datos actualizados
      const docSnap = await getDoc(fichaRef);
      if (docSnap.exists()) {
        setFicha(docSnap.data());
      } else {
        console.error('Error: Ficha no encontrada después de la actualización.');
        setError('Error al cargar la ficha actualizada.');
      }

    } catch (error) {
      console.error('Error al actualizar la ficha:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Text>Cargando detalles de la ficha...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  if (!ficha) {
    return <Text>No se encontraron detalles para esta ficha.</Text>;
  }

  return (
    <ScrollView style={styles.container}>

    {/* Sección 1: Datos de Ubicación */}
    <Text style={styles.sectionTitle}>Datos de Ubicación</Text>
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.label}>Región:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.region || ''}
            onChangeText={(text) => handleChangeText('region', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.region || 'N/A'}</Text>
          </View>
        )}
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Oficina:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.oficina || ''}
            onChangeText={(text) => handleChangeText('oficina', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.oficina || 'N/A'}</Text>
          </View>
        )}
      </View>
    </View>

    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.label}>Cuadrante:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.cuadrante || ''}
            onChangeText={(text) => handleChangeText('cuadrante', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.cuadrante || 'N/A'}</Text>
          </View>
        )}
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Subcuadrante:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.subcuadrante || ''}
            onChangeText={(text) => handleChangeText('subcuadrante', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.subcuadrante || 'N/A'}</Text>
          </View>
        )}
      </View>
    </View>

    <View style={styles.fullWidthItem}>
      <Text style={styles.label}>Ruta:</Text>
      {isEditing ? (
        <TextInput
          style={styles.input}
          value={ficha.ruta || ''}
          onChangeText={(text) => handleChangeText('ruta', text)}
        />
      ) : (
        <View style={styles.inputView}>
          <Text style={styles.inputValue}>{ficha.ruta || 'N/A'}</Text>
        </View>
      )}
    </View>

    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.label}>N° Trampa:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.n_trampa || ''}
            onChangeText={(text) => handleChangeText('n_trampa', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.n_trampa || 'N/A'}</Text>
          </View>
        )}
      </View>
      <View style={{ width: '48%' }} /> {/* Espacio para mantener la estructura */}
    </View>

    {/* Checkboxes y Radios (la lógica de onPress condicional ya está) */}
    <View style={styles.checkboxRow}>
      <Text style={styles.label}>Condición:</Text>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => isEditing && handleCheckboxChange('condicion_fija')}
        disabled={!isEditing}
      >
        <View style={[styles.checkbox, ficha.condicion_fija && styles.checkboxActive]} />
        <Text style={styles.checkboxLabel}>Fija</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => isEditing && handleCheckboxChange('condicion_movil')}
        disabled={!isEditing}
      >
        <View style={[styles.checkbox, ficha.condicion_movil && styles.checkboxActive]} />
        <Text style={styles.checkboxLabel}>Móvil</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => isEditing && handleCheckboxChange('condicion_temporal')}
        disabled={!isEditing}
      >
        <View style={[styles.checkbox, ficha.condicion_temporal && styles.checkboxActive]} />
        <Text style={styles.checkboxLabel}>Temporal</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.husoRow}>
      <Text style={styles.label}>Huso:</Text>
      <TouchableOpacity
        style={styles.radioContainer}
        onPress={() => isEditing && handleChangeText('huso', '18')}
        disabled={!isEditing}
      >
        <View style={[styles.radio, ficha.huso === '18' && styles.radioActive]} />
        <Text style={styles.radioLabel}>18°</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.radioContainer}
        onPress={() => isEditing && handleChangeText('huso', '19')}
        disabled={!isEditing}
      >
        <View style={[styles.radio, ficha.huso === '19' && styles.radioActive]} />
        <Text style={styles.radioLabel}>19°</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.radioContainer}
        onPress={() => isEditing && handleChangeText('huso', '12')}
        disabled={!isEditing}
      >
        <View style={[styles.radio, ficha.huso === '12' && styles.radioActive]} />
        <Text style={styles.radioLabel}>12°</Text>
      </TouchableOpacity>
    </View>

    {/* Sección 2: Datos de Actividad */}
    <Text style={styles.sectionTitle}>Datos de Actividad</Text>
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.label}>Fecha:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.fecha || ''}
            onChangeText={(text) => handleChangeText('fecha', text)}
            placeholder="DD/MM/AAAA"
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.fecha || 'N/A'}</Text>
          </View>
        )}
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Actividad:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.actividad || ''}
            onChangeText={(text) => handleChangeText('actividad', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.actividad || 'N/A'}</Text>
          </View>
        )}
      </View>
    </View>

    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.label}>Prospector:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.prospector || ''}
            onChangeText={(text) => handleChangeText('prospector', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.prospector || 'N/A'}</Text>
          </View>
        )}
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Localización:</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={ficha.localizacion || ''}
            onChangeText={(text) => handleChangeText('localizacion', text)}
          />
        ) : (
          <View style={styles.inputView}>
            <Text style={styles.inputValue}>{ficha.localizacion || 'N/A'}</Text>
          </View>
        )}
      </View>
    </View>

    <View style={styles.fullWidthItem}>
      <Text style={styles.label}>Observaciones:</Text>
      {isEditing ? (
        <TextInput
          style={styles.largeInput}
          value={ficha.observaciones || ''}
          onChangeText={(text) => handleChangeText('observaciones', text)}
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
        />
      ) : (
        <View style={styles.largeInputView}>
          <Text style={styles.largeInputValue}>{ficha.observaciones || 'N/A'}</Text>
        </View>
      )}
    </View>

    {!isEditing ? (
      <TouchableOpacity style={styles.editButton} onPress={toggleEdit}>
        <Text style={styles.buttonText}>Editar Ficha</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={saveChanges} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={toggleEdit}>
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
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
  fullWidthItem: {
    width: '100%',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#444',
    marginBottom: 3,
  },
  inputView: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
    height: 38,
    justifyContent: 'center', // Center text vertically
  },
  inputValue: {
    fontSize: 14,
    color: '#333',
  },
  largeInputView: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
    minHeight: 70,
    justifyContent: 'flex-start',
  },
  largeInputValue: {
    fontSize: 14,
    color: '#333',
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
  editButton: {
    backgroundColor: '#007bff',
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
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    flex: 1,
  },
});