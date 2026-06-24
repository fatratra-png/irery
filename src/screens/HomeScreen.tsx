import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Logo from '../components/Logo'
import type { AnimationType } from '../types'

const { width: W } = Dimensions.get('window')

interface Props {
  onEnter: (anim: AnimationType) => void
}

const CARDS: { type: AnimationType; label: string; emoji: string }[] = [
  { type: 'ocean', label: 'Ocean Waves', emoji: '🌊' },
  { type: 'rain', label: 'Gentle Rain', emoji: '🌧' },
  { type: 'stars', label: 'Shooting Stars', emoji: '✨' },
]

export default function HomeScreen({ onEnter }: Props) {
  const [showSelect, setShowSelect] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleEnter = () => {
    setShowModal(true)
  }

  const handleConnected = () => {
    setShowModal(false)
    setShowSelect(true)
  }

  const handleSelect = (type: AnimationType) => {
    setShowSelect(false)
    onEnter(type)
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {!showSelect ? (
        <View style={styles.landing}>
          <Logo size={W * 0.4} />
          <Text style={styles.title}>inUrZone</Text>
          <Text style={styles.subtitle}>find your calm</Text>
          <TouchableOpacity
            onPress={handleEnter}
            activeOpacity={0.8}
            style={styles.enterBtn}
          >
            <Text style={styles.enterBtnText}>Enter my bubble</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectContainer}>
          <Text style={styles.selectTitle}>choose your atmosphere</Text>
          <View style={styles.cards}>
            {CARDS.map((card) => (
              <TouchableOpacity
                key={card.type}
                onPress={() => handleSelect(card.type)}
                activeOpacity={0.7}
                style={styles.card}
              >
                <View style={styles.cardPreview}>
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                </View>
                <Text style={styles.cardLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🎧</Text>
            <Text style={styles.modalTitle}>check your audio</Text>
            <Text style={styles.modalText}>
              Make sure your headphones or earbuds are connected for the full
              experience.
            </Text>
            <TouchableOpacity
              onPress={handleConnected}
              activeOpacity={0.8}
              style={styles.modalBtn}
            >
              <Text style={styles.modalBtnText}>Connected</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060e20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landing: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 44,
    fontFamily: 'ChelaOne_400Regular',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Nunito_300Light',
    letterSpacing: 7,
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  enterBtn: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.25)',
    backgroundColor: 'rgba(100,255,218,0.08)',
  },
  enterBtnText: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 1,
    color: '#fff',
  },
  selectContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  selectTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_300Light',
    letterSpacing: 5,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 420,
  },
  card: {
    width: (W - 72) / 2,
    maxWidth: 180,
    height: 200,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cardPreview: {
    width: 100,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6,14,32,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    gap: 16,
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  modalText: {
    fontSize: 13,
    fontFamily: 'Nunito_300Light',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,255,218,0.25)',
    backgroundColor: 'rgba(100,255,218,0.08)',
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 1,
    color: '#fff',
  },
})
