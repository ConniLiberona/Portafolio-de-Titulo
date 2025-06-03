// MapScreen.web.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native'; // Agregamos Alert para notificaciones al usuario
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Importa Firebase y Firestore
import { getFirestore, collection, addDoc } from 'firebase/firestore';
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
            // Añadimos el documento a la colección 'pins' en Firestore
            await addDoc(collection(db, 'pins'), {
                lat: markerData.lat,
                lng: markerData.lng,
                description: markerData.description,
                timestamp: new Date(), // Guarda el timestamp como un objeto Date, Firestore lo convierte automáticamente
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
            // Si el usuario ingresó una descripción y no canceló el prompt
            if (description) {
                const newPinData = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    description: description
                };
                setNewMarkerPosition(newPinData); // Actualiza el estado local para mostrar el pin inmediatamente
                saveMarkerToFirestore(newPinData); // Llama a la función para guardar en Firestore
            }
        };

        map.on('click', handleMapClick); // Añade el listener de clic al mapa

        // Función de limpieza que se ejecuta cuando el componente se desmonta
        return () => {
            map.off('click', handleMapClick); // Remueve el listener para evitar fugas de memoria
        };
    }, [map, setNewMarkerPosition]); // Dependencias del efecto

    return null; // Este componente no renderiza nada visual
}

// Componente principal de la pantalla del mapa
export default function MapScreenWeb() {
    const [location, setLocation] = useState(null); // Estado para la ubicación actual del usuario
    const [errorMsg, setErrorMsg] = useState(null); // Estado para mensajes de error de geolocalización
    const [markers, setMarkers] = useState([]); // Estado para almacenar todos los pines agregados por el usuario

    // Función para añadir un nuevo marcador al estado local 'markers'
    const addNewMarker = (markerData) => {
        setMarkers(prevMarkers => [...prevMarkers, markerData]);
    };

    // Efecto para obtener la ubicación del usuario al cargar el componente
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
    }, []); // Se ejecuta solo una vez al montar el componente

    // Renderizado condicional basado en el estado
    if (errorMsg) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error al obtener la ubicación: {errorMsg}</Text>
            </View>
        );
    }

    if (!location) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
        );
    }

    // Renderizado del mapa cuando la ubicación está disponible
    return (
        <View style={styles.container}>
            <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={styles.map}>
                {/* Capa de tiles de OpenStreetMap */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Marcador de la ubicación actual del usuario */}
                <Marker position={[location.latitude, location.longitude]}>
                    <Popup>Estás aquí</Popup>
                    <div style={styles.userMarker}></div> {/* Estilo personalizado para el marcador del usuario */}
                </Marker>

                {/* Incluye el componente que maneja los clics para añadir nuevos marcadores */}
                {/* Pasamos 'addNewMarker' como prop para actualizar el estado local */}
                <MapClickHandler setNewMarkerPosition={addNewMarker} />

                {/* Mapeamos y renderizamos todos los marcadores guardados en el estado 'markers' */}
                {markers.map((marker, index) => (
                    <Marker
                        key={index} // La 'key' ayuda a React a identificar elementos en listas
                        position={{ lat: marker.lat, lng: marker.lng }}
                        icon={customColoredPinIcon}
                    >
                        <Popup>
                            **{marker.description}**
                            <br />
                            Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}
                        </Popup>
                    </Marker>
                ))}

            </MapContainer>
        </View>
    );
}

// --- Estilos para los componentes de React Native ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0', // Fondo gris claro
    },
    map: {
        width: '100%',
        height: '100%',
        borderRadius: 10, // Bordes redondeados para el mapa
        overflow: 'hidden', // Asegura que los bordes redondeados se apliquen correctamente
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
        backgroundColor: '#E15252', // Color primario para el marcador del usuario
        borderWidth: 2,
        borderColor: 'white',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)', // Sombra sutil
    },
});