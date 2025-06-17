import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigation } from '@react-navigation/native';

import PinCreationModal from './PinCreationModal';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';
import MarkerInfoModal from './MarkerInfoModal'; // Importa el nuevo modal

// Importa Firebase y Firestore
import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
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

// Estados válidos para el pin (copiados de PinCreationModal para consistencia)
const validPinStates = [
  'Activa',
  'Próxima a vencer',
  'Vencida',
  'Inactiva/Retirada',
  'Requiere revisión',
];

// Función para obtener el color asociado a cada estado (copiada de PinCreationModal)
const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Activa': return '#4CAF50'; // Verde
    case 'Próxima a vencer': return '#FFC107'; // Amarillo
    case 'Vencida': return '#F44336'; // Rojo
    case 'Inactiva/Retirada': return '#9E9E9E'; // Gris
    case 'Requiere revisión': return '#2196F3'; // Azul
    default: return '#007bff'; // Azul por defecto (si no hay coincidencia)
  }
};

// Definición de iconos personalizados para cada estado (usando la función getEstadoColor)
const createColoredPinIcon = (color) => new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26]
});

const pinIcons = {
  'Activa': createColoredPinIcon(getEstadoColor('Activa')),
  'Próxima a vencer': createColoredPinIcon(getEstadoColor('Próxima a vencer')),
  'Vencida': createColoredPinIcon(getEstadoColor('Vencida')),
  'Inactiva/Retirada': createColoredPinIcon(getEstadoColor('Inactiva/Retirada')),
  'Requiere revisión': createColoredPinIcon(getEstadoColor('Requiere revisión')),
  'default': createColoredPinIcon(getEstadoColor('default')),
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
function MapClickHandler({ setClickCoords }) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e) => {
      setClickCoords(e.latlng);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, setClickCoords]);

  return null;
}

// Componente auxiliar para manejar las interacciones del mapa desde el padre (ej. búsqueda)
function MapInteractionHandler({ targetLocation, markerToOpenId, markerRefs, onMarkerClickedFromSearch }) {
  const map = useMap();

  // Efecto para volar a la ubicación objetivo
  useEffect(() => {
    if (targetLocation) {
      map.flyTo(targetLocation, map.getZoom() || 15, {
        duration: 1.5, // Duración de la animación en segundos
      });
    }
  }, [map, targetLocation]);

  // Efecto para abrir el popup de un marcador específico (ahora abre el MarkerInfoModal)
  useEffect(() => {
    if (markerToOpenId && markerRefs.current[markerToOpenId]) {
      // En lugar de abrir el popup de Leaflet, disparamos la función para abrir el modal
      const marker = markerRefs.current[markerToOpenId].options.markerData; // Acceder a los datos originales
      if (marker) {
        onMarkerClickedFromSearch(marker);
      }
    }
  }, [map, markerToOpenId, markerRefs, onMarkerClickedFromSearch]);

  return null; // Este componente no renderiza nada visualmente
}

// NUEVO: Icono personalizado para la ubicación del usuario con animación de pulso que se expande
const userLocationIcon = L.divIcon({
  className: 'user-location-marker-container',
  html: `
    <style>
      @keyframes pulse-outer {
        0% {
          transform: translate(-50%, -50%) scale(0.6);
          opacity: 0.8;
          border-width: 4px;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 0.1;
          border-width: 1px;
        }
        100% {
          transform: translate(-50%, -50%) scale(0.6);
          opacity: 0.8;
          border-width: 4px;
        }
      }
      .user-location-marker-dot {
        background-color: #007bff; /* Azul sólido */
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%); /* Centrar el punto */
        z-index: 2;
      }
      .user-location-marker-pulse {
        /* No es un color de fondo, es un borde que crece y se desvanece */
        width: 40px; /* Tamaño máximo del pulso */
        height: 40px;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        /* El color del pulso ahora es el borde */
        border: 4px solid rgba(0, 122, 255, 0.7);
        animation: pulse-outer 2s infinite ease-out; /* Aplica la animación */
        box-sizing: border-box; /* Para que el padding/borde no afecte el tamaño total */
        z-index: 1;
      }
    </style>
    <div class="user-location-marker-pulse"></div>
    <div class="user-location-marker-dot"></div>
  `,
  iconSize: [40, 40], // Tamaño total del icono (para el contenedor), ajusta según el pulso máximo
  iconAnchor: [20, 20], // Punto de anclaje (centro del icono)
  popupAnchor: [0, -20] // Ajuste del popup
});


