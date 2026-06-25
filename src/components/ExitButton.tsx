import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { LogOut } from 'lucide-react-native'

interface Props {
  onPress: () => void
}

export default function ExitButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.button}
    >
      <View style={styles.content}>
        <LogOut size={14} color="rgba(255,255,255,0.4)" />
        <Text style={styles.text}>Exit bubble</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Nunito_400Regular',
  },
})
