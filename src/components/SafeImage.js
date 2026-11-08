import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, ImageBackground, StyleSheet, View } from "react-native";

// Remote image with a loading indicator and a fallback when the URL is missing or fails to
// load (404, offline, blocked cleartext http, ...). Renders as ImageBackground when given
// children. `style` is applied to the outer box in every state so layout never jumps.
export default function SafeImage({
  uri,
  style,
  children,
  fallbackColor = "#E8E0D6",
  iconSize = 28,
  showLoader = true,
  ...imageProps
}) {
  // Track which uri finished/failed so a new uri automatically starts fresh (no reset effect).
  const [failedUri, setFailedUri] = useState(null);
  const [settledUri, setSettledUri] = useState(null);

  const failed = !uri || failedUri === uri;
  const loading = Boolean(uri) && !failed && settledUri !== uri;

  if (failed) {
    return (
      <View style={[style, styles.fallback, { backgroundColor: fallbackColor }]}>
        <Ionicons name="image-outline" size={iconSize} color="#8B8178" />
        {children}
      </View>
    );
  }

  const handlers = {
    onLoadEnd: () => setSettledUri(uri),
    onError: () => setFailedUri(uri),
  };
  const overlay =
    showLoader && loading ? (
      <View pointerEvents="none" style={styles.loader}>
        <ActivityIndicator color="#8B8178" />
      </View>
    ) : null;

  if (children) {
    return (
      <ImageBackground source={{ uri }} style={style} {...imageProps} {...handlers}>
        {overlay}
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[style, styles.clip]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} {...imageProps} {...handlers} />
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
