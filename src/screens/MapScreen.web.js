// src/screens/MapScreen.web.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Importa el nuevo componente Modal
// ¡¡¡CAMBIO AQUÍ: La ruta DEBE ser relativa a la MISMA carpeta 'screens'!!!
import PinCreationModal from './PinCreationModal'; // <--- CORRECCIÓN CLAVE: './' en lugar de '../'

// Importa Firebase y Firestore
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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

// Definición de iconos personalizados para cada estado
const createColoredPinIcon = (color) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26]
});

const pinIcons = {
  'Activa': createColoredPinIcon('#4CAF50'), // Verde
  'Próxima a vencer': createColoredPinIcon('#FFC107'), // Amarillo
  'Vencida': createColoredPinIcon('#F44336'), // Rojo
  'Inactiva/Retirada': createColoredPinIcon('#9E9E9E'), // Gris
  'Requiere revisión': createColoredPinIcon('#2196F3'), // Azul
  'default': createColoredPinIcon('#007bff'), // Azul por defecto, si el estado no coincide
};

// Función auxiliar para obtener el color de un estado (útil para el texto en el popup)
const getEstadoColor = (estado) => {
  const iconHtml = pinIcons[estado]?.options.html;
  if (iconHtml) {
    const match = iconHtml.match(/background-color:(.*?);/);
    return match ? match[1] : '#000';
  }
  return '#000';
};

// Lógica para determinar el estado de la trampa
const DAYS_ACTIVE = 14;
const DAYS_NEAR_EXPIRY = 28;

const determinarEstadoTrampa = (fecha_instalacion, plaga_detectada = false, retirada = false) => {
  if (retirada) {
    return "Inactiva/Retirada";
  }
  if (plaga_detectada) {
    return "Requiere revisión";
  }

  const hoy = new Date();
  const instalacion = fecha_instalacion instanceof Date ? fecha_instalacion : fecha_instalacion.toDate();
  const diffTime = Math.abs(hoy - instalacion);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < DAYS_ACTIVE) {
    return "Activa";
  } else if (diffDays >= DAYS_ACTIVE && diffDays < DAYS_NEAR_EXPIRY) {
    return "Próxima a vencer";
  } else {
    return "Vencida";
  }
};


// Componente auxiliar para manejar los clics en el mapa
// Ahora solo se encarga de capturar las coordenadas y mostrarlas
function MapClickHandler({ setClickCoords }) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e) => {
      setClickCoords(e.latlng); // Guarda las coordenadas del clic para pasarlas al modal
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, setClickCoords]);

  return null;
}

