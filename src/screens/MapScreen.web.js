// MapScreen.web.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native'; // Importa componentes básicos de RN
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Importa los estilos de Leaflet

// Fix para el icono de Marker en Leaflet (problema común en React)
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function MapScreenWeb() {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

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
            setErrorMsg('Geolocation is not supported by this browser.');
        }
    }, []);

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

    return (
        <View style={styles.container}>
            <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={styles.map}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.latitude, location.longitude]}>
                    <div style={styles.userMarker}></div> {/* Marcador de usuario personalizado */}
                </Marker>
                {/* Aquí podrías mapear tus trampas como Markers */}
            </MapContainer>
        </View>
    );
}

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
        overflow: 'hidden', // Asegura que los bordes redondeados se apliquen
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
        backgroundColor: '#E15252', // Color primario
        borderWidth: 2,
        borderColor: 'white',
        boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)', // Sombra sutil
    },
});