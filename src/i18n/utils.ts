import { ui, defaultLang, type SupportedLanguage, languages } from './ui';

export { languages, defaultLang, type SupportedLanguage };

export function useTranslations(lang: SupportedLanguage) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
    const langDict = ui[lang];
    if (langDict && key in langDict) {
      return (langDict as any)[key];
    }
    return (ui[defaultLang] as any)[key] || (key as string);
  };
}

export function getLocalizedPath(path: string, targetLang: SupportedLanguage): string {
  // Normalize path by stripping existing language prefix if present
  let cleanPath = path;
  for (const l of Object.keys(languages)) {
    if (cleanPath === `/${l}` || cleanPath === `/${l}/`) {
      cleanPath = '/';
      break;
    } else if (cleanPath.startsWith(`/${l}/`)) {
      cleanPath = cleanPath.slice(l.length + 1);
      break;
    }
  }
  
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  if (targetLang === defaultLang) {
    return cleanPath;
  }
  
  if (cleanPath === '/') {
    return `/${targetLang}/`;
  }
  
  return `/${targetLang}${cleanPath}`;
}

export interface HreflangEntry {
  lang: string;
  url: string;
}

export function getHreflangList(baseUrl: string = 'https://drawonpdf.github.io'): HreflangEntry[] {
  const list: HreflangEntry[] = [
    { lang: 'en', url: `${baseUrl}/` },
    { lang: 'es', url: `${baseUrl}/es/` },
    { lang: 'pt', url: `${baseUrl}/pt/` },
    { lang: 'de', url: `${baseUrl}/de/` },
    { lang: 'fr', url: `${baseUrl}/fr/` },
    { lang: 'ja', url: `${baseUrl}/ja/` },
    { lang: 'x-default', url: `${baseUrl}/` },
  ];
  return list;
}
