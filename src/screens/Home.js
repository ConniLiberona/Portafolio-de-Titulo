// src/screens/Home.js
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Image, ImageBackground, Animated, Easing } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';

const auth = getAuth(appMoscasSAG);
const db = getFirestore(appMoscasSAG);

const APP_HORIZONTAL_PADDING = 24;

// Las constantes de días activos/vencimiento ya no son estrictamente necesarias
// para el CONTEO si el estado ya está definido en la BD.
// Las mantengo aquí por si las usas para otra lógica o validación futura.
const DAYS_ACTIVE = 14;
const DAYS_NEAR_EXPIRY = 28;

/**
 * [OPCIONAL] Función para determinar el estado de una trampa basada en lógica de fechas.
 * Esto SOLO se usa si el campo 'estado' en Firestore no es el que quieres para el resumen
 * o si quieres tener una lógica de estado calculada en algún otro lugar de la app.
 * Para el resumen operacional, si ya tienes un campo 'estado' en Firestore, no se usa.
 *
 * @param {firebase.firestore.Timestamp | Date} fecha_instalacion La fecha de instalación de la trampa.
 * @param {boolean} plaga_detectada Indica si se ha detectado plaga.
 * @param {boolean} retirada Indica si la trampa ha sido retirada.
 * @returns {string} El estado de la trampa ("Activa", "Próxima a vencer", "Vencida", "Inactiva/Retirada", "Fecha Inválida").
 */
const determinarEstadoTrampaPorLogicaDeFechas = (fecha_instalacion, plaga_detectada = false, retirada = false) => {
    if (retirada) {
        return "Inactiva/Retirada";
    }

    let instalacion = fecha_instalacion;
    if (instalacion && typeof instalacion.toDate === 'function') {
        instalacion = instalacion.toDate();
    }

    if (!(instalacion instanceof Date) || isNaN(instalacion.getTime())) {
        console.warn("determinarEstadoTrampaPorLogicaDeFechas: fecha_instalacion no es una fecha válida. Retornando 'Fecha Inválida'.", fecha_instalacion);
        return "Fecha Inválida";
    }

    const hoy = new Date();
    // Normalizamos 'hoy' a medianoche para que la diferencia de días sea precisa
    hoy.setHours(0, 0, 0, 0); 
    instalacion.setHours(0, 0, 0, 0); 

    const diffTime = Math.abs(hoy.getTime() - instalacion.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < DAYS_ACTIVE) {
        return "Activa";
    } else if (diffDays >= DAYS_ACTIVE && diffDays < DAYS_NEAR_EXPIRY) {
        return "Próxima a vencer";
    } else {
        return "Vencida";
    }
};


