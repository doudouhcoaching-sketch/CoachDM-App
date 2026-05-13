import { useEffect, useState } from 'react';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '@coachdm/shared/ai';

const STORAGE_KEY = '@coachdm:lang';
const SUPPORTED: Lang[] = ['fr', 'en', 'nl'];

function detectLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase() ?? 'fr';
    if (code.startsWith('nl')) return 'nl';
    if (code.startsWith('en')) return 'en';
    return 'fr';
  } catch {
    return 'fr';
  }
}

export function useUserLang(): { lang: Lang; setLang: (l: Lang) => Promise<void> } {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as Lang | null;
        if (stored && SUPPORTED.includes(stored)) {
          setLangState(stored);
        } else {
          setLangState(detectLang());
        }
      } catch {
        setLangState(detectLang());
      }
    })();
  }, []);

  const setLang = async (l: Lang) => {
    if (!SUPPORTED.includes(l)) return;
    setLangState(l);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  return { lang, setLang };
}
