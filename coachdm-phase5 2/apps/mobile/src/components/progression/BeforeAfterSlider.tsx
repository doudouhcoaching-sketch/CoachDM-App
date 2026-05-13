// =====================================================================
// Coach DM · Phase 5 · BeforeAfterSlider
// Slider tactile horizontal pour comparer 2 photos
// =====================================================================

import React, { useState } from 'react';
import { View, Image, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { COACH_DM_COLORS } from '@coachdm/shared/progression';

interface Props {
  beforeUri: string;
  afterUri: string;
  /** ratio largeur/hauteur (def 3:4 = 0.75) */
  aspectRatio?: number;
}

export function BeforeAfterSlider({ beforeUri, afterUri, aspectRatio = 0.75 }: Props) {
  const [width, setWidth] = useState(0);
  const positionX = useSharedValue(0);
  const initialSet = useSharedValue(false);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    if (!initialSet.value) {
      positionX.value = w / 2;
      initialSet.value = true;
    }
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = Math.max(0, Math.min(width, e.absoluteX));
      positionX.value = next;
    });

  const tap = Gesture.Tap()
    .onStart((e) => {
      const next = Math.max(0, Math.min(width, e.absoluteX));
      positionX.value = next;
    });

  const composed = Gesture.Race(pan, tap);

  const afterClipStyle = useAnimatedStyle(() => ({
    width: positionX.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    left: positionX.value - 18,
  }));

  const height = width > 0 ? width / aspectRatio : 400;

  return (
    <GestureDetector gesture={composed}>
      <View style={[styles.container, { height }]} onLayout={onLayout}>
        {/* Layer 1 : photo "after" en fond */}
        <Image source={{ uri: afterUri }} style={styles.image} resizeMode="cover" />
        {/* Layer 2 : photo "before" tronquée par positionX */}
        <Animated.View style={[styles.beforeWrap, afterClipStyle]}>
          <Image
            source={{ uri: beforeUri }}
            style={[styles.image, { width }]}
            resizeMode="cover"
          />
        </Animated.View>
        {/* Handle */}
        <Animated.View style={[styles.handle, handleStyle, { height }]}>
          <View style={styles.handleBar} />
          <View style={styles.handleKnob}>
            <View style={styles.handleArrowLeft} />
            <View style={styles.handleArrowRight} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COACH_DM_COLORS.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  beforeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  handle: {
    position: 'absolute',
    top: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: COACH_DM_COLORS.gold,
  },
  handleKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COACH_DM_COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  handleArrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: COACH_DM_COLORS.bg,
  },
  handleArrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COACH_DM_COLORS.bg,
  },
});
