/**
 * Detects whether Chrome's built-in Gemini Nano (Prompt API) can run here, and why not when it cannot.
 */
export type NanoState = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'no_api';

export interface Capability {
  chromeVersion: number | null;
  isDesktopChrome: boolean;
  state: NanoState;
  explanation: string;
}

interface LanguageModelStatic {
  availability(options?: unknown): Promise<string>;
}

function chromeVersion(): number | null {
  const m = navigator.userAgent.match(/Chrome\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function detectCapability(lang = 'en'): Promise<Capability> {
  const version = chromeVersion();
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const isEdgeOrOpera = /Edg\/|OPR\//.test(ua);
  const isDesktopChrome = version !== null && !isMobile && !isEdgeOrOpera;

  const lm = (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
  if (!lm) {
    let explanation = 'This browser does not provide the built-in Gemini Nano model.';
    if (!isDesktopChrome) explanation = 'Gemini Nano runs only in desktop Chrome (version 139 or later). Mobile browsers and other browsers are not supported.';
    else if (version !== null && version < 139) explanation = `Chrome ${version} is too old. Update to Chrome 139 or later.`;
    return { chromeVersion: version, isDesktopChrome, state: 'no_api', explanation };
  }

  let raw = 'unavailable';
  try {
    raw = await lm.availability({
      expectedInputs: [{ type: 'text', languages: [lang] }],
      expectedOutputs: [{ type: 'text', languages: [lang] }],
    });
  } catch {
    raw = 'unavailable';
  }
  const state = (['available', 'downloadable', 'downloading', 'unavailable'].includes(raw) ? raw : 'unavailable') as NanoState;
  const explanation: Record<NanoState, string> = {
    available: 'Gemini Nano is ready. Your messages are read on this device.',
    downloadable: 'Gemini Nano can be downloaded (a few minutes, about 2 to 4 GB). Press "Prepare on-device model".',
    downloading: 'Gemini Nano is downloading. You can use the manual questions meanwhile.',
    unavailable:
      'This computer does not meet Gemini Nano requirements (at least 22 GB free disk, and more than 4 GB of video memory or 16 GB of RAM). Use the manual questions: your message still stays on this device.',
    no_api: '',
  };
  return { chromeVersion: version, isDesktopChrome, state, explanation: explanation[state] };
}
