import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

    // Función para cargar los datos de la ficha desde Firestore
    useEffect(() => {
        const fetchFicha = async () => {
            setLoading(true);
            setError(null);
            try {
                const docRef = doc(db, 'fichas', fichaId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const fichaData = docSnap.data();
                    // Opcional: Si quieres evitar que las fichas eliminadas se vean aquí
                    // if (fichaData.deleted) {
                    //     setError('Esta ficha ha sido movida a la papelera.');
                    //     setFicha(null);
                    //     // Opcionalmente, puedes navegar de vuelta o a la pantalla de la papelera
                    //     Alert.alert("Ficha Eliminada", "Esta ficha ha sido movida a la papelera. Será redirigido.");
                    //     navigation.goBack();
                    //     return;
                    // }
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

        fetchFicha();
    }, [fichaId]); // Volver a cargar si el fichaId cambia

    // Maneja el movimiento de una ficha a la papelera
    const handleDeleteFicha = async () => {
        let confirmDeletion = false;

        if (Platform.OS === 'web') {
            confirmDeletion = window.confirm("¿Estás seguro de que quieres mover esta ficha a la papelera?");
        } else {
            // Usando una Promesa con Alert.alert para un mejor manejo asíncrono
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
            return; // El usuario canceló la acción
        }

        try {
            console.log('Intentando mover a papelera ficha con ID:', fichaId);
            const fichaRef = doc(db, 'fichas', fichaId);
            await updateDoc(fichaRef, {
                deleted: true, // Marcar como eliminada
                deletedAt: serverTimestamp() // Añadir timestamp del servidor para la hora de eliminación
            });
            Alert.alert("Éxito", "Ficha movida a la papelera correctamente.");
            navigation.goBack(); // Navegar de vuelta a la pantalla anterior (ej. ListaFichas)
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
        if (value === null || typeof value === 'undefined' || value === '') {
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
        // Manejo especial para 'condiciones_trampa' basado en campos booleanos individuales
        if (key === 'condiciones_trampa') {
            let condiciones = [];
            // Usar optional chaining para evitar errores si ficha es null/undefined
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
    const handleExportPdf = () => {
        if (!ficha) {
            Alert.alert('Error', 'No hay datos de ficha para exportar.');
            return;
        }

        // --- IMPORTANTE: pdfMake e Imágenes ---
        // La librería htmlToPdfmake con la opción `imagesByReference: true` espera que las URLs de las imágenes sean
        // resueltas por el propio pdfMake. Sin embargo, pdfMake en el lado del cliente (especialmente en React Native)
        // usualmente necesita las imágenes como **data URLs (base64)** para su generación.
        // Para una solución robusta en React Native, típicamente tendrías que obtener la imagen
        // y convertirla a base64 *antes* de pasarla a htmlToPdfmake o pdfMake.
        // Por ahora, mantendremos el `img src` tal cual, pero ten en cuenta que esto
        // podría no funcionar directamente en todas las plataformas sin un manejo adicional.
        // Para una demostración simple o en la web, podría renderizarse un marcador de posición
        // o funcionar si el entorno puede obtener imágenes externas.

        let htmlContent = `
            <h1>Detalle de Ficha</h1>
            <p><strong>N° Trampa:</strong> ${formatValue('n_trampa', ficha.n_trampa)}</p>
            <h2>Datos de Ubicación</h2>
            <p><strong>Región:</strong> ${formatValue('region', ficha.region)}</p>
            <p><strong>Oficina:</strong> ${formatValue('oficina', ficha.oficina)}</p>
            <p><strong>Cuadrante:</strong> ${formatValue('cuadrante', ficha.cuadrante)}</p>
            <p><strong>Subcuadrante:</strong> ${formatValue('subcuadrante', ficha.subcuadrante)}</p>
            <p><strong>Ruta:</strong> ${formatValue('ruta', ficha.ruta)}</p>
            <p><strong>Condición:</strong> ${formatValue('condiciones_trampa', null)}</p>
            <p><strong>Huso:</strong> ${formatValue('huso', ficha.huso)}</p>
            <h2>Datos de Actividad</h2>
            <p><strong>Fecha:</strong> ${formatValue('fecha', ficha.fecha)}</p>
            <p><strong>Actividad:</strong> ${formatValue('actividad', ficha.actividad)}</p>
            <p><strong>Prospector:</strong> ${formatValue('prospector', ficha.prospector)}</p>
            <p><strong>Localización:</strong> ${formatValue('localizacion', ficha.localizacion)}</p>
            <p><strong>Observaciones:</strong> ${formatValue('observaciones', ficha.observaciones)}</p>
            ${ficha.imageUrl ? `<p><strong>Imagen:</strong> <img src="${ficha.imageUrl}" width="200" /></p>` : ''}
            <p><em>Generado el: ${new Date().toLocaleDateString('es-ES')}</em></p>
        `;

        const content = htmlToPdfmake(htmlContent, {
            // Esta opción le dice a html-to-pdfmake que procese las etiquetas de imagen.
            // Sin embargo, pdfMake típicamente necesita las imágenes como URLs de datos (base64).
            // Para una aplicación de producción, deberías obtener ficha.imageUrl y convertirla a base64.
            imagesByReference: true
        });

        const docDefinition = {
            content: content,
            styles: {
                h1: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
                h2: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
                p: { fontSize: 12, margin: [0, 2, 0, 2] },
                strong: { bold: true },
            },
            defaultStyle: {
                // Asegúrate de que la fuente 'Roboto' esté disponible o especifica una alternativa.
                // En React Native, es posible que necesites incrustar fuentes si no usas una fuente del sistema predeterminada.
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

    // --- Estados de Carga, Error y Vacío ---
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

    // --- Renderizado Principal del Componente ---
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Detalle de Ficha</Text>

            {/* Número de Trampa */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>N° Trampa:</Text>
                <Text style={styles.valueDisplay}>{formatValue('n_trampa', ficha.n_trampa)}</Text>
            </View>

            {/* Datos de Ubicación */}
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

            {/* Datos de Actividad */}
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

            {/* Visualización de la Imagen */}
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

            {/* Botones de Acción */}
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
        justifyContent: 'space-around',
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