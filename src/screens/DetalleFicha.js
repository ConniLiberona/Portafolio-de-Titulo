import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';
import { useNavigation } from '@react-navigation/native';

// Importaciones para PDF
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = vfsFonts.vfs;
import htmlToPdfmake from 'html-to-pdfmake';


const db = getFirestore(appMoscasSAG);

export default function DetalleFicha({ route }) {
  const { fichaId } = route.params;
  console.log('fichaId recibido en DetalleFicha:', fichaId);
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
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
  }, [fichaId]);

  const handleDeleteFicha = async () => {
    let confirmDeletion = false;

    if (Platform.OS === 'web') {
      confirmDeletion = window.confirm("¿Estás seguro de que quieres eliminar esta ficha?");
    } else {
      await new Promise((resolve) => {
        Alert.alert(
          "Eliminar Ficha",
          "¿Estás seguro de que quieres eliminar esta ficha?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Eliminar", onPress: () => resolve(true), style: "destructive" }
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        );
      }).then(result => {
        confirmDeletion = result;
      });
    }

    if (!confirmDeletion) {
      return;
    }

    try {
      console.log('Intentando eliminar ficha con ID:', fichaId);
      await deleteDoc(doc(db, 'fichas', fichaId));
      Alert.alert("Éxito", "Ficha eliminada correctamente.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", `No se pudo eliminar la ficha: ${e.message}`);
      console.error("Error al eliminar ficha:", e);
    }
  };

  const handleModifyFicha = () => {
    navigation.navigate('EditarFicha', { fichaId: fichaId, currentFichaData: ficha });
  };

  const formatValue = (key, value) => {
    if (key === 'fecha' && value && typeof value.toDate === 'function') {
      const date = value.toDate();
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (value === null || typeof value === 'undefined' || value === '') {
        return 'N/A';
    }
    return value.toString();
  };

  const formatKey = (key) => {
    return key.replace(/_/g, ' ')
               .replace(/\b\w/g, char => char.toUpperCase());
  };

  const handleExportPdf = () => {
    if (!ficha) {
      Alert.alert('Error', 'No hay datos de ficha para exportar.');
      return;
    }

    let htmlContent = `
      <h1>Detalle de Ficha</h1>
      <p><strong>N° Trampa:</strong> ${formatValue('n_trampa', ficha.n_trampa)}</p>
      <h2>Datos de Ubicación</h2>
      <p><strong>Región:</strong> ${formatValue('region', ficha.region)}</p>
      <p><strong>Oficina:</strong> ${formatValue('oficina', ficha.oficina)}</p>
      <p><strong>Cuadrante:</strong> ${formatValue('cuadrante', ficha.cuadrante)}</p>
      <p><strong>Subcuadrante:</strong> ${formatValue('subcuadrante', ficha.subcuadrante)}</p>
      <p><strong>Ruta:</strong> ${formatValue('ruta', ficha.ruta)}</p>
      <p><strong>Condición:</strong> ${formatValue('condicion_fija', ficha.condicion_fija ? 'Fija ' : '')}${formatValue('condicion_movil', ficha.condicion_movil ? 'Móvil ' : '')}${formatValue('condicion_temporal', ficha.condicion_temporal ? 'Temporal ' : '')}</p>
      <p><strong>Huso:</strong> ${formatValue('huso', ficha.huso)}</p>
      <h2>Datos de Actividad</h2>
      <p><strong>Fecha:</strong> ${formatValue('fecha', ficha.fecha)}</p>
      <p><strong>Actividad:</strong> ${formatValue('actividad', ficha.actividad)}</p>
      <p><strong>Prospector:</strong> ${formatValue('prospector', ficha.prospector)}</p>
      <p><strong>Localización:</strong> ${formatValue('localizacion', ficha.localizacion)}</p>
      <p><strong>Observaciones:</strong> ${formatValue('observaciones', ficha.observaciones)}</p>
      <p><em>Generado el: ${new Date().toLocaleDateString('es-ES')}</em></p>
    `;

    const content = htmlToPdfmake(htmlContent);

    const docDefinition = {
      content: content,
      styles: {
        h1: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
        h2: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
        p: { fontSize: 12, margin: [0, 2, 0, 2] },
        strong: { bold: true },
      },
      defaultStyle: {
        font: 'Roboto',
      }
    };

    try {
        pdfMake.createPdf(docDefinition).download(`Ficha_Trampa_${ficha.n_trampa || fichaId}.pdf`);
        Alert.alert('Éxito', 'PDF generado y descargado.');
    } catch (pdfError) {
        Alert.alert('Error', `Error al generar el PDF: ${pdfError.message || 'Error desconocido'}`);
        console.error('Error generando PDF:', pdfError);
    }
  };


  if (loading) {
    return <Text style={styles.messageText}>Cargando detalles de la ficha...</Text>;
  }

  if (error) {
    return <Text style={styles.messageText}>Error: {error}</Text>;
  }

  if (!ficha) {
    return <Text style={styles.messageText}>No se encontraron detalles para esta ficha.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de Ficha</Text>
      {Object.entries(ficha).map(([key, value]) => (
        <View key={key} style={styles.detailItem}>
          <Text style={styles.label}>{formatKey(key)}:</Text>
          <Text style={styles.value}>{formatValue(key, value)}</Text>
        </View>
      ))}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.modifyButton]}
          onPress={handleModifyFicha}
          activeOpacity={0.7} // Efecto de opacidad al presionar
        >
          <Text style={styles.buttonText}>Modificar Ficha</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteFicha}
          activeOpacity={0.7} // Efecto de opacidad al presionar
        >
          <Text style={styles.buttonText}>Eliminar Ficha</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.exportPdfButton]}
        onPress={handleExportPdf}
        activeOpacity={0.7} // Efecto de opacidad al presionar
      >
        <Text style={styles.buttonText}>Exportar a PDF 📄</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#37474F',
    textAlign: 'center',
  },
  detailItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#607D8B',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  value: {
    fontSize: 16,
    color: '#424242',
  },
  messageText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14, // Aumentar un poco el padding vertical
    paddingHorizontal: 28, // Aumentar un poco el padding horizontal
    borderRadius: 10, // Un poco más redondeado
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center', // Centrar texto verticalmente
    // Sombras más suaves y consistentes
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3, // Mayor profundidad
    },
    shadowOpacity: 0.2, // Más sutil
    shadowRadius: 4.65, // Mayor difuminado
    elevation: 6, // Equivalente para Android
  },
  modifyButton: {
    backgroundColor: '#FFC107', // Amarillo
  },
  deleteButton: {
    backgroundColor: '#D32F2F', // Rojo oscuro
  },
  exportPdfButton: {
    backgroundColor: '#6c757d', // ¡CAMBIO AQUÍ a un gris oscuro!
    marginTop: 15, // Un poco más de margen superior
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700', // Un poco más audaz para el texto
    textShadowColor: 'rgba(0, 0, 0, 0.1)', // Sombra sutil para el texto
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});