import { createContext, useContext } from "react";
import { useSharedValue } from "react-native-reanimated";

const TabBarScrollContext = createContext(undefined);

export const TabBarScrollProvider = ({ children }) => {
  const scrollY = useSharedValue(0);

  return (
    <TabBarScrollContext.Provider value={scrollY}>
      {children}
    </TabBarScrollContext.Provider>
  );
};

export const useTabBarScroll = () => {
  const context = useContext(TabBarScrollContext);

  if (!context) {
    throw new Error(
      "useTabBarScroll must be used inside TabBarScrollProvider"
    );
  }

  return context;
};
