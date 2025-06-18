import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigation } from '@react-navigation/native';

import PinCreationModal from './PinCreationModal';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';
import MarkerInfoModal from './MarkerInfoModal';

import { getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import appMoscasSAG from '../../credenciales';

const db = getFirestore(appMoscasSAG);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

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

function MapInteractionHandler({ targetLocation, markerToOpenId, markerRefs, onMarkerClickedFromSearch }) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation) {
      map.flyTo(targetLocation, map.getZoom() || 15, {
        duration: 1.5,
      });
    }
  }, [map, targetLocation]);

  useEffect(() => {
    if (markerToOpenId && markerRefs.current[markerToOpenId]) {
      const marker = markerRefs.current[markerToOpenId].options.markerData;
      if (marker) {
        onMarkerClickedFromSearch(marker);
      }
    }
  }, [map, markerToOpenId, markerRefs, onMarkerClickedFromSearch]);

  return null;
}

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
        background-color: #007bff;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
      }
      .user-location-marker-pulse {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        border: 4px solid rgba(0, 122, 255, 0.7);
        animation: pulse-outer 2s infinite ease-out;
        box-sizing: border-box;
        z-index: 1;
      }
    </style>
    <div class="user-location-marker-pulse"></div>
    <div class="user-location-marker-dot"></div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});


export default function MapScreenWeb() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loadingMarkers, setLoadingMarkers] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentClickCoords, setCurrentClickCoords] = useState(null);

  const [isMarkerInfoModalVisible, setIsMarkerInfoModalVisible] = useState(false);
  const [selectedMarkerData, setSelectedMarkerData] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [targetLocation, setTargetLocation] = useState(null);
  const [markerToOpenId, setMarkerToOpenId] = useState(null);
  const markerRefs = useRef({});

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


  const handleMapClickAndShowModal = (coords) => {
    setCurrentClickCoords(coords);
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
      setTargetLocation([foundMarker.lat, foundMarker.lng]);
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

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newPos);
          setTargetLocation([newPos.latitude, newPos.longitude]);
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
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    } else {
      openErrorModal("Tu navegador no soporta la geolocalización.");
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

  useEffect(() => {
    if (targetLocation || markerToOpenId) {
      const timer = setTimeout(() => {
        setTargetLocation(null);
        setMarkerToOpenId(null);
      }, 2000);
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
                click: () => {
                    setSelectedMarkerData(marker);
                    setIsMarkerInfoModalVisible(true);
                },
            }}
            options={{ markerData: marker }}
          >
          </Marker>
        ))}
      </MapContainer>

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