import type CodeMirror from 'codemirror';
import type { Editor, Position } from 'codemirror';
import { escape } from 'safe-string-literal';
import type { GetWsPortRequest } from 'driver/joplin/request';
import type { WsMessage } from 'driver/markdownView/webview/Recognizor';
import { OCR_RESULT_PREFIX } from 'driver/constants';

interface Context {
  postMessage: <T>(request: GetWsPortRequest) => Promise<T>;
}

interface ExtendedEditor extends Editor {
  getSearchCursor(
    query: string | RegExp,
    start?: Position,
  ): {
    findNext(): boolean;
    findPrevious(): boolean;
    from(): Position;
    to(): Position;
  };
}

let ws: WebSocket | undefined;

class TextInserter {
  constructor(private readonly context: Context, private readonly editor: ExtendedEditor) {
    this.init();
  }
  private readonly doc = this.editor.getDoc();
  private ws = ws;
  private async init() {
    if (!this.ws) {
      const port = await this.context.postMessage<number>({ event: 'getWsPort' });

      if (!port) {
        setTimeout(this.init.bind(this), 500);
        return;
      }

      this.ws = ws = new WebSocket(`ws://127.0.0.1:${port}`);
    }

    this.ws.onmessage = async (e) => {
      const data: WsMessage = JSON.parse(await e.data.text());
      this.replaceWithOcrText(data);
    };
  }

  private replaceWithOcrText(data: WsMessage) {
    const { resourceId, index, text, removeNeeded } = data;
    const regex = new RegExp(`!\\[([^\\[\\]]*)\\]\\(:/(${resourceId})(.*)?\\)`, 'g');
    const cursor = this.editor.getSearchCursor(regex);

    let i = 0;

    while (true) {
      if (i > index) {
        throw new Error('search error');
      }

      if (cursor.findNext() && i === index) {
        break;
      }
      i += 1;
    }

    const from = cursor.from();
    const to = cursor.to();

    if (!from || !to) {
      throw new Error('search error');
    }

    if (removeNeeded && text) {
      this.doc.replaceRange(text, from, to);
      return;
    }

    const srcMatch = this.doc.getRange(from, to).match(/\((.*)\)$/);
    const srcIndex = srcMatch?.index;
    const srcText = srcMatch?.[1];

    if (typeof srcText === 'undefined' || typeof srcIndex === 'undefined') {
      throw new Error('no src');
    }

    const titleMatch = srcText.match(/ "(.*)"$/);
    const titleText = titleMatch?.[1];
    const titleIndex = titleMatch?.index;
    const ocrResult = `${OCR_RESULT_PREFIX}${escape(text)}`;

    if (!titleMatch) {
      const titleTextPos: Position = {
        line: from.line,
        ch: from.ch + srcIndex + 1 + srcText.length,
      };
      this.doc.replaceRange(` "${ocrResult}"`, titleTextPos, titleTextPos);
      return;
    }

    if (typeof titleIndex !== 'undefined' && typeof titleText !== 'undefined') {
      const titleTextFrom: Position = {
        line: from.line,
        ch: from.ch + srcIndex + 1 + titleIndex + 2,
      };
      const titleTextTo: Position = {
        line: from.line,
        ch: from.ch + srcIndex + 1 + titleIndex + 2 + titleText.length,
      };
      this.doc.replaceRange(`${titleText} ${ocrResult}`, titleTextFrom, titleTextTo);
      return;
    }

    throw new Error('fail to replace with result text');
  }
}

export default function (context: Context) {
  return {
    plugin: function (codemirror: typeof CodeMirror) {
      codemirror.defineOption('enableOcr', false, (editor) => {
        new TextInserter(context, editor as ExtendedEditor);
      });
    },
    codeMirrorResources: ['addon/search/searchcursor'],
    codeMirrorOptions: {
      enableOcr: true,
    },
  };
}
