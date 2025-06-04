// MapScreen.web.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Importa Firebase y Firestore
import { getFirestore, collection, addDoc, getDocs, query } from 'firebase/firestore'; // Agregamos getDocs y query
// Importa tu archivo de credenciales de Firebase.
// ¡Asegúrate que la ruta sea correcta según la ubicación de tu archivo 'credenciales.js'!
import appMoscasSAG from '../../credenciales';

// Inicializa Firestore
const db = getFirestore(appMoscasSAG);

// Corrección para que los iconos de marcador por defecto de Leaflet se muestren correctamente
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Definición del icono personalizado para el pin usando L.DivIcon
const customColoredPinIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: '<div style="background-color:#007bff; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
});

// Componente auxiliar para manejar los clics en el mapa
function MapClickHandler({ setNewMarkerPosition }) {
    const map = useMap();

    // Función asíncrona para guardar el marcador en Firestore
    const saveMarkerToFirestore = async (markerData) => {
        try {
            await addDoc(collection(db, 'pins'), {
                lat: markerData.lat,
                lng: markerData.lng,
                description: markerData.description,
                timestamp: new Date(), // Guarda el timestamp como un objeto Date
            });
            Alert.alert('¡Éxito!', 'Pin guardado en Firestore correctamente.');
        } catch (error) {
            console.error("Error al guardar el pin en Firestore: ", error);
            Alert.alert('Error', 'No se pudo guardar el pin en Firestore. Revisa tu conexión o permisos.');
        }
    };

    // Efecto para añadir y limpiar el listener de clic en el mapa
    useEffect(() => {
        const handleMapClick = (e) => {
            const description = prompt("Ingresa una descripción para este pin:");
            if (description) {
                const newPinData = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    description: description
                };
                setNewMarkerPosition(newPinData); // Agrega al estado local para visualización inmediata
                saveMarkerToFirestore(newPinData); // Guarda en Firestore
            }
        };

        map.on('click', handleMapClick);

        return () => {
            map.off('click', handleMapClick);
        };
    }, [map, setNewMarkerPosition]);

    return null;
}

// Componente principal de la pantalla del mapa
export default function MapScreenWeb() {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [markers, setMarkers] = useState([]); // Estado para todos los pines (existentes + nuevos)
    const [loadingMarkers, setLoadingMarkers] = useState(true); // Nuevo estado para indicar si se están cargando los pines

    // Función para añadir un nuevo marcador al estado local 'markers'
    const addNewMarker = (markerData) => {
        setMarkers(prevMarkers => [...prevMarkers, markerData]);
    };

    // useEffect para obtener la ubicación del usuario (sin cambios significativos)
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    setErrorMsg(error.message);
                }
            );
        } else {
            setErrorMsg('La geolocalización no es compatible con este navegador.');
        }
    }, []);

    // >>> NUEVO useEffect para cargar los pines existentes desde Firestore al montar el componente <<<
    useEffect(() => {
        const fetchMarkers = async () => {
            setLoadingMarkers(true); // Iniciar la carga
            try {
                const q = query(collection(db, 'pins')); // Crea una query para la colección 'pins'
                const querySnapshot = await getDocs(q); // Obtiene los documentos

                const fetchedMarkers = [];
                querySnapshot.forEach((doc) => {
                    // Por cada documento, obtenemos sus datos
                    const data = doc.data();
                    // Aseguramos que los campos lat, lng y description existan
                    if (data.lat && data.lng && data.description) {
                        fetchedMarkers.push({
                            id: doc.id, // Es útil guardar el ID del documento de Firestore
                            lat: data.lat,
                            lng: data.lng,
                            description: data.description,
                            // Puedes también obtener el timestamp si lo necesitas para algo específico
                            timestamp: data.timestamp ? data.timestamp.toDate() : null // Convertir Timestamp de Firestore a Date
                        });
                    }
                });
                setMarkers(fetchedMarkers); // Actualiza el estado con los pines cargados
            } catch (error) {
                console.error("Error al cargar los pines de Firestore: ", error);
                Alert.alert('Error de Carga', 'No se pudieron cargar los pines existentes.');
            } finally {
                setLoadingMarkers(false); // Finalizar la carga
            }
        };

        fetchMarkers(); // Llama a la función para cargar los pines
    }, []); // El array vacío asegura que este efecto se ejecute solo una vez al montar

    // Renderizado condicional para el estado de carga
    if (errorMsg) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error al obtener la ubicación: {errorMsg}</Text>
            </View>
        );
    }

    if (!location || loadingMarkers) { // Muestra "Cargando mapa..." mientras se obtiene la ubicación O se cargan los marcadores
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                    {loadingMarkers ? 'Cargando pines y mapa...' : 'Cargando mapa...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={styles.map}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[location.latitude, location.longitude]}>
                    <Popup>Estás aquí</Popup>
                    <div style={styles.userMarker}></div>
                </Marker>

                <MapClickHandler setNewMarkerPosition={addNewMarker} />

                {/* Mapeamos y renderizamos todos los marcadores en el estado 'markers' */}
                {markers.map((marker) => (
                    // Usamos marker.id como key si lo recuperamos de Firestore, sino index (menos ideal)
                    <Marker key={marker.id || `${marker.lat}-${marker.lng}-${marker.description}`}
                            position={{ lat: marker.lat, lng: marker.lng }}
                            icon={customColoredPinIcon}>
                        <Popup>
                            **{marker.description}**
                            <br />
                            Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                            {marker.timestamp && <><br />Guardado: {marker.timestamp.toLocaleDateString()}</>}
                        </Popup>
                    </Marker>
                ))}

            </MapContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
    },
    map: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        overflow: 'hidden',
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
    userMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#E15252',
        borderWidth: 2,
        borderColor: 'white',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)',
    },
});