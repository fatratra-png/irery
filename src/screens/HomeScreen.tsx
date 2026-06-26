import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { rs } from "../utils/responsive";

interface HomeScreenProps {
  onBegin: () => void;
}

export default function HomeScreen({ onBegin }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>inUrZone</Text>
        <Text style={styles.subtitle}>
          Wanna get into your your own bubble ?
        </Text>
        <Text style={styles.description}>
          Immerse yourself in calming some satisfying and gentle sounds
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={onBegin}
      >
        <Text style={styles.buttonText}>Begin</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rs(24),
    paddingVertical: rs(40),
  },
  content: {
    alignItems: "center",
    marginBottom: rs(48),
  },
  title: {
    fontSize: rs(36),
    fontFamily: "Outfit_600SemiBold",
    color: "#ffffff",
    marginBottom: rs(10),
    letterSpacing: 1.5,
  },
  subtitle: {
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    fontSize: rs(11),
    fontFamily: "Outfit_500Medium",
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 1.5,
    marginBottom: rs(10),
    textTransform: "uppercase",
  },
  description: {
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    fontSize: rs(11),
    fontFamily: "Outfit_500Medium",
    color: "rgba(255, 255, 255, 0.25)",
    maxWidth: 260,
    letterSpacing: 1.2,
  },
  button: {
    paddingHorizontal: rs(40),
    paddingVertical: rs(12),
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  buttonText: {
    fontSize: rs(14),
    fontFamily: "Outfit_500Medium",
    color: "#ffffff",
    letterSpacing: 1.2,
  },
});
