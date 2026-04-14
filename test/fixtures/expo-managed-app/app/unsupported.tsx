import React from "react";
import { View } from "react-native";
import MapView from "react-native-maps";

export default function UnsupportedRoute() {
  return (
    <View style={{ flex: 1 }}>
      <MapView />
    </View>
  );
}
