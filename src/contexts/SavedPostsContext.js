import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "../utils/secureStorage";
import { getApiBase } from "../utils/api";

const SavedPostsContext = createContext(null);
const STORAGE_KEY = "saved_posts";
const RECENT_KEY = "recently_viewed_posts";
const FOLLOWED_POETS_KEY = "followed_poets";
const SAVED_PROGRAMS_KEY = "saved_programs";

const normalizeSavedPost = (post) => {
  if (!post || !post.id) return null;

  const content = post.content || {};
  const avatar = typeof post.avatar === "string" ? post.avatar : "";
  const image = typeof post.image === "string" ? post.image : undefined;

  return {
    ...post,
    id: String(post.id),
    saved: true,
    avatar,
    image,
    content: {
      roman: content.roman || content.urdu || content.hindi || post.text || "",
      urdu: content.urdu || content.roman || content.hindi || post.text || "",
      hindi: content.hindi || content.urdu || content.roman || post.text || "",
    },
  };
};

const normalizeFollowedPoet = (poet) => {
  if (!poet || !poet.id) return null;

  return {
    id: String(poet.id),
    name: poet.name || "Unknown Poet",
    years: poet.years || "",
    location: poet.location || "",
    image:
      typeof poet.image === "string"
        ? poet.image
        : typeof poet.avatar === "string"
          ? poet.avatar
          : "",
    biography: poet.biography || "",
  };
};

const normalizeSavedProgram = (program) => {
  if (!program || (!program.id && !program._id)) return null;

  const programId = program.id ?? program._id;

  return {
    ...program,
    id: String(programId),
    title: program.title || "Program",
    subtitle: program.subtitle || "",
    category: program.category || "General",
    date: program.date || "",
    time: program.time || "",
    venue: program.venue || "",
    host: program.host || "",
    image: typeof program.image === "string" ? program.image : "",
    description: program.description || "",
  };
};