// Componente principal de la pantalla del mapa
export default function MapScreenWeb() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loadingMarkers, setLoadingMarkers] = useState(true);

  // Estados para el modal de creación de pin
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentClickCoords, setCurrentClickCoords] = useState(null);

  // Función para abrir el modal al hacer clic en el mapa
  const handleMapClickAndShowModal = (coords) => {
    setCurrentClickCoords(coords);
    setIsModalVisible(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setCurrentClickCoords(null);
  };

  // Función para guardar el pin, llamada desde el modal
  const handleSavePin = async (pinData) => {
    try {
      const docRef = await addDoc(collection(db, 'pins'), {
        lat: pinData.lat,
        lng: pinData.lng,
        description: pinData.description,
        timestamp: new Date(),
        fecha_instalacion: new Date(),
        plaga_detectada: (pinData.estado === 'Requiere revisión'),
        retirada: (pinData.estado === 'Inactiva/Retirada'),
        estado: pinData.estado, // Usa el estado seleccionado desde el modal
      });
      Alert.alert('¡Éxito!', 'Pin guardado en Firestore correctamente.');
      // Añadir el nuevo pin al estado local para que se vea en el mapa
      setMarkers(prevMarkers => [...prevMarkers, {
        id: docRef.id,
        ...pinData,
        timestamp: new Date(),
        fecha_instalacion: new Date(),
        plaga_detectada: (pinData.estado === 'Requiere revisión'),
        retirada: (pinData.estado === 'Inactiva/Retirada'),
      }]);
    } catch (error) {
      console.error("Error al guardar el pin en Firestore: ", error);
      Alert.alert('Error', 'No se pudo guardar el pin en Firestore. Revisa tu conexión o permisos.');
    }
  };

  // Función para manejar el cambio de estado de un pin en Firestore y localmente
  const handleChangePinState = async (pinId, newEstado) => {
    try {
      const pinRef = doc(db, 'pins', pinId);
      const updates = { estado: newEstado };

      if (newEstado === 'Inactiva/Retirada') {
        updates.retirada = true;
      } else {
        updates.retirada = false;
      }

      if (newEstado === 'Requiere revisión') {
        updates.plaga_detectada = true;
      } else {
        updates.plaga_detectada = false;
      }

      await updateDoc(pinRef, updates);

      setMarkers(prevMarkers =>
        prevMarkers.map(marker => {
          if (marker.id === pinId) {
            return {
              ...marker,
              ...updates,
              estado: newEstado, // Usa el newEstado directamente
              plaga_detectada: updates.plaga_detectada,
              retirada: updates.retirada
            };
          }
          return marker;
        })
      );
      Alert.alert('¡Éxito!', `Estado del pin actualizado a: ${newEstado}`);
    } catch (error) {
      console.error("Error al actualizar el estado del pin: ", error);
      Alert.alert('Error', 'No se pudo actualizar el estado del pin.');
    }
  };

  // Función para eliminar un marcador
  const handleDeletePin = async (pinId) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar este pin? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "pins", pinId));
              setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== pinId));
              Alert.alert("¡Éxito!", "Pin eliminado correctamente.");
            } catch (error) {
              console.error("Error al eliminar el pin: ", error);
              Alert.alert("Error", "No se pudo eliminar el pin.");
            }
          }
        }
      ]
    );
  };

  // useEffect para obtener la ubicación del usuario
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

  // useEffect para cargar los pines existentes desde Firestore al montar el componente
  useEffect(() => {
    const fetchMarkers = async () => {
      setLoadingMarkers(true);
      try {
        const q = query(collection(db, 'pins'));
        const querySnapshot = await getDocs(q);

        const fetchedMarkers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
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
              timestamp: data.timestamp ? data.timestamp.toDate() : null,
              fecha_instalacion: fechaInstalacion,
              plaga_detectada: data.plaga_detectada || false,
              retirada: data.retirada || false,
              estado: estadoFinal,
            });
          }
        });
        setMarkers(fetchedMarkers);
      } catch (error) {
        console.error("Error al cargar los pines de Firestore: ", error);
        Alert.alert('Error de Carga', 'No se pudieron cargar los pines existentes.');
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
          <Popup>
            <div style={{ fontWeight: 'bold' }}>Estás aquí</div>
          </Popup>
          <div style={styles.userMarker}></div>
        </Marker>

        {/* MapClickHandler ahora solo pasa las coordenadas del clic */}
        <MapClickHandler setClickCoords={handleMapClickAndShowModal} />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={pinIcons[marker.estado] || pinIcons['default']}
          >
            <Popup>
              <div style={{ marginBottom: '5px' }}>
                <strong style={styles.popupTitle}>{marker.description}</strong>
              </div>
              <div style={styles.popupText}>
                Estado: <span style={{ fontWeight: 'bold', color: getEstadoColor(marker.estado) }}>{marker.estado}</span>
              </div>
              <div style={styles.popupText}>Lat: {marker.lat.toFixed(4)}, Lng: {marker.lng.toFixed(4)}</div>
              {marker.fecha_instalacion && (
                <div style={styles.popupText}>Instalación: {marker.fecha_instalacion.toLocaleDateString()}</div>
              )}
              {marker.timestamp && (
                <div style={styles.popupText}>Última Actualización: {marker.timestamp.toLocaleDateString()}</div>
              )}

              <div style={styles.popupActions}>
                <div style={styles.actionLabel}>Cambiar Estado:</div>
                <div style={styles.statusButtonsContainer}>
                  {Object.keys(pinIcons).filter(s => s !== 'default').map(estadoKey => (
                    <button
                      key={estadoKey}
                      style={{
                        ...styles.statusButton,
                        backgroundColor: getEstadoColor(estadoKey),
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleChangePinState(marker.id, estadoKey)}
                    >
                      {estadoKey.split('/')[0]}
                    </button>
                  ))}
                </div>
                <button
                  style={{
                    ...styles.deleteButton,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleDeletePin(marker.id)}
                >
                  Eliminar Pin
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* El modal de creación de pin */}
      {currentClickCoords && ( // Solo renderiza el modal si hay coordenadas de clic
        <PinCreationModal
          visible={isModalVisible}
          onClose={handleCloseModal}
          onSave={handleSavePin}
          coords={currentClickCoords}
        />
      )}
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
  popupTitle: {
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '5px',
    color: '#333',
  },
  popupText: {
    fontSize: '13px',
    color: '#555',
    marginBottom: '3px',
  },
  popupActions: {
    marginTop: '10px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#eee',
    paddingTop: '8px',
  },
  actionLabel: {
    fontSize: '12px',
    color: '#777',
    marginBottom: '5px',
  },
  statusButtonsContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  statusButton: {
    padding: '5px 10px',
    borderRadius: '5px',
    margin: '3px',
    minWidth: '80px',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    padding: '8px 15px',
    borderRadius: '8px',
    marginTop: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});