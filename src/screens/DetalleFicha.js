import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Importaciones para PDF
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = vfsFonts.vfs;
// Ya no necesitamos htmlToPdfmake

// Si estamos en web, no necesitamos FileSystem y Sharing
// Para React Native (móvil), asegúrate de que estas líneas estén descomentadas
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';

const db = getFirestore(appMoscasSAG);

// Función auxiliar para convertir URL de imagen a Base64
// Esta función funcionará tanto en web como en React Native
const getImageBase64 = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error al convertir imagen a Base64:', error);
        return null; // Retorna null si hay un error
    }
};


export default function DetalleFicha({ route }) {
    const { fichaId } = route.params;
    console.log('fichaId recibido en DetalleFicha:', fichaId);
    const [ficha, setFicha] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigation = useNavigation();

    // Función para cargar los datos de la ficha desde Firestore
    const fetchFicha = async () => {
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, 'fichas', fichaId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const fichaData = docSnap.data();
                setFicha(fichaData);
                console.log('Datos de la ficha cargados:', fichaData);
                console.log('URL de la imagen (desde ficha.imageUrl):', fichaData.imageUrl);
            } else {
                setError('Ficha no encontrada');
                console.log('Ficha no encontrada para ID:', fichaId);
            }
        } catch (e) {
            setError('Error al cargar la ficha');
            console.error('Error al obtener la ficha:', e);
        } finally {
            setLoading(false);
        }
    };

    // Usar useFocusEffect para volver a cargar los datos cada vez que la pantalla entre en foco
    useFocusEffect(
      useCallback(() => {
        fetchFicha();
        return () => {
          // Limpieza opcional
        };
      }, [fichaId])
    );

    // Maneja el movimiento de una ficha a la papelera
    const handleDeleteFicha = async () => {
        let confirmDeletion = false;

        if (Platform.OS === 'web') {
            confirmDeletion = window.confirm("¿Estás seguro de que quieres mover esta ficha a la papelera?");
        } else {
            confirmDeletion = await new Promise((resolve) => {
                Alert.alert(
                    "Mover a Papelera",
                    "¿Estás seguro de que quieres mover esta ficha a la papelera?",
                    [
                        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
                        { text: "Mover", onPress: () => resolve(true), style: "destructive" }
                    ],
                    { cancelable: true, onDismiss: () => resolve(false) }
                );
            });
        }

        if (!confirmDeletion) {
            return;
        }

        try {
            console.log('Intentando mover a papelera ficha con ID:', fichaId);
            const fichaRef = doc(db, 'fichas', fichaId);
            await updateDoc(fichaRef, {
                deleted: true,
                deletedAt: serverTimestamp()
            });
            Alert.alert("Éxito", "Ficha movida a la papelera correctamente.");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", `No se pudo mover la ficha a la papelera: ${e.message}`);
            console.error("Error al mover ficha a papelera:", e);
        }
    };

    // Maneja la navegación a la pantalla de modificación
    const handleModifyFicha = () => {
        navigation.navigate('EditarFicha', { fichaId: fichaId, currentFichaData: ficha });
    };

    // Función auxiliar para formatear los valores de visualización
    const formatValue = (key, value) => {
        if (value === null || typeof value === 'undefined' || value === '' || value === false) {
            return 'N/A';
        }
        if (key === 'fecha' && value && typeof value.toDate === 'function') {
            const date = value.toDate();
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
        if (key === 'condiciones_trampa') {
            let condiciones = [];
            if (ficha?.condicion_fija) condiciones.push('Fija');
            if (ficha?.condicion_movil) condiciones.push('Móvil');
            if (ficha?.condicion_temporal) condiciones.push('Temporal');
            return condiciones.join(', ') || 'N/A';
        }
        if (typeof value === 'boolean') {
            return value ? 'Sí' : 'No';
        }
        return value.toString();
    };

    // Maneja la exportación a PDF
    const handleExportPdf = async () => { // Hacer la función asíncrona
        if (!ficha) {
            Alert.alert('Error', 'No hay datos de ficha para exportar.');
            return;
        }

        let imageData = null;
        if (ficha.imageUrl) {
            Alert.alert('Generando PDF', 'Cargando imagen para el PDF, por favor espere...');
            imageData = await getImageBase64(ficha.imageUrl);
            if (!imageData) {
                Alert.alert('Error', 'No se pudo cargar la imagen para el PDF. Se generará sin ella.');
            }
        }

        const docDefinition = {
            content: [
                {
                    text: 'Detalle de Ficha de Trampa',
                    style: 'header'
                },
                {
                    canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#ddd' }],
                    margin: [0, 0, 0, 10]
                },
                {
                    text: `N° Trampa: ${formatValue('n_trampa', ficha.n_trampa)}`,
                    style: 'mainInfo'
                },
                {
                    canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#ddd' }],
                    margin: [0, 0, 0, 15]
                },

                {
                    text: 'Datos de Ubicación',
                    style: 'sectionHeader'
                },
                {
                    style: 'sectionTable',
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [{ text: 'Región:', style: 'label' }, { text: formatValue('region', ficha.region), style: 'value' }],
                            [{ text: 'Oficina:', style: 'label' }, { text: formatValue('oficina', ficha.oficina), style: 'value' }],
                            [{ text: 'Cuadrante:', style: 'label' }, { text: formatValue('cuadrante', ficha.cuadrante), style: 'value' }],
                            [{ text: 'Subcuadrante:', style: 'label' }, { text: formatValue('subcuadrante', ficha.subcuadrante), style: 'value' }],
                            [{ text: 'Ruta:', style: 'label' }, { text: formatValue('ruta', ficha.ruta), style: 'value' }],
                            [{ text: 'Condición:', style: 'label' }, { text: formatValue('condiciones_trampa', null), style: 'value' }],
                            [{ text: 'Huso:', style: 'label' }, { text: formatValue('huso', ficha.huso), style: 'value' }],
                        ]
                    },
                    layout: 'noBorders'
                },
                {
                    text: 'Datos de Actividad',
                    style: 'sectionHeader'
                },
                {
                    style: 'sectionTable',
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [{ text: 'Fecha:', style: 'label' }, { text: formatValue('fecha', ficha.fecha), style: 'value' }],
                            [{ text: 'Actividad:', style: 'label' }, { text: formatValue('actividad', ficha.actividad), style: 'value' }],
                            [{ text: 'Prospector:', style: 'label' }, { text: formatValue('prospector', ficha.prospector), style: 'value' }],
                            [{ text: 'Localización:', style: 'label' }, { text: formatValue('localizacion', ficha.localizacion), style: 'value' }],
                            [{ text: 'Observaciones:', style: 'label' }, { text: formatValue('observaciones', ficha.observaciones), style: 'value' }],
                        ]
                    },
                    layout: 'noBorders'
                },
                // Agrega la imagen si existe y se pudo convertir
                imageData ? {
                    text: 'Imagen de la Ficha:',
                    style: 'label',
                    margin: [0, 10, 0, 5]
                } : null,
                imageData ? {
                    image: imageData, // Usa los datos Base64 de la imagen
                    width: 250, // Ajusta el ancho de la imagen en el PDF
                    alignment: 'center',
                    margin: [0, 5, 0, 15]
                } : null,
                {
                    canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5, lineColor: '#eee' }],
                    margin: [0, 5, 0, 5]
                },
                {
                    text: `Generado el: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                    style: 'footer',
                    margin: [0, 20, 0, 0]
                }
            ].filter(Boolean), // Filtra los elementos nulos (como el de la imagen si no existe)
            styles: {
                header: {
                    fontSize: 24,
                    bold: true,
                    margin: [0, 0, 0, 15],
                    alignment: 'center',
                    color: '#37474F'
                },
                mainInfo: {
                    fontSize: 18,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 5, 0, 5],
                    color: '#E15252'
                },
                sectionHeader: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 15, 0, 10],
                    color: '#455A64',
                    decoration: 'underline'
                },
                sectionTable: {
                    margin: [0, 5, 0, 10]
                },
                label: {
                    bold: true,
                    fontSize: 12,
                    color: '#607D8B',
                    margin: [0, 2, 0, 2]
                },
                value: {
                    fontSize: 12,
                    color: '#333',
                    margin: [0, 2, 0, 2]
                },
                footer: {
                    fontSize: 10,
                    color: '#777',
                    alignment: 'right'
                }
            },
            defaultStyle: {
                // Si la fuente 'Roboto' no está cargada globalmente en pdfMake,
                // es mejor quitar esta línea para que use las fuentes por defecto de pdfMake,
                // o bien, cargar 'Roboto' explícitamente en vfsFonts (más complejo para web).
                // Por ahora, la dejaremos comentada si no has configurado una fuente Roboto personalizada.
                // font: 'Roboto' 
            }
        };

        try {
            // pdfMake funciona directamente en web para descargar.
            if (Platform.OS === 'web') {
                pdfMake.createPdf(docDefinition).download(`Ficha_Trampa_${ficha.n_trampa || fichaId}.pdf`);
                Alert.alert('Éxito', 'PDF generado y descargado.');
            } else {
                // Esto es para React Native (móvil)
                // Asegúrate de que expo-file-system y expo-sharing estén importados
                const pdfDocGenerator = pdfMake.createPdf(docDefinition);
                pdfDocGenerator.getBase64(async (data) => {
                    const filename = `Ficha_Trampa_${ficha.n_trampa || fichaId}.pdf`;
                    const pathToSave = `${FileSystem.documentDirectory}${filename}`;
                    await FileSystem.writeAsStringAsync(pathToSave, data, { encoding: FileSystem.EncodingType.Base64 });
                    await Sharing.shareAsync(pathToSave, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
                    Alert.alert('Éxito', 'PDF generado y compartido.');
                });
            }
        } catch (pdfError) {
            Alert.alert('Error', `Error al generar el PDF: ${pdfError.message || 'Error desconocido'}`);
            console.error('Error generando PDF:', pdfError);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E15252" />
                <Text style={styles.messageText}>Cargando detalles de la ficha...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.messageText}>Error: {error}</Text>
            </View>
        );
    }

    if (!ficha) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.messageText}>No se encontraron detalles para esta ficha.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Detalle de Ficha</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>N° Trampa:</Text>
                <Text style={styles.valueDisplay}>{formatValue('n_trampa', ficha.n_trampa)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Datos de Ubicación</Text>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Región:</Text>
                <Text style={styles.valueDisplay}>{formatValue('region', ficha.region)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Oficina:</Text>
                <Text style={styles.valueDisplay}>{formatValue('oficina', ficha.oficina)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Cuadrante:</Text>
                <Text style={styles.valueDisplay}>{formatValue('cuadrante', ficha.cuadrante)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Subcuadrante:</Text>
                <Text style={styles.valueDisplay}>{formatValue('subcuadrante', ficha.subcuadrante)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Ruta:</Text>
                <Text style={styles.valueDisplay}>{formatValue('ruta', ficha.ruta)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Condición:</Text>
                <Text style={styles.valueDisplay}>{formatValue('condiciones_trampa', null)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Huso:</Text>
                <Text style={styles.valueDisplay}>{formatValue('huso', ficha.huso)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Datos de Actividad</Text>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Fecha:</Text>
                <Text style={styles.valueDisplay}>{formatValue('fecha', ficha.fecha)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Actividad:</Text>
                <Text style={styles.valueDisplay}>{formatValue('actividad', ficha.actividad)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Prospector:</Text>
                <Text style={styles.valueDisplay}>{formatValue('prospector', ficha.prospector)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Localización:</Text>
                <Text style={styles.valueDisplay}>{formatValue('localizacion', ficha.localizacion)}</Text>
            </View>
            <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones:</Text>
                <Text style={styles.valueDisplay}>{formatValue('observaciones', ficha.observaciones)}</Text>
            </View>

            {ficha.imageUrl && (
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Imagen de la Ficha:</Text>
                    <Image
                        source={{ uri: ficha.imageUrl }}
                        style={styles.fichaImage}
                        onError={(e) => console.log('Error al cargar imagen de la ficha:', e.nativeEvent.error)}
                        onLoad={() => console.log('¡Imagen de la ficha cargada con éxito!')}
                    />
                </View>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.modifyButton]}
                    onPress={handleModifyFicha}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>Modificar Ficha</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={handleDeleteFicha}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>Mover a Papelera</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.button, styles.exportPdfButton]}
                onPress={handleExportPdf}
                activeOpacity={0.7}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 25,
        color: '#37474F',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#455A64',
        marginTop: 25,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#CFD8DC',
        paddingBottom: 5,
    },
    formGroup: {
        marginBottom: 15,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#607D8B',
        marginBottom: 5,
    },
    valueDisplay: {
        fontSize: 16,
        color: '#333',
    },
    messageText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 10,
        minWidth: 140,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4.65,
        elevation: 6,
        marginHorizontal: 5,
    },
    modifyButton: {
        backgroundColor: '#FFC107',
    },
    deleteButton: {
        backgroundColor: '#D32F2F',
    },
    exportPdfButton: {
        backgroundColor: '#6c757d',
        marginTop: 15,
        width: '100%',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    fichaImage: {
        width: '100%',
        height: 250,
        resizeMode: 'contain',
        marginTop: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ccc',
    },
});