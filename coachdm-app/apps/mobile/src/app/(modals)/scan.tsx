// ═══════════════════════════════════════════════════════════════
// COACH DM — Modal scan code-barres
// 
// Caméra plein écran avec overlay. Détecte EAN/UPC, fait le lookup
// (cache local puis OpenFoodFacts), redirige vers add-food.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui';
import { lookupBarcode } from '@/hooks/useNutrition';
import { colors, typography, spacing, radius } from '@/theme';

export default function ScanModal() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [lookupBarcodeStr, setLookupBarcodeStr] = useState<string | null>(null);
  const lockRef = useRef<string | null>(null);

  async function handleBarcode({ data }: { data: string; type: string }) {
    // Lock anti double-scan
    if (lockRef.current === data || scanning) return;
    lockRef.current = data;
    setScanning(true);
    setLookupBarcodeStr(data);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      const food = await lookupBarcode(data);
      if (food) {
        router.replace({
          pathname: '/(modals)/log-food',
          params: { foodId: food.id, name: food.name_fr },
        });
      } else {
        Alert.alert(
          'Produit introuvable',
          `Le code ${data} n'a pas été trouvé. Tu peux l'ajouter manuellement.`,
          [
            { text: 'Réessayer', onPress: () => { lockRef.current = null; setScanning(false); } },
            { text: 'Ajouter manuellement', onPress: () => router.replace('/(modals)/add-food') },
          ],
        );
      }
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message, [
        { text: 'OK', onPress: () => { lockRef.current = null; setScanning(false); } },
      ]);
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={64} color={colors.primary} />
          <Text style={styles.permissionTitle}>Accès caméra requis</Text>
          <Text style={styles.permissionText}>
            Pour scanner les codes-barres de tes produits, on a besoin de l'accès à ta caméra.
          </Text>
          <Button
            title="Autoriser la caméra"
            onPress={requestPermission}
            fullWidth
            size="lg"
            style={{ marginTop: spacing['4'] }}
          />
          <Button
            title="Annuler"
            variant="ghost"
            onPress={() => router.back()}
            fullWidth
            style={{ marginTop: spacing['2'] }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullscreen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanning ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.overlayHeader}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.overlayTitle}>Scanner</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.frameHint}>
            Pointe vers le code-barres de l'aliment
          </Text>
          {scanning && (
            <View style={styles.scanningRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.scanningText}>
                Recherche{lookupBarcodeStr ? ` ${lookupBarcodeStr}` : ''}…
              </Text>
            </View>
          )}
        </View>

        <View style={styles.overlayFooter}>
          <Button
            title="Saisir le code manuellement"
            variant="secondary"
            onPress={() => router.replace('/(modals)/add-food')}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  fullscreen: { flex: 1, backgroundColor: '#000' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['2'],
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitle: {
    color: colors.text,
    fontSize: typography.lg,
    fontWeight: typography.weights.bold,
  },
  frameWrap: {
    alignItems: 'center',
  },
  frame: {
    width: 280,
    height: 200,
    borderRadius: radius.xl,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.xl },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.xl },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.xl },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.xl },
  frameHint: {
    color: colors.text,
    fontSize: typography.sm,
    marginTop: spacing['5'],
    textAlign: 'center',
    fontWeight: typography.weights.medium,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    marginTop: spacing['4'],
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanningText: {
    color: colors.text,
    fontSize: typography.sm,
  },
  overlayFooter: {
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['4'],
  },
  permissionWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['6'],
    gap: spacing['3'],
  },
  permissionTitle: {
    color: colors.text,
    fontSize: typography.xl,
    fontWeight: typography.weights.bold,
    marginTop: spacing['4'],
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