export function SavedPostsProvider({ children }) {
  const [savedPosts, setSavedPosts] = useState([]);
  const [recentViewedPosts, setRecentViewedPosts] = useState([]);
  const [followedPoets, setFollowedPoets] = useState([]);
  const [followedPoetsLoaded, setFollowedPoetsLoaded] = useState(false);
  const [savedPrograms, setSavedPrograms] = useState([]);

  useEffect(() => {
    const loadSavedPosts = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

        if (!storedValue) return;

        const parsed = JSON.parse(storedValue);
        if (Array.isArray(parsed)) {
          setSavedPosts(parsed.map(normalizeSavedPost).filter(Boolean));
        }
      } catch (error) {
        console.log("Failed to load saved posts:", error);
      }
    };

    const loadRecentPosts = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(RECENT_KEY);

        if (!storedValue) return;

        const parsed = JSON.parse(storedValue);
        if (Array.isArray(parsed)) {
          setRecentViewedPosts(parsed.map(normalizeSavedPost).filter(Boolean));
        }
      } catch (error) {
        console.log("Failed to load recent posts:", error);
      }
    };

    const loadFollowedPoets = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(FOLLOWED_POETS_KEY);

        if (storedValue) {
          const parsed = JSON.parse(storedValue);
          if (Array.isArray(parsed)) {
            setFollowedPoets(parsed.map(normalizeFollowedPoet).filter(Boolean));
          }
        }
      } catch (error) {
        console.log("Failed to load followed poets:", error);
      } finally {
        setFollowedPoetsLoaded(true);
      }
    };

    const loadSavedPrograms = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(SAVED_PROGRAMS_KEY);

        if (!storedValue) return;

        const parsed = JSON.parse(storedValue);
        if (Array.isArray(parsed)) {
          setSavedPrograms(parsed.map(normalizeSavedProgram).filter(Boolean));
        }
      } catch (error) {
        console.log("Failed to load saved programs:", error);
      }
    };

    loadSavedPosts();
    loadRecentPosts();
    loadFollowedPoets();
    loadSavedPrograms();
  }, []);

  useEffect(() => {
    if (!followedPoetsLoaded) return;
    const syncFollowedPoets = async () => {
      try {
        const token = await SecureStore.getItemAsync("user_token");
        if (!token) return;
        const response = await fetch(`${getApiBase()}/api/notifications/followed-poets`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            followedPoets: followedPoets.map(({ id, name }) => ({ id, name })),
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed to sync followed poets (${response.status})`);
        }
      } catch (error) {
        console.error("Failed to sync followed poets:", error);
      }
    };

    syncFollowedPoets();
  }, [followedPoets, followedPoetsLoaded]);

  useEffect(() => {
    const persistSavedPosts = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedPosts));
      } catch (error) {
        console.log("Failed to save posts:", error);
      }
    };

    persistSavedPosts();
  }, [savedPosts]);

  useEffect(() => {
    const persistRecentPosts = async () => {
      try {
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recentViewedPosts));
      } catch (error) {
        console.log("Failed to save recent posts:", error);
      }
    };

    persistRecentPosts();
  }, [recentViewedPosts]);

  useEffect(() => {
    const persistFollowedPoets = async () => {
      try {
        await AsyncStorage.setItem(FOLLOWED_POETS_KEY, JSON.stringify(followedPoets));
      } catch (error) {
        console.log("Failed to save followed poets:", error);
      }
    };

    persistFollowedPoets();
  }, [followedPoets]);

  useEffect(() => {
    const persistSavedPrograms = async () => {
      try {
        await AsyncStorage.setItem(SAVED_PROGRAMS_KEY, JSON.stringify(savedPrograms));
      } catch (error) {
        console.log("Failed to save programs:", error);
      }
    };

    persistSavedPrograms();
  }, [savedPrograms]);

  const toggleSavedPost = useCallback((post) => {
    if (!post || !post.id) return;

    const normalized = normalizeSavedPost(post);
    if (!normalized) return;

    setSavedPosts((currentPosts) => {
      const alreadySaved = currentPosts.some(
        (savedPost) => String(savedPost.id) === String(normalized.id)
      );

      if (alreadySaved) {
        return currentPosts.filter(
          (savedPost) => String(savedPost.id) !== String(normalized.id)
        );
      }

      return [...currentPosts, normalized];
    });
  }, []);

  const addRecentViewedPost = useCallback((post) => {
    if (!post || !post.id) return;

    const normalized = normalizeSavedPost(post);
    if (!normalized) return;

    setRecentViewedPosts((currentPosts) => {
      const deduped = currentPosts.filter(
        (recentPost) => String(recentPost.id) !== String(normalized.id)
      );

      return [normalized, ...deduped].slice(0, 20);
    });
  }, []);

  const toggleFollowedPoet = useCallback((poet) => {
    if (!poet || !poet.id) return;

    const normalized = normalizeFollowedPoet(poet);
    if (!normalized) return;

    setFollowedPoets((currentPoets) => {
      const alreadyFollowing = currentPoets.some(
        (item) => String(item.id) === String(normalized.id)
      );

      if (alreadyFollowing) {
        return currentPoets.filter(
          (item) => String(item.id) !== String(normalized.id)
        );
      }

      return [normalized, ...currentPoets].slice(0, 50);
    });
  }, []);

  const toggleSavedProgram = useCallback((program) => {
    const programId = program?.id ?? program?._id;
    if (!program || !programId) return;

    const normalized = normalizeSavedProgram(program);
    if (!normalized) return;

    setSavedPrograms((currentPrograms) => {
      const alreadySaved = currentPrograms.some(
        (savedProgram) => String(savedProgram.id) === String(normalized.id)
      );

      if (alreadySaved) {
        return currentPrograms.filter(
          (savedProgram) => String(savedProgram.id) !== String(normalized.id)
        );
      }

      return [normalized, ...currentPrograms].slice(0, 50);
    });
  }, []);

  const isProgramSaved = useCallback(
    (programId) => savedPrograms.some((program) => String(program.id ?? program._id) === String(programId)),
    [savedPrograms]
  );

  const isPostSaved = useCallback(
    (postId) => savedPosts.some((post) => String(post.id) === String(postId)),
    [savedPosts]
  );

  const isPoetFollowed = useCallback(
    (poetId) => followedPoets.some((poet) => String(poet.id) === String(poetId)),
    [followedPoets]
  );

  const value = useMemo(
    () => ({
      savedPosts,
      recentViewedPosts,
      followedPoets,
      savedPrograms,
      toggleSavedPost,
      addRecentViewedPost,
      toggleFollowedPoet,
      toggleSavedProgram,
      isProgramSaved,
      isPostSaved,
      isPoetFollowed,
    }),
    [savedPosts, recentViewedPosts, followedPoets, savedPrograms, toggleSavedPost, addRecentViewedPost, toggleFollowedPoet, toggleSavedProgram, isProgramSaved, isPostSaved, isPoetFollowed]
  );

  return (
    <SavedPostsContext.Provider value={value}>
      {children}
    </SavedPostsContext.Provider>
  );
}

export function useSavedPosts() {
  const context = useContext(SavedPostsContext);

  if (!context) {
    throw new Error("useSavedPosts must be used inside SavedPostsProvider");
  }

  return context;
}
