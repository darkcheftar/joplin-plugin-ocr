import { container, InjectionToken } from 'tsyringe';
import { Ref, ref, computed } from 'vue';
import range from 'lodash.range';
import { Rect, VideoRange } from '../../model/Recognition';
import { RecognitionService } from './Base';

export interface VideoRenderer {
  init(video: ArrayBuffer): void;
  render(frame: number, rect?: Rect): Promise<ArrayBuffer>;
  getVideoLength(): Promise<number>;
}

export const videoRendererToken: InjectionToken<VideoRenderer> = Symbol();

export class VideoRecognitionService extends RecognitionService {
  constructor(video: ArrayBuffer) {
    super();
    this.videoRenderer.init(video);
  }
  readonly isParamsValid = computed(() => {
    return this.langs.value.length > 0 && this.range.isValid.value;
  });
  readonly rect: Ref<Rect | undefined> = ref(undefined);
  private readonly videoRenderer = container.resolve(videoRendererToken);
  range = new VideoRange();
  sampleInterval: number = 1;
  readonly result: Ref<null | string[]> = ref(null);
  private async getFrames() {
    const ranges = this.range.toArray();

    if (ranges.length === 0) {
      return range(0, await this.videoRenderer.getVideoLength(), this.sampleInterval);
    }

    return ranges.map((el) => (Array.isArray(el) ? range(...el, this.sampleInterval) : el)).flat();
  }
  async recognize() {
    if (!this.isParamsValid.value) {
      throw new Error('invalid params');
    }

    const results: Promise<string>[] = [];
    const frames = await this.getFrames();
    this.isRecognizing.value = true;

    for (const frame of frames) {
      const frameImage = await this.videoRenderer.render(frame, this.rect.value);
      results.push(
        this.recognizor.recognize(this.langs.value, frameImage, { jobCount: frames.length }),
      );
    }

    this.result.value = await Promise.all(results);
    this.isRecognizing.value = true;
  }
}
