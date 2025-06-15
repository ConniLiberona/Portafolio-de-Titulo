// src/screens/MapScreen.web.js (ACTUALIZADO - CÓDIGO FINAL CON BUSCADOR DE PIN Y BUSCADOR ABAJO)
import React, { useState, useEffect, useRef } from 'react'; // ¡Importa useRef!
import { StyleSheet, View, Text, Alert, TouchableOpacity, TextInput } from 'react-native'; // ¡Importa TextInput!
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigation } from '@react-navigation/native';

import PinCreationModal from './PinCreationModal';

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
      // Importante: Reiniciar targetLocation después de usarlo para evitar animaciones repetidas
      // Esto se haría en el padre a través de una función pasada como prop si este componente necesitara manejarlo.
      // Por ahora, el padre se encargará de resetearlo.
    }
  }, [map, targetLocation]);

  // Efecto para abrir el popup de un marcador específico
  useEffect(() => {
    if (markerToOpenId && markerRefs.current[markerToOpenId]) {
      markerRefs.current[markerToOpenId].openPopup();
      // Importante: Reiniciar markerToOpenId después de usarlo
      // Esto se haría en el padre a través de una función pasada como prop si este componente necesitara manejarlo.
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

  const navigation = useNavigation();

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
      Alert.alert('Error', 'No se pudieron cargar las fichas asociadas.');
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
      Alert.alert('¡Éxito!', 'Trampa guardada en Firestore correctamente.');
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
      Alert.alert('Error', 'No se pudo guardar la trampa en Firestore. Revisa tu conexión o permisos.');
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
      Alert.alert('¡Éxito!', `Estado de la trampa actualizado a: ${newEstado}`);
    } catch (error) {
      console.error("Error al actualizar el estado de la trampa: ", error);
      Alert.alert('Error', 'No se pudo actualizar el estado de la trampa.');
    }
  };

  // Función para eliminar un marcador
  const handleDeletePin = async (pinId) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar esta trampa? Esta acción no se puede deshacer.",
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
              Alert.alert("¡Éxito!", "Trampa eliminada correctamente.");
            } catch (error) {
              console.error("Error al eliminar la trampa: ", error);
              Alert.alert("Error", "No se pudo eliminar la trampa.");
            }
          }
        }
      ]
    );
  };

  // Función para manejar la búsqueda de pines
  const handleSearchPin = async () => { // ¡CAMBIO: Ahora es async!
    if (!searchText) {
      Alert.alert('Búsqueda', 'Por favor, introduce un número de trampa para buscar.');
      return;
    }

    const foundMarker = markers.find(
      (m) => m.n_trampa && String(m.n_trampa).toLowerCase() === String(searchText).toLowerCase()
    );

    if (foundMarker) {
      setTargetLocation([foundMarker.lat, foundMarker.lng]); // Establece la ubicación para que el mapa vuele
      setMarkerToOpenId(foundMarker.id); // Establece el ID del marcador cuyo popup debe abrirse
      setSearchText(''); // Limpia el campo de búsqueda

      // *** INICIO DEL CAMBIO PRINCIPAL ***
      // Llama a fetchFichasForTrampa directamente después de encontrar el marcador
      // Esto asegura que las fichas se carguen cuando el popup se abre programáticamente.
      await fetchFichasForTrampa(foundMarker.n_trampa); 
      // *** FIN DEL CAMBIO PRINCIPAL ***

    } else {
      Alert.alert('No Encontrado', `No se encontró ninguna trampa con el N°: "${searchText}"`);
      setTargetLocation(null); // Resetea la ubicación objetivo
      setMarkerToOpenId(null); // Resetea el marcador a abrir
    }
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
          // console.log("Datos del pin de Firestore:", data); // Log para depuración

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
        // console.log("Pines cargados:", fetchedMarkers);
      } catch (error) {
        console.error("Error al cargar las trampas de Firestore: ", error);
        Alert.alert('Error de Carga', 'No se pudieron cargar las trampas existentes.');
      } finally {
        setLoadingMarkers(false);
      }
    };

    fetchMarkers();
  }, []);

  // Reset targetLocation y markerToOpenId después de un tiempo para evitar re-triggers
  // Puedes ajustar el tiempo según la duración de tu animación.
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
      {/* El MapContainer va primero en el orden de renderizado si quieres que el searchContainer lo overlay */}
      <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={styles.map}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[location.latitude, location.longitude]}>
          <Popup>
            <div style={{ fontWeight: 'bold' }}>Estás aquí</div>
          </Popup>
          {/* Este div style crea un marcador de círculo rojo para la ubicación del usuario */}
          <div style={styles.userMarker}></div>
        </Marker>

        <MapClickHandler setClickCoords={handleMapClickAndShowModal} />

        {/* Componente que interactúa con el mapa para volar y abrir popups */}
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
            ref={(ref) => { markerRefs.current[marker.id] = ref; }} // Guarda la referencia al objeto Leaflet Marker
            eventHandlers={{
              popupopen: () => fetchFichasForTrampa(marker.n_trampa),
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
                      onClick={() => handleChangePinState(marker.id, estadoKey)}
                    >
                      {estadoKey.split('/')[0]}
                    </button>
                  ))}
                </div>
                {/* Sección para mostrar fichas asociadas */}
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
                          onPress={() => handleGoToFichaDetail(ficha.id)}
                        >
                          <Text style={styles.fichaButtonText}>📄 Trampa {ficha.n_trampa}</Text> {/* Muestra n_trampa */}
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
                  onClick={() => handleDeletePin(marker.id)}
                >
                  Eliminar Trampa
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Search Input y Botón - Ahora posicionado en la parte inferior */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por N° Trampa"
          value={searchText}
          onChangeText={setSearchText}
          keyboardType="numeric" // Sugiere teclado numérico en móviles
          onSubmitEditing={handleSearchPin} // Permite buscar al presionar Enter/Go
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    position: 'relative', // Importante para posicionar el searchContainer absolutamente
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
  // --- Estilos ACTUALIZADOS para la funcionalidad de búsqueda (ahora abajo) ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, // Cambiado a borderTopWidth
    borderTopColor: '#eee', // Cambiado a borderTopColor
    position: 'absolute', // Posiciona el contenedor de búsqueda sobre el mapa
    bottom: 10, // Distancia desde la parte inferior (cambiado de top)
    left: 10,
    right: 10,
    zIndex: 1000, // Asegura que esté por encima del mapa
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, // Sombra hacia arriba
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchInput: {
    flex: 1, // Hace que el input ocupe el espacio restante
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    fontSize: 15,
  },
  searchButton: {
    backgroundColor: '#007bff', // Un azul estándar para el botón
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
});