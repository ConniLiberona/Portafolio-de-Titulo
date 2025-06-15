// src/screens/MapScreen.web.js (ACTUALIZADO - CON BOTÓN "MI UBICACIÓN EXACTA")
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image, Alert } from 'react-native'; // Importa Alert e Image
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigation } from '@react-navigation/native';

import PinCreationModal from './PinCreationModal';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';

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
function MapInteractionHandler({ targetLocation, markerToOpenId, markerRefs }) {
  const map = useMap();

  // Efecto para volar a la ubicación objetivo
  useEffect(() => {
    if (targetLocation) {
      map.flyTo(targetLocation, map.getZoom() || 15, {
        duration: 1.5, // Duración de la animación en segundos
      });
    }
  }, [map, targetLocation]);

  // Efecto para abrir el popup de un marcador específico
  useEffect(() => {
    if (markerToOpenId && markerRefs.current[markerToOpenId]) {
      markerRefs.current[markerToOpenId].openPopup();
    }
  }, [map, markerToOpenId, markerRefs]);

  return null; // Este componente no renderiza nada visualmente
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

  // Estado para las fichas asociadas al pin seleccionado (para el popup)
  const [associatedFichas, setAssociatedFichas] = useState([]);
  const [loadingFichas, setLoadingFichas] = useState(false);

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
  const [errorMessage, setErrorMessage] = useState('');
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

  // Función para cargar fichas relacionadas con un n_trampa
  const fetchFichasForTrampa = async (n_trampa) => {
    setLoadingFichas(true);
    try {
      console.log(`Buscando fichas para n_trampa: ${n_trampa}`);
      const q = query(collection(db, 'fichas'), where('n_trampa', '==', n_trampa));
      const querySnapshot = await getDocs(q);
      const fichas = [];
      querySnapshot.forEach((doc) => {
        const fichaData = doc.data();
        if (!fichaData.deleted) {
          fichas.push({ id: doc.id, ...fichaData });
        }
      });
      setAssociatedFichas(fichas);
      console.log(`Fichas encontradas para ${n_trampa}:`, fichas);
    } catch (error) {
      console.error("Error al cargar fichas para la trampa: ", error);
      openErrorModal('No se pudieron cargar las fichas asociadas.');
      setAssociatedFichas([]);
    } finally {
      setLoadingFichas(false);
    }
  };

  // Función para ir a la pantalla de detalle de ficha
  const handleGoToFichaDetail = (fichaId) => {
    console.log("Navegando a detalles de ficha:", fichaId);
    navigation.navigate('DetalleFicha', { fichaId: fichaId });
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
              estado: newEstado,
              plaga_detectada: updates.plaga_detectada,
              retirada: updates.retirada
            };
          }
          return marker;
        })
      );
      openSuccessModal(`Estado de la trampa actualizado a: ${newEstado}`);
    } catch (error) {
      console.error("Error al actualizar el estado de la trampa: ", error);
      openErrorModal('No se pudo actualizar el estado de la trampa.');
    }
  };

  // FUNCIÓN DE ELIMINACIÓN REESTRUCTURADA PARA USAR EL MODAL INTERNO
  // Función para solicitar confirmación de eliminación (abre el modal)
  const handleDeletePin = (pinId) => {
    console.log("handleDeletePin llamado para pinId:", pinId);
    setPinToDeleteId(pinId); // Guarda el ID del pin a eliminar
    setShowConfirmDeleteModal(true); // Abre tu modal de confirmación
  };

  // Función que se llama cuando el usuario confirma la eliminación en el modal
  const confirmDelete = async () => {
    if (!pinToDeleteId) return;

    console.log("Confirmada eliminación de pinId:", pinToDeleteId);
    try {
      await deleteDoc(doc(db, "pins", pinToDeleteId));
      console.log("Pin eliminado de Firestore.");
      setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== pinToDeleteId));
      console.log("Pin eliminado del estado local.");
      openSuccessModal("Trampa eliminada correctamente.");
    } catch (error) {
      console.error("Error en confirmDelete al eliminar la trampa: ", error);
      openErrorModal("No se pudo eliminar la trampa.");
    } finally {
      setShowConfirmDeleteModal(false);
      setPinToDeleteId(null);
    }
  };

  // Función que se llama cuando el usuario cancela la eliminación en el modal
  const cancelDelete = () => {
    console.log("Eliminación cancelada.");
    setShowConfirmDeleteModal(false);
    setPinToDeleteId(null);
  };

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
      setMarkerToOpenId(foundMarker.id);
      setSearchText('');
      await fetchFichasForTrampa(foundMarker.n_trampa);
    } else {
      openErrorModal(`No se encontró ninguna trampa con el N°: "${searchText}"`);
      setTargetLocation(null);
      setMarkerToOpenId(null);
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
          // setMapZoom(15); // Si quieres un zoom específico al ubicarte
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

        {/* Marcador de la ubicación del usuario */}
        <Marker position={[location.latitude, location.longitude]}>
          <Popup>
            <div style={{ fontWeight: 'bold' }}>Estás aquí</div>
          </Popup>
          {/* El estilo del marcador de usuario se aplica directamente al div */}
          <div style={styles.userMarker}></div>
        </Marker>

        <MapClickHandler setClickCoords={handleMapClickAndShowModal} />

        <MapInteractionHandler
          targetLocation={targetLocation}
          markerToOpenId={markerToOpenId}
          markerRefs={markerRefs}
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={pinIcons[marker.estado] || pinIcons['default']}
            ref={(ref) => { markerRefs.current[marker.id] = ref; }}
            eventHandlers={{
              popupopen: (e) => {
                L.DomEvent.disableClickPropagation(e.popup._contentNode);
                L.DomEvent.disableScrollPropagation(e.popup._contentNode);
                fetchFichasForTrampa(marker.n_trampa);
              },
              popupclose: () => setAssociatedFichas([])
            }}
          >
            <Popup>
              <div style={{ marginBottom: '5px' }}>
                <strong style={styles.popupTitle}>Trampa N° {marker.n_trampa !== 'N/A' ? marker.n_trampa : 'N/A'}</strong>
              </div>
              <div style={styles.popupText}>
                Descripción: {marker.description}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangePinState(marker.id, estadoKey);
                      }}
                    >
                      {estadoKey.split('/')[0]}
                    </button>
                  ))}
                </div>
                <div style={styles.fichasContainer}>
                  <div style={styles.actionLabel}>Fichas Asociadas ({loadingFichas ? 'Cargando...' : associatedFichas.length}):</div>
                  {loadingFichas ? (
                    <Text style={styles.loadingFichasText}>Cargando fichas...</Text>
                  ) : associatedFichas.length > 0 ? (
                    <View style={styles.fichaButtonsGrid}>
                      {associatedFichas.map((ficha) => (
                        <TouchableOpacity
                          key={ficha.id}
                          style={styles.fichaButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleGoToFichaDetail(ficha.id);
                          }}
                        >
                          <Text style={styles.fichaButtonText}>📄 Trampa {ficha.n_trampa}</Text>
                          {ficha.fecha && (
                            <Text style={styles.fichaButtonDate}>
                              {ficha.fecha.toDate().toLocaleDateString()}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noFichasText}>No hay fichas asociadas a esta trampa.</Text>
                  )}
                </div>

                <button
                  style={{
                    ...styles.deleteButton,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePin(marker.id);
                  }}
                >
                  Eliminar Trampa
                </button>
              </div>
            </Popup>
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

      {/* RENDERIZADO DEL MODAL DE CONFIRMACIÓN */}
      <ConfirmationModal
        visible={showConfirmDeleteModal}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que quieres eliminar esta trampa? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

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
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: '5px',
    margin: '3px',
    minWidth: '80px',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: '8px',
    marginTop: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fichasContainer: {
    marginTop: '10px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#eee',
    paddingTop: '8px',
  },
  fichaButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 5,
  },
  fichaButton: {
    backgroundColor: '#e0f7fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b2ebf2',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
    maxWidth: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    boxShadow: '0 0 5px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
  fichaButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00796b',
    textAlign: 'center',
  },
  fichaButtonDate: {
    fontSize: 11,
    color: '#00796b',
    marginTop: 2,
    textAlign: 'center',
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
  // Nuevo estilo para el botón "Mi Ubicación"
  locateMeButton: {
    position: 'absolute',
    top: 20, // Posiciona en la parte superior
    right: 20, // Posiciona a la derecha
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