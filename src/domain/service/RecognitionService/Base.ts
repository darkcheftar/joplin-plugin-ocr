import { InjectionToken, container } from 'tsyringe';
import { Ref, ref, reactive } from 'vue';
import type EventEmitter from 'eventemitter3';
import type { RecognizorParams } from '../../model/Recognition';
import { appToken, LANGS_SETTING_KEY, langsStrToArray } from '../AppService';

export enum RecognizorEvents {
  Progress = 'PROGRESS',
  Finished = 'FINISHED',
}

export interface Recognizor extends EventEmitter<RecognizorEvents> {
  recognize(image: ArrayBuffer, params: RecognizorParams): Promise<string>;
  stop(): Promise<void>;
  init(allLangs: string[]): void;
}

export const recognizorToken: InjectionToken<Recognizor> = Symbol();

export abstract class RecognitionService {
  constructor() {
    this.init();
  }
  protected postProcess(result: string) {
    if (this.params.newlineIgnored) {
      return result.replaceAll('\n', '');
    }

    return result;
  }

  abstract readonly isParamsValid: Ref<boolean>;
  abstract readonly result: Ref<unknown | null>;
  abstract recognize(): Promise<void>;
  private readonly joplin = container.resolve(appToken);
  readonly recognizor = container.resolve(recognizorToken);
  readonly isRecognizing = ref(false);
  readonly errorMessage = ref('');
  readonly allLangs: Ref<string[]> = ref([]);
  readonly params = reactive<RecognizorParams>({
    langs: [],
    wordSpacePreserved: '0',
    whitelist: '',
    newlineIgnored: false,
  });

  private async init() {
    if (!RecognitionService.allLangs) {
      const allLangsStr = await this.joplin.getSettingOf<string>(LANGS_SETTING_KEY);
      RecognitionService.allLangs = langsStrToArray(allLangsStr);
    }
    this.allLangs.value = RecognitionService.allLangs;
    this.recognizor.init(this.allLangs.value);
  }

  private static allLangs?: string[];
  async stopRecognizing() {
    await this.recognizor.stop();
    this.isRecognizing.value = false;
    this.result.value = null;
  }
}
