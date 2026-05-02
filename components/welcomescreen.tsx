import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <ImageBackground
      source={require("../assets/images/1.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.button} onPress={onStart}>
          <Text style={styles.text}>LET'S START</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  button: {
    marginTop: 250,
    backgroundColor: "#8c394a",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },

  text: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
