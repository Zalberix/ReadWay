import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { View, type ViewProps } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

import { Text } from "@/components/ui/text";

type SheetCtx = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = createContext<SheetCtx | null>(null);

export function Sheet({
                        open,
                        onOpenChange,
                        children,
                      }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export function SheetContent({
                               children,
                               snapPoints = ["60%"],
                               style,
                               contentContainerStyle,
                             }: {
  children: React.ReactNode;
  snapPoints?: Array<string | number>;
  style?: any;
  contentContainerStyle?: any;
}) {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("SheetContent must be used inside <Sheet />");

  const ref = useRef<BottomSheet>(null);
  const points = useMemo(() => snapPoints, [snapPoints]);

  useEffect(() => {
    if (ctx.open) {
      requestAnimationFrame(() => ref.current?.expand());
    } else {
      ref.current?.close();
    }
  }, [ctx.open]);

  return (
    <BottomSheet
      ref={ref}
      index={ctx.open ? 0 : -1}
      snapPoints={points}
      enablePanDownToClose
      onChange={(idx) => {
        if (idx === -1) ctx.onOpenChange(false);
      }}
      backgroundStyle={style}
      handleIndicatorStyle={{ opacity: 0.6 }}
    >
      <BottomSheetView style={[{ paddingHorizontal: 16, paddingBottom: 12 }, contentContainerStyle]}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

export function SheetHeader(props: ViewProps) {
  return <View {...props} style={[{ paddingTop: 4, paddingBottom: 8 }, props.style]} />;
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-base font-semibold" style={{ color: "#111827" }}>
      {children}
    </Text>
  );
}