export default function Home() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const [trapCounts, setTrapCounts] = useState({
        'Activa': 0,
        'Próxima a vencer': 0,
        'Vencida': 0,
        'Inactiva/Retirada': 0, // Añadido para conteo si lo quieres mostrar
        'Total': 0,
        // Si tienes otros estados definidos en Firestore, agrégalos aquí.
        // Por ejemplo: 'Requiere Revisión': 0
    });
    const [loadingCounts, setLoadingCounts] = useState(true);
    const [lastUpdateDate, setLastUpdateDate] = useState('N/A');

    // Referencias para los valores animados de opacidad
    const animatedOpacityActive = useRef(new Animated.Value(1)).current;
    const animatedOpacityNearExpiry = useRef(new Animated.Value(1)).current;
    const animatedOpacityExpired = useRef(new Animated.Value(1)).current;

    // Mapa de referencias animadas por estado
    const animatedOpacities = {
        'Activa': animatedOpacityActive,
        'Próxima a vencer': animatedOpacityNearExpiry,
        'Vencida': animatedOpacityExpired,
    };

    // Función para iniciar la animación de parpadeo
    const startBlinkingAnimation = (animatedValue) => {
        animatedValue.setValue(1); // Asegurarse de que empieza visible
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 0.2, // Casi transparente
                    duration: 800, // Duración del "apagado"
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 1, // Totalmente visible
                    duration: 800, // Duración del "encendido"
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    // Función para detener la animación
    const stopBlinkingAnimation = (animatedValue) => {
        animatedValue.stopAnimation();
        animatedValue.setValue(1); // Dejarlo visible
    };

    // Efecto para controlar las animaciones de parpadeo
    useEffect(() => {
        const statesToBlink = ['Próxima a vencer', 'Vencida'];

        Object.keys(animatedOpacities).forEach(estado => {
            const animatedValue = animatedOpacities[estado];
            if (statesToBlink.includes(estado) && trapCounts[estado] > 0) {
                startBlinkingAnimation(animatedValue);
            } else {
                stopBlinkingAnimation(animatedValue);
            }
        });

        return () => {
            Object.keys(animatedOpacities).forEach(estado => {
                const animatedValue = animatedOpacities[estado];
                stopBlinkingAnimation(animatedValue);
            });
        };
    }, [trapCounts, isFocused]);


    const fetchTrapCounts = async () => {
        setLoadingCounts(true);
        // Resetear los conteos para cada carga
        const counts = {
            'Activa': 0,
            'Próxima a vencer': 0,
            'Vencida': 0,
            'Inactiva/Retirada': 0,
            'Total': 0,
            // Asegúrate de incluir cualquier otro estado que exista en tu campo 'estado' de Firestore
            'Estado Desconocido': 0, // Para estados que no esperábamos
        };
        let latestTimestamp = null; 

        try {
            const q = query(collection(db, 'pins'));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // *** CAMBIO CLAVE AQUÍ ***
                // Usar directamente el campo 'estado' del documento de Firestore
                const estadoGuardadoEnFirestore = data.estado; 
                
                // Incrementar el contador del estado que viene de Firestore
                if (typeof estadoGuardadoEnFirestore === 'string' && counts.hasOwnProperty(estadoGuardadoEnFirestore)) {
                    counts[estadoGuardadoEnFirestore]++;
                } else if (typeof estadoGuardadoEnFirestore === 'string') {
                    // Si el estado es una cadena pero no está en nuestros contadores predefinidos
                    // Lo puedes contar aquí o simplemente emitir un warning
                    console.warn(`Estado no reconocido '${estadoGuardadoEnFirestore}' para el documento '${doc.id}'. Se cuenta en 'Estado Desconocido'.`);
                    counts['Estado Desconocido']++;
                } else {
                    // Si el campo 'estado' no existe o no es una cadena
                    console.warn(`Documento '${doc.id}' no tiene un campo 'estado' válido. Se cuenta en 'Estado Desconocido'.`);
                    counts['Estado Desconocido']++;
                }
                
                counts.Total++; // Siempre incrementar el total

                // --- Lógica para el latestTimestamp (Última Actualización General del Dashboard) ---
                // Esto sigue usando el 'timestamp' del documento (fecha de última modificación).
                let currentDocTimestamp = null;
                if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                    currentDocTimestamp = data.timestamp.toDate();
                } else if (data.timestamp instanceof Date) {
                    currentDocTimestamp = data.timestamp;
                }

                if (currentDocTimestamp instanceof Date && !isNaN(currentDocTimestamp.getTime()) && 
                    (!latestTimestamp || currentDocTimestamp > latestTimestamp)) {
                    latestTimestamp = currentDocTimestamp;
                }
            });

            setTrapCounts(counts);
            // Formatear la fecha de la última actualización
            if (latestTimestamp) {
                const options = { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false // Formato 24 horas
                };
                setLastUpdateDate(latestTimestamp.toLocaleDateString('es-CL', options)); 
            } else {
                setLastUpdateDate('N/A');
            }
        } catch (error) {
            console.error("Error al cargar los conteos de trampas: ", error);
            // showInfoModal("Error de Carga", "No se pudieron cargar los datos del resumen. Intenta de nuevo.", true);
        } finally {
            setLoadingCounts(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchTrapCounts();
        }
    }, [isFocused]);


    const handleLogout = async () => {
        console.log("¡Botón 'Cerrar Sesión' PRESIONADO! (Inicio de handleLogout)");
        try {
            if (!auth) {
                console.error("handleLogout: La instancia de autenticación (auth) no está definida.");
                alert("Error: No se pudo inicializar la autenticación. Por favor, reinicia la app.");
                return;
            }
            await signOut(auth);
            console.log("handleLogout: Llamada a signOut() completada.");
        } catch (error) {
            console.error("handleLogout: Error al cerrar sesión:", error.code, error.message);
            alert(`Error: No se pudo cerrar la sesión: ${error.message}.`);
        }
    };

    const StatusRow = ({ estado, count, animatedOpacity }) => (
        <View style={styles.statusItem}>
            <Animated.View
                style={[
                    styles.colorIndicator,
                    { backgroundColor: getEstadoColor(estado) },
                    animatedOpacity ? { opacity: animatedOpacity } : null 
                ]}
            />
            <Text style={styles.cardText}>{estado}: <Text style={styles.highlightText}>{count}</Text></Text>
        </View>
    );

    return (
        <ImageBackground
            source={require('../../assets/fondo.jpg')}
            style={styles.fullScreenBackground}
            resizeMode="cover"
        >
            <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.vignetteOverlay}
            />

            <LinearGradient
                colors={['rgba(240, 242, 245, 0.7)', 'rgba(255, 255, 255, 0.7)', 'rgba(240, 242, 245, 0.7)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contentGradientOverlay}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollViewContentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.mainContentWrapper}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/LogoSAG.jpg')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={styles.serviceText}>SERVICIO AGRICOLA Y GANADERO</Text>

                        <View style={styles.infoCard}>
                            <Text style={styles.cardTitle}>Resumen Operacional</Text>
                            {loadingCounts ? (
                                <Text style={styles.cardText}>Cargando datos...</Text>
                            ) : (
                                <>
                                    <Text style={styles.cardText}>Total de Trampas: <Text style={styles.highlightText}>{trapCounts.Total}</Text></Text>

                                    <StatusRow estado="Activa" count={trapCounts.Activa} animatedOpacity={animatedOpacities['Activa']} />
                                    <StatusRow estado="Próxima a vencer" count={trapCounts['Próxima a vencer']} animatedOpacity={animatedOpacities['Próxima a vencer']} />
                                    <StatusRow estado="Vencida" count={trapCounts.Vencida} animatedOpacity={animatedOpacities['Vencida']} />
                                    {/* Muestra conteos para otros estados si los tienes en trapCounts y quieres visualizarlos */}
                                    {trapCounts['Inactiva/Retirada'] > 0 && (
                                        <StatusRow estado="Inactiva/Retirada" count={trapCounts['Inactiva/Retirada']} />
                                    )}
                                    {trapCounts['Estado Desconocido'] > 0 && (
                                        <StatusRow estado="Estado Desconocido" count={trapCounts['Estado Desconocido']} />
                                    )}

                                    <Text style={styles.cardText}>Última actualización: <Text style={styles.highlightText}>{lastUpdateDate}</Text></Text>
                                </>
                            )}
                        </View>

                        <View style={styles.navigationGrid}>
                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('MapScreen')}>
                                    <Text style={styles.buttonIcon}>🗺️</Text>
                                    <Text style={styles.gridButtonText}>Mapa de Trampas</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('NuevaFicha')}>
                                    <Text style={styles.buttonIcon}>📝</Text>
                                    <Text style={styles.gridButtonText}>Nueva Ficha</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('ListaFichas')}>
                                    <Text style={styles.buttonIcon}>📄</Text>
                                    <Text style={styles.gridButtonText}>Listado de Fichas</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('GestionUsuarios')}>
                                    <Text style={styles.buttonIcon}>👥</Text>
                                    <Text style={styles.gridButtonText}>Gestión de Usuarios</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.gridRow}>
                                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Papelera')}>
                                    <Text style={styles.buttonIcon}>🗑️</Text>
                                    <Text style={styles.gridButtonText}>Papelera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.gridButton} onPress={() => navigation.navigate('Configuracion')}>
                                    <Text style={styles.buttonIcon}>⚙️</Text>
                                    <Text style={styles.gridButtonText}>Configuración</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    fullScreenBackground: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    vignetteOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 1,
    },
    contentGradientOverlay: {
        flex: 1,
        zIndex: 2,
    },
    scrollViewContentContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 10,
    },
    mainContentWrapper: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        paddingHorizontal: APP_HORIZONTAL_PADDING,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 0,
    },
    logoImage: {
        width: 150,
        height: 75,
        resizeMode: 'contain',
    },
    serviceText: {
        fontSize: 13,
        color: '#34495E',
        marginTop: 5,
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 0.8,
        opacity: 0.8,
    },
    infoCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        width: '100%',
        shadowColor: 'rgba(0, 0, 0, 0.15)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#E0E6ED',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#34495E',
        marginBottom: 10,
    },
    cardText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 5,
    },
    highlightText: {
        fontWeight: 'bold',
        color: '#34495E',
    },
    navigationGrid: {
        width: '100%',
        marginBottom: 5,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    gridButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        paddingVertical: 18,
        paddingHorizontal: 15,
        flex: 1,
        marginHorizontal: 7,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#BDC3C7',
        minHeight: 90,
    },
    buttonIcon: {
        fontSize: 26,
        marginBottom: 5,
    },
    gridButtonText: {
        color: '#2C3E50',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    logoutButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: '#BDC3C7',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 12,
        marginTop: 10,
        width: '100%',
        maxWidth: 280,
        alignSelf: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    logoutButtonText: {
        color: '#2C3E50',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    colorIndicator: {
        width: 15,
        height: 15,
        borderRadius: 3,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
});

const getEstadoColor = (estado) => {
    switch (estado) {
        case 'Activa': return '#4CAF50'; // Verde
        case 'Próxima a vencer': return '#FFC107'; // Amarillo
        case 'Vencida': return '#F44336'; // Rojo
        case 'Inactiva/Retirada': return '#9E9E9E'; // Gris (se mantiene la definición aunque no se muestre)
        case 'Requiere revisión': return '#2196F3'; // Azul (se mantiene la definición aunque no se muestre)
        case 'Estado Desconocido': return '#78909C'; // Para estados no mapeados/válidos
        default: return '#000'; // Color por defecto si el estado no está en la lista
    }
};