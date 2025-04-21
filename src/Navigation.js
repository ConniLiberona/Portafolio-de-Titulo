import { createStackNavigator } from '@react-navigation/stack'; 
import { NavigationContainer } from '@react-navigation/native';
import Login from './screens/Login';
import Home from './screens/Home';
import NuevaFicha from './screens/NuevaFicha';


const Stack = createStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={Login} 
      options={{
        title: "MONITOREO DE TRAMPAS",
        headerTintColor: "white",
        headerTitleAlign: "center",
        headerStyle: {backgroundColor: "#E15252"},
      }}/>
      <Stack.Screen name="Home" component={Home} 
      options={{
        title: "HOME",
        headerTintColor: "white",
        headerTitleAlign: "center",
        headerStyle: {backgroundColor: "#E15252"},
        presentation: 'modal',
      }}/>
      <Stack.Screen name="NuevaFicha" component={NuevaFicha} 
      options={{
        title: "NUEVA FICHA",
        headerTintColor: "white",
        headerTitleAlign: "center",
        headerStyle: {backgroundColor: "#E15252"},
        presentation: 'modal',
      }}/>


    </Stack.Navigator>
  );
}

export default function Navigation() {
    return (
        <NavigationContainer>
          <MyStack/>
        </NavigationContainer>
      );
}