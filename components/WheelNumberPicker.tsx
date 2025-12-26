import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, View } from "react-native";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // нечётное: 5/7/9
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;

  // стили (под твои токены)
  highlightBg?: string;
  highlightBorder?: string;
  textColor?: string;
  mutedColor?: string;
};

export function WheelNumberPicker({
                                    min,
                                    max,
                                    value,
                                    onChange,
                                    highlightBg = "#ECE7FF",
                                    highlightBorder = "#E9D5FF",
                                    textColor = "#111827",
                                    mutedColor = "#7C7790",
                                  }: Props) {
  const data = useMemo(() => {
    const a: number[] = [];
    for (let i = min; i <= max; i++) a.push(i);
    return a;
  }, [min, max]);

  const listRef = useRef<FlatList<number>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [ready, setReady] = useState(false);

  const indexFromValue = (v: number) => Math.max(0, Math.min(data.length - 1, v - min));
  const valueFromIndex = (idx: number) => min + idx;

  useEffect(() => {
    // подскроллить на value при первом рендере
    const idx = indexFromValue(value);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    // если value поменяли извне — синхронизируем колесо
    const idx = indexFromValue(value);
    listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onMomentumEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y ?? 0;
    const idx = Math.round(y / ITEM_HEIGHT);
    const v = valueFromIndex(idx);
    onChange(v);
  };

  const paddingVertical = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <View style={{ height: PICKER_HEIGHT }}>
      {/* подсветка центральной строки */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
          height: ITEM_HEIGHT,
          borderRadius: 14,
          backgroundColor: highlightBg,
          borderWidth: 1,
          borderColor: highlightBorder,
        }}
      />

      <Animated.FlatList
        ref={listRef}
        data={data}
        keyExtractor={(x) => String(x)}
        showsVerticalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        contentContainerStyle={{ paddingVertical }}
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        renderItem={({ item, index }) => {
          // анимация масштаба/прозрачности по расстоянию от центра
          const inputRange = [
            (index - 3) * ITEM_HEIGHT,
            (index - 2) * ITEM_HEIGHT,
            (index - 1) * ITEM_HEIGHT,
            index * ITEM_HEIGHT,
            (index + 1) * ITEM_HEIGHT,
            (index + 2) * ITEM_HEIGHT,
            (index + 3) * ITEM_HEIGHT,
          ];

          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.86, 0.9, 0.95, 1.06, 0.95, 0.9, 0.86],
            extrapolate: "clamp",
          });

          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.25, 0.35, 0.6, 1, 0.6, 0.35, 0.25],
            extrapolate: "clamp",
          });

          const color = scrollY.interpolate({
            inputRange,
            outputRange: [mutedColor, mutedColor, mutedColor, textColor, mutedColor, mutedColor, mutedColor],
            extrapolate: "clamp",
          });

          return (
            <View style={{ height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" }}>
              <Animated.Text
                style={{
                  transform: [{ scale }],
                  opacity,
                  color,
                  fontSize: 28,
                  fontWeight: "600",
                }}
              >
                {item}
              </Animated.Text>
            </View>
          );
        }}
      />
    </View>
  );
}