// Componente principal de la pantalla del mapa
export default function MapScreenWeb() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loadingMarkers, setLoadingMarkers] = useState(true);

  // Estados para el modal de creación de pin
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentClickCoords, setCurrentClickCoords] = useState(null);

  // NUEVOS ESTADOS PARA EL MODAL DE INFORMACIÓN DEL MARCADOR
  const [isMarkerInfoModalVisible, setIsMarkerInfoModalVisible] = useState(false);
  const [selectedMarkerData, setSelectedMarkerData] = useState(null);

  // Estados para la funcionalidad de búsqueda
  const [searchText, setSearchText] = useState('');
  const [targetLocation, setTargetLocation] = useState(null); // Para centrar el mapa
  const [markerToOpenId, setMarkerToOpenId] = useState(null); // Para abrir el popup del marcador
  const markerRefs = useRef({}); // Para almacenar referencias a los objetos Leaflet Marker

  // Estados para el modal de confirmación de eliminación de TRAMPA
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [pinToDeleteId, setPinToDeleteId] = useState(null);

  // <-- NUEVOS ESTADOS PARA LOS MODALES DE ÉXITO Y ERROR GENERAL -->
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // Inicializado correctamente
  // <-- FIN NUEVOS ESTADOS -->

  const navigation = useNavigation();

  // Funciones para manejar los modales de éxito y error
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


  // Función para abrir el modal al hacer clic en el mapa
  const handleMapClickAndShowModal = (coords) => {
    setCurrentClickCoords(coords);
    setIsModalVisible(true);
  };

  // Función para cerrar el modal de creación de pin
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setCurrentClickCoords(null);
  };

  // Función para guardar el pin, llamada desde el modal
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
      }]);
      console.log("Pin añadido al estado local:", { id: docRef.id, ...pinData, n_trampa: nTrampaToSave });
    } catch (error) {
      console.error("Error al guardar la trampa en Firestore: ", error);
      openErrorModal('No se pudo guardar la trampa en Firestore. Revisa tu conexión o permisos.');
    } finally {
        handleCloseModal(); // Cierra el modal de creación después de guardar
    }
  };

  // Callback para actualizar un marcador desde MarkerInfoModal
  const handleUpdateMarker = useCallback((pinId, updates) => {
    setMarkers(prevMarkers =>
      prevMarkers.map(marker => {
        if (marker.id === pinId) {
          return {
            ...marker,
            ...updates,
            estado: updates.estado, // Asegura que el estado se actualice
            plaga_detectada: updates.plaga_detectada,
            retirada: updates.retirada
          };
        }
        return marker;
      })
    );
    // Si el marcador seleccionado es el que se actualizó, actualiza sus datos en el modal
    setSelectedMarkerData(prevData => (prevData && prevData.id === pinId ? { ...prevData, ...updates } : prevData));
  }, []);


  // Callback para eliminar un marcador desde MarkerInfoModal
  const handleDeleteMarker = useCallback((pinId) => {
    setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== pinId));
    setIsMarkerInfoModalVisible(false); // Cierra el modal de información si el marcador fue eliminado
    setSelectedMarkerData(null);
  }, []);

  // Función para manejar la búsqueda de pines
  const handleSearchPin = async () => {
    if (!searchText) {
      openErrorModal('Por favor, introduce un número de trampa para buscar.');
      return;
    }

    const foundMarker = markers.find(
      (m) => m.n_trampa && String(m.n_trampa).toLowerCase() === String(searchText).toLowerCase()
    );

    if (foundMarker) {
      setTargetLocation([foundMarker.lat, foundMarker.lng]);
      // Usamos los datos del marcador encontrado para abrir el modal
      setSelectedMarkerData(foundMarker);
      setIsMarkerInfoModalVisible(true);
      setSearchText('');
    } else {
      openErrorModal(`No se encontró ninguna trampa con el N°: "${searchText}"`);
      setTargetLocation(null);
      setSelectedMarkerData(null);
      setIsMarkerInfoModalVisible(false);
    }
  };

  // Función para ubicar al usuario (MEJORADA PARA ALTA PRECISIÓN)
  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newPos); // Actualiza el estado de la ubicación
          setTargetLocation([newPos.latitude, newPos.longitude]); // Centra el mapa
          openSuccessModal("Mapa centrado en tu ubicación actual.");
        },
        (error) => {
          console.error("Error al obtener la ubicación: ", error);
          let errorMessage = "No se pudo obtener tu ubicación actual.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Permiso de ubicación denegado. Por favor, habilítalo en la configuración de tu navegador.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Información de ubicación no disponible.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Tiempo de espera agotado al intentar obtener la ubicación.";
          }
          openErrorModal(errorMessage);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 } // Opciones para alta precisión
      );
    } else {
      openErrorModal("Tu navegador no soporta la geolocalización.");
    }
  };

  // useEffect para obtener la ubicación del usuario al cargar (ahora usa locateUser)
  useEffect(() => {
    locateUser(); // Llama a la función de ubicación al montar el componente
  }, []); // Se ejecuta solo una vez al montar

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

  // Reset targetLocation y markerToOpenId después de un tiempo para evitar re-triggers
  useEffect(() => {
    if (targetLocation || markerToOpenId) {
      const timer = setTimeout(() => {
        setTargetLocation(null);
        setMarkerToOpenId(null);
      }, 2000); // Un poco más largo que la duración de la animación flyTo
      return () => clearTimeout(timer);
    }
  }, [targetLocation, markerToOpenId]);


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
      <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={styles.map}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcador de la ubicación del usuario con el nuevo icono de pulso */}
        <Marker position={[location.latitude, location.longitude]} icon={userLocationIcon}>
          <Popup>
            <View>
              <Text style={{ fontWeight: 'bold' }}>Estás aquí</Text>
            </View>
          </Popup>
        </Marker>

        <MapClickHandler setClickCoords={handleMapClickAndShowModal} />

        <MapInteractionHandler
          targetLocation={targetLocation}
          markerToOpenId={markerToOpenId}
          markerRefs={markerRefs}
          onMarkerClickedFromSearch={(marker) => {
            setSelectedMarkerData(marker);
            setIsMarkerInfoModalVisible(true);
          }}
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={pinIcons[marker.estado] || pinIcons['default']}
            ref={(ref) => { markerRefs.current[marker.id] = ref; }}
            eventHandlers={{
                click: () => { // Usamos 'click' en lugar de 'popupopen' para activar el modal
                    setSelectedMarkerData(marker);
                    setIsMarkerInfoModalVisible(true);
                },
            }}
            options={{ markerData: marker }} // Almacena los datos originales para acceso en MapInteractionHandler
          >
            {/* YA NO SE USA EL POPUP DE LEAFLET AQUÍ, SE USA UN MODAL PERSONALIZADO */}
            {/* <Popup>
              ... contenido del popup antiguo ...
            </Popup> */}
          </Marker>
        ))}
      </MapContainer>

      {/* Botón para ubicar al usuario */}
      <TouchableOpacity style={styles.locateMeButton} onPress={locateUser}>
        <Image
          source={require('../../assets/my_location_icon.png')} // Asegúrate de que esta ruta sea correcta
          style={styles.locateMeIcon}
        />
      </TouchableOpacity>

      {/* Search Input y Botón - Ahora posicionado en la parte inferior */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por N° Trampa"
          placeholderTextColor="#999" // Un gris suave para diferenciarlo
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

      {/* NUEVO: MODAL DE INFORMACIÓN DEL MARCADOR */}
      {selectedMarkerData && (
        <MarkerInfoModal
          visible={isMarkerInfoModalVisible}
          onClose={() => {
            setIsMarkerInfoModalVisible(false);
            setSelectedMarkerData(null);
          }}
          markerData={selectedMarkerData}
          onUpdateMarker={handleUpdateMarker} // Pasa el callback para actualizar el estado de markers
          onDeleteMarker={handleDeleteMarker} // Pasa el callback para eliminar el marcador
          openSuccessModal={openSuccessModal}
          openErrorModal={openErrorModal}
        />
      )}

      {/* RENDERIZADO DEL MODAL DE CONFIRMACIÓN (ahora solo se usa si tenías uno aparte de MarkerInfoModal) */}
      {/* <ConfirmationModal
        visible={showConfirmDeleteModal}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que quieres eliminar esta trampa? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      /> */}

      {/* <-- RENDERIZADO DEL NUEVO MODAL DE ÉXITO --> */}
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={closeSuccessModal}
      />

      {/* <-- RENDERIZADO DE UN POSIBLE MODAL DE ERROR GENERAL (similar a SuccessModal) --> */}
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
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    position: 'relative',
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
  // --- YA NO NECESITAMOS popupContent AQUÍ, LO MANEJA MarkerInfoModal ---
  // popupContent: {
  //   padding: 20,
  //   width: '90%',
  //   maxHeight: 'calc(100vh - 200px)',
  //   overflowY: 'auto',
  //   alignSelf: 'center',
  // },
  // ... (eliminar todos los estilos relacionados con popupTitle, popupText, popupActions, radioGroupPopup, deleteButton, fichasContainer, etc. de MapScreen.web.js)

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    zIndex: 1000,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    boxShadow: '0 -2px 3px rgba(0, 0, 0, 0.1)',
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
    top: 20,
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
});