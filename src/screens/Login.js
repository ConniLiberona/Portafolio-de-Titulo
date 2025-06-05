import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';

import appFirebase from '../../credenciales'
import { getAuth, signInWithEmailAndPassword} from 'firebase/auth'
const auth = getAuth(appFirebase)


export default function Login(props){

    //creamos la variable de estado
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const logueo = async()=>{
        try{
            await signInWithEmailAndPassword(auth, email, password)
            Alert.alert('Iniciando sesión', 'Accediendo...');
            setTimeout(() => {
            props.navigation.navigate('Home');
            }, 1000); // espera 1 segundo
        }catch (error){
            console.log(error);
            Alert.alert('Error','El usuario o la contraseña son incorrectos')
        }
    }

    return (
        <View style={styles.padre}>
            {/* Si el texto "MONITOREO DE TRAMPAS" se mostraba bien antes sin una barra superior explícita,
                es porque:
                1. O tu archivo 'SAG.png' ya incluye ese texto (lo más probable según las capturas).
                2. O hay otro componente o línea de código fuera de este archivo que lo renderiza.
                He quitado la barra superior que añadí para evitar la duplicación.
            */}
            <View>
                <Image source={require('../../assets/SAG.png')} style={styles.profile}/>
            </View>

            <View style={styles.tarjeta}>
                <View style={styles.cajaTexto}>
                    <TextInput
                        placeholder='correo@gmail.com'
                        style={styles.input}
                        onChangeText={(text)=>setEmail(text)}
                        autoCapitalize='none' // Para evitar que el correo se autocomplete con mayúsculas
                        keyboardType='email-address' // Sugerir teclado de correo electrónico
                        placeholderTextColor="#666" // Color del placeholder para mejor contraste
                    />
                </View>

                <View style={styles.cajaTexto}>
                    <TextInput
                        placeholder='Password'
                        style={styles.input}
                        onChangeText={(text)=>setPassword(text)}
                        secureTextEntry={true}
                        placeholderTextColor="#666" // Color del placeholder para mejor contraste
                    />
                </View>

                <View style={styles.PadreBoton}>
                    <TouchableOpacity style={styles.cajaBoton} onPress={logueo}>
                        <Text style={styles.TextoBoton}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    padre:{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'white',
        // Asegúrate de que el contenido no se pegue a la barra de estado en Android.
        // Si tu 'SAG.png' ya tiene un margen superior, puedes ajustar esto.
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    profile:{
        width:100,
        height:100,
        // Si tu imagen SAG.png ya es rectangular e incluye el texto,
        // considera quitar borderRadius y borderColor, o ajustarlos si causan un recorte no deseado.
        borderRadius:50,
        borderColor:'white',
        marginBottom: 30, // Espacio entre la imagen y la tarjeta de login
    },
    tarjeta:{
        margin:20,
        backgroundColor:'white',
        borderRadius:20,
        width:'90%',
        maxWidth: 400, // Limita el ancho en pantallas grandes
        padding:20,
        shadowColor:'#000',
        shadowOffset:{
            width:0,
            height:2
        },
        shadowOpacity:0.25,
        shadowRadius:4,
        elevation:5,
    },
    cajaTexto:{
        backgroundColor:'#cccccc90',
        borderRadius:30,
        marginVertical:10,
        borderWidth: 1,
        borderColor: 'transparent', // Asegura que no haya un borde visible por defecto
        overflow: 'hidden', // Importante para que el contenido se ajuste al borderRadius
    },
    input: {
        paddingHorizontal:15,
        paddingVertical: 14, // <--- Altura ajustada aquí (puedes modificarla)
        fontSize: 16, // Tamaño de la fuente dentro del input
        color: '#333', // Color del texto de entrada
        ...Platform.select({
            web: {
                outlineStyle: 'none', // Quita el outline en navegadores web
            },
        }),
        // Para iOS/Android, el borde de enfoque se maneja con 'borderColor'
        // y 'borderWidth' en el 'cajaTexto'. Al ser transparente, no se verá.
    },
    PadreBoton:{
        alignItems:'center'
    },
    cajaBoton:{
        backgroundColor:'#E15252',
        borderRadius:30,
        paddingVertical:16, // Altura del botón
        width:180, // Ancho del botón
        marginTop:25, // Espacio superior del botón
        shadowColor:'#000', // Sombra para el botón
        shadowOffset:{
            width:0,
            height:2
        },
        shadowOpacity:0.25,
        shadowRadius:3.84,
        elevation:5,
    },
    TextoBoton:{
        textAlign:'center',
        color:'white',
        fontSize: 18,
        fontWeight: 'bold',
    }
});