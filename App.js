import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "./src/LoginScreen";
import DeliveryPartnerTabs from "./src/Screens/DeliveryPartner/TabNavigator";
import PickUpProducts from "./src/Screens/DeliveryPartner/Orders/PickUpProducts";
import ShopInfoScreen from "./src/Screens/DeliveryPartner/Orders/ShopInfo";
import FinalProductList from './src/Screens/DeliveryPartner/Orders/FinalProductsList';
import DeliveryCompleteScreen from "./src/Screens/DeliveryPartner/Orders/DeliveryCompletedScreen";

import StorePartnerTabs from "./src/Screens/StorePartner/TabNavigator";

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {/* Define the Login screen */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="DeliveryPartnerTabs"
          component={DeliveryPartnerTabs}
          options={{
            headerShown: false, // Hide header for tabs
          }}
        />
        <Stack.Screen
          name="StorePartnerTabs"
          component={StorePartnerTabs}
          options={{
            headerShown: false, // Hide header for tabs
          }}
        />
        <Stack.Screen
          name="PickUpProducts"
          component={PickUpProducts}
          options={{
            headerShown: true,
            title: "Pick Up Products",
          }}
        />
        <Stack.Screen
          name="FinalProductList"
          component={FinalProductList}
          options={{
            headerShown: true,
            title: "Final Product List",
          }}
        />
        <Stack.Screen
          name="DeliveryCompleteScreen"
          component={DeliveryCompleteScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ShopInfo"
          component={ShopInfoScreen}
          options={{
            headerShown: true,
            title: "Shop Information",
          }}
        />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
