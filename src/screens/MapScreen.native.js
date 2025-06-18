import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image, Alert, Platform, PermissionsAndroid } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';

import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';

import PinCreationModal from './PinCreationModal';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';
import MarkerInfoModal from './MarkerInfoModal';

const db = getFirestore(appMoscasSAG);

const validPinStates = [
    'Activa',
    'Próxima a vencer',
    'Vencida',
    'Inactiva/Retirada',
    'Requiere revisión',
];

const getEstadoColor = (estado) => {
    switch (estado) {
        case 'Activa': return '#4CAF50';
        case 'Próxima a vencer': return '#FFC107';
        case 'Vencida': return '#F44336';
        case 'Inactiva/Retirada': return '#9E9E9E';
        case 'Requiere revisión': return '#2196F3';
        default: return '#007bff';
    }
};

const DAYS_ACTIVE = 14;
const DAYS_NEAR_EXPIRY = 28;

const determinarEstadoTrampa = (fecha_instalacion, plaga_detectada = false, retirada = false) => {
    if (retirada) {
        return "Inactiva/Retirada";
    }
    if (plaga_detectada) {
        return "Requiere revisión";
    }

    let instalacion = fecha_instalacion;
    if (instalacion && typeof instalacion.toDate === 'function') {
        instalacion = instalacion.toDate();
    }

    if (!(instalacion instanceof Date) || isNaN(instalacion.getTime())) {
        console.warn("determinarEstadoTrampa: fecha_instalacion no es una fecha válida. Retornando 'Fecha Inválida'.", fecha_instalacion);
        return "Fecha Inválida";
    }

    const hoy = new Date();
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


export default function MapScreenNative() {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [markers, setMarkers] = useState([]);
    const [loadingMarkers, setLoadingMarkers] = useState(true);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentClickCoords, setCurrentClickCoords] = useState(null);

    const [isMarkerInfoModalVisible, setIsMarkerInfoModalVisible] = useState(false);
    const [selectedMarkerData, setSelectedMarkerData] = useState(null);

    const [searchText, setSearchText] = useState('');
    const mapRef = useRef(null);

    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [pinToDeleteId, setPinToDeleteId] = useState(null);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const navigation = useNavigation();

    const openSuccessModal = (message) => {
        setSuccessMessage(message);
        setShowSuccessModal(true);
    };

    const closeSuccessModal = () => {
        setShowSuccessModal(false);
        setSuccessMessage('');
    };

    const openErrorModal = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    const closeErrorModal = () => {
        setShowErrorModal(false);
        setErrorMessage('');
    };

    const handleMapClickAndShowModal = (event) => {
        const { coordinate } = event.nativeEvent;
        setCurrentClickCoords(coordinate);
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setCurrentClickCoords(null);
    };

    const handleSavePin = async (pinData) => {
        try {
            const nTrampaToSave = pinData.n_trampa;
            console.log("Guardando nuevo pin con n_trampa:", nTrampaToSave);

            const docRef = await addDoc(collection(db, 'pins'), {
                lat: pinData.lat,
                lng: pinData.lng,
                description: pinData.description,
                n_trampa: nTrampaToSave,
                timestamp: new Date(),
                fecha_instalacion: new Date(),
                plaga_detectada: (pinData.estado === 'Requiere revisión'),
                retirada: (pinData.estado === 'Inactiva/Retirada'),
                estado: pinData.estado,
            });
            openSuccessModal('Trampa guardada correctamente.');
            setMarkers(prevMarkers => [...prevMarkers, {
                id: docRef.id,
                ...pinData,
                n_trampa: nTrampaToSave,
                timestamp: new Date(),
                fecha_instalacion: new Date(),
                plaga_detectada: (pinData.estado === 'Requiere revisión'),
                retirada: (pinData.estado === 'Inactiva/Retirada'),
                estado: pinData.estado,
            }]);
            console.log("Pin añadido al estado local:", { id: docRef.id, ...pinData, n_trampa: nTrampaToSave });
        } catch (error) {
            console.error("Error al guardar la trampa en Firestore: ", error);
            openErrorModal('No se pudo guardar la trampa en Firestore. Revisa tu conexión o permisos.');
        } finally {
            handleCloseModal();
        }
    };

    const handleUpdateMarker = useCallback((pinId, updates) => {
        setMarkers(prevMarkers =>
            prevMarkers.map(marker => {
                if (marker.id === pinId) {
                    return {
                        ...marker,
                        ...updates,
                        estado: updates.estado,
                        plaga_detectada: updates.plaga_detectada,
                        retirada: updates.retirada
                    };
                }
                return marker;
            })
        );
        setSelectedMarkerData(prevData => (prevData && prevData.id === pinId ? { ...prevData, ...updates } : prevData));
    }, []);

    const handleDeleteMarker = useCallback((pinId) => {
        setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== pinId));
        setIsMarkerInfoModalVisible(false);
        setSelectedMarkerData(null);
    }, []);

    const handleSearchPin = async () => {
        if (!searchText) {
            openErrorModal('Por favor, introduce un número de trampa para buscar.');
            return;
        }

        const foundMarker = markers.find(
            (m) => m.n_trampa && String(m.n_trampa).toLowerCase() === String(searchText).toLowerCase()
        );

        if (foundMarker) {
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: foundMarker.lat,
                    longitude: foundMarker.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1500);
            }
            setSelectedMarkerData(foundMarker);
            setIsMarkerInfoModalVisible(true);
            setSearchText('');
        } else {
            openErrorModal(`No se encontró ninguna trampa con el N°: "${searchText}"`);
            setSelectedMarkerData(null);
            setIsMarkerInfoModalVisible(false);
        }
    };

    const locateUser = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setErrorMsg('Permiso de ubicación denegado. Por favor, habilítalo en la configuración de tu dispositivo.');
            openErrorModal('Permiso de ubicación denegado. Por favor, habilítalo en la configuración de tu dispositivo.');
            return;
        }

        try {
            let userLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 20000,
            });
            const newPos = {
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
            };
            setLocation(newPos);

            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: newPos.latitude,
                    longitude: newPos.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1500);
            }
            openSuccessModal("Mapa centrado en tu ubicación actual.");
        } catch (error) {
            console.error("Error al obtener la ubicación: ", error);
            setErrorMsg(`Error al obtener la ubicación: ${error.message}`);
            openErrorModal(`No se pudo obtener tu ubicación actual: ${error.message}`);
        }
    };

    useEffect(() => {
        locateUser();
    }, []);

    useEffect(() => {
        const fetchMarkers = async () => {
            setLoadingMarkers(true);
            try {
                const q = query(collection(db, 'pins'));
                const querySnapshot = await getDocs(q);

                const fetchedMarkers = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    const nTrampaValue = (data.n_trampa !== undefined && data.n_trampa !== null)
                        ? data.n_trampa
                        : 'N/A';

                    if (data.lat && data.lng && data.description) {
                        const fechaInstalacion = data.fecha_instalacion ? data.fecha_instalacion.toDate() : new Date(data.timestamp ? data.timestamp.toDate() : Date.now());

                        const estadoFinal = data.estado || determinarEstadoTrampa(
                            fechaInstalacion,
                            data.plaga_detectada || false,
                            data.retirada || false
                        );

                        fetchedMarkers.push({
                            id: doc.id,
                            lat: data.lat,
                            lng: data.lng,
                            description: data.description,
                            n_trampa: nTrampaValue,
                            timestamp: data.timestamp ? data.timestamp.toDate() : null,
                            fecha_instalacion: fechaInstalacion,
                            plaga_detectada: data.plaga_detectada || false,
                            retirada: data.retirada || false,
                            estado: estadoFinal,
                        });
                    } else {
                        console.warn("Pin con datos incompletos (faltan lat, lng o description), omitiendo:", data);
                    }
                });
                setMarkers(fetchedMarkers);
            } catch (error) {
                console.error("Error al cargar las trampas de Firestore: ", error);
                openErrorModal('No se pudieron cargar las trampas existentes.');
            } finally {
                setLoadingMarkers(false);
            }
        };

        fetchMarkers();
    }, []);

    if (errorMsg) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error al obtener la ubicación: {errorMsg}</Text>
            </View>
        );
    }

    if (!location || loadingMarkers) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                    {loadingMarkers ? 'Cargando trampas y mapa...' : 'Cargando mapa...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
                onPress={handleMapClickAndShowModal}
                showsMyLocationButton={false}
            >
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                        onPress={() => {
                            setSelectedMarkerData(marker);
                            setIsMarkerInfoModalVisible(true);
                        }}
                    >
                        <View style={[styles.customMarker, { backgroundColor: getEstadoColor(marker.estado) }]} />
                    </Marker>
                ))}
            </MapView>

            <TouchableOpacity style={styles.locateMeButton} onPress={locateUser}>
                <Image
                    source={require('../../assets/my_location_icon.png')}
                    style={styles.locateMeIcon}
                />
            </TouchableOpacity>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por N° Trampa"
                    placeholderTextColor="#999"
                    value={searchText}
                    onChangeText={setSearchText}
                    keyboardType="numeric"
                    onSubmitEditing={handleSearchPin}
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearchPin}
                >
                    <Text style={styles.searchButtonText}>Buscar</Text>
                </TouchableOpacity>
            </View>

            {currentClickCoords && (
                <PinCreationModal
                    visible={isModalVisible}
                    onClose={handleCloseModal}
                    onSave={handleSavePin}
                    coords={currentClickCoords}
                />
            )}

            {selectedMarkerData && (
                <MarkerInfoModal
                    visible={isMarkerInfoModalVisible}
                    onClose={() => {
                        setIsMarkerInfoModalVisible(false);
                        setSelectedMarkerData(null);
                    }}
                    markerData={selectedMarkerData}
                    onUpdateMarker={handleUpdateMarker}
                    onDeleteMarker={handleDeleteMarker}
                    openSuccessModal={openSuccessModal}
                    openErrorModal={openErrorModal}
                />
            )}

            <SuccessModal
                visible={showSuccessModal}
                message={successMessage}
                onClose={closeSuccessModal}
            />

            <SuccessModal
                visible={showErrorModal}
                title="Error"
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    loadingText: {
        fontSize: 16,
        color: '#777',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    errorText: {
        fontSize: 16,
        color: '#E15252',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 10,
        right: 10,
        zIndex: 1000,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginRight: 10,
        fontSize: 15,
        backgroundColor: 'white',
    },
    searchButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    locateMeButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 1000,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locateMeIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    customMarker: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
        elevation: 3,
    },
    calloutContent: {
        width: 150,
        padding: 5,
    },
    calloutTitle: {
        fontWeight: 'bold',
        marginBottom: 3,
    },
});