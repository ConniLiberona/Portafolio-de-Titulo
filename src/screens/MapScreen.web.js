// src/screens/MapScreen.web.js (ACTUALIZADO - CÓDIGO FINAL CON BOTONES DE FICHA)
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigation } from '@react-navigation/native'; // ¡Importa useNavigation!

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

  const navigation = useNavigation(); // ¡Obtenemos la instancia de navegación!

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
      // Es crucial que el tipo de dato de n_trampa en Firestore sea el mismo que el que se usa aquí para la consulta.
      const q = query(collection(db, 'fichas'), where('n_trampa', '==', n_trampa));
      const querySnapshot = await getDocs(q);
      const fichas = [];
      querySnapshot.forEach((doc) => {
        // Asegúrate de filtrar las fichas que están "en la papelera" si no quieres mostrarlas
        const fichaData = doc.data();
        if (!fichaData.deleted) { // Añade esta línea para filtrar fichas eliminadas lógicamente
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
    // Usamos navigation.navigate para ir a la pantalla DetalleFicha
    // y pasamos el fichaId como parámetro de ruta.
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
        n_trampa: nTrampaToSave, // Guardar el número de trampa tal cual viene del modal
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
          console.log("Datos del pin de Firestore:", data); // Log para depuración

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
        console.log("Pines cargados:", fetchedMarkers);
      } catch (error) {
        console.error("Error al cargar las trampas de Firestore: ", error);
        Alert.alert('Error de Carga', 'No se pudieron cargar las trampas existentes.');
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

        <MapClickHandler setClickCoords={handleMapClickAndShowModal} />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={pinIcons[marker.estado] || pinIcons['default']}
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
                {/* Sección para mostrar fichas asociadas - ACTUALIZADO */}
                <div style={styles.fichasContainer}>
                  <div style={styles.actionLabel}>Fichas Asociadas ({loadingFichas ? 'Cargando...' : associatedFichas.length}):</div>
                  {loadingFichas ? (
                    <Text style={styles.loadingFichasText}>Cargando fichas...</Text>
                  ) : associatedFichas.length > 0 ? (
                    <View style={styles.fichaButtonsGrid}> {/* Contenedor para los botones */}
                      {associatedFichas.map((ficha) => (
                        <TouchableOpacity
                          key={ficha.id}
                          style={styles.fichaButton} // Nuevo estilo para el botón
                          onPress={() => handleGoToFichaDetail(ficha.id)}
                        >
                          <Text style={styles.fichaButtonText}>📄 Ficha {ficha.id.substring(0, 4)}...</Text> {/* Emoji y ID corto */}
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
  // ESTILOS NUEVOS/ACTUALIZADOS PARA BOTONES DE FICHA
  fichaButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // Centra los botones si no llenan la línea
    gap: 8, // Espacio entre los botones
    marginTop: 5,
  },
  fichaButton: {
    backgroundColor: '#e0f7fa', // Un azul claro
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b2ebf2', // Borde un poco más oscuro
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%', // Permite que haya dos botones por fila en pantallas pequeñas
    maxWidth: '48%', // Ajuste para el espaciado
    flexGrow: 1, // Permite que los botones crezcan para llenar el espacio
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    cursor: 'pointer', // Indica que es clickable
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    // Esto es para React Native Web, para simular :hover
    // Si usas CSS modules o styled-components esto sería más limpio
    // En inline styles, necesitas usar bibliotecas como `react-hover` o
    // simplemente definir el estilo de hover con JavaScript si es necesario,
    // o incluir un archivo CSS aparte para estos pseudo-selectores.
    // Para propósitos de este ejemplo, lo dejo como comentario para que sepas.
    // ':hover': {
    //     backgroundColor: '#b2ebf2',
    //     transform: 'scale(1.02)',
    // }
  },
  fichaButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00796b', // Un verde azulado oscuro
    textAlign: 'center',
  },
  fichaButtonDate: {
    fontSize: 11,
    color: '#00796b',
    marginTop: 2,
    textAlign: 'center',
  },
  // ELIMINA O COMENTA LOS ESTILOS ANTIGUOS DE fichaItemTouchable y fichaText
  // fichaItemTouchable: {
  //   backgroundColor: '#eef',
  //   borderRadius: '5px',
  //   padding: '8px',
  //   marginBottom: '5px',
  //   cursor: 'pointer',
  //   border: '1px solid #ddd',
  //   transition: 'background-color 0.2s ease',
  //   '&:hover': {
  //     backgroundColor: '#e0e0f0',
  //   },
  // },
  // fichaText: {
  //   fontSize: '12px',
  //   color: '#333',
  // },
});