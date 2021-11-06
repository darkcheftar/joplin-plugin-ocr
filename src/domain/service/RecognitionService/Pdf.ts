import { container, InjectionToken } from 'tsyringe';
import { Ref, ref, computed } from 'vue';
import range from 'lodash.range';
import { PdfRange } from 'domain/model/Recognition';
import { RecognitionService } from './Base';

export interface PdfRenderer {
  init(pdf: ArrayBuffer, scale: Ref<number>): void;
  render(page: number): Promise<ArrayBuffer>;
  totalPage: Ref<number>;
}

export const pdfRendererToken: InjectionToken<PdfRenderer> = Symbol();

export class PdfRecognitionService extends RecognitionService {
  constructor(pdf: ArrayBuffer) {
    super();
    this.pdfRenderer.init(pdf, this.scale);
  }
  private readonly pdfRenderer = container.resolve(pdfRendererToken);
  readonly range = new PdfRange();
  readonly scale = ref(1);
  readonly totalPage = this.pdfRenderer.totalPage;
  private get pageNumbers() {
    const ranges = this.range.toArray();

    return ranges.length > 0
      ? ranges.map((el) => (Array.isArray(el) ? range(...el) : el)).flat()
      : range(1, this.pdfRenderer.totalPage.value + 1);
  }

  readonly result: Ref<undefined | string[]> = ref();
  readonly isParamsValid = computed(() => {
    return this.langs.value.length > 0 && this.range.isValid.value;
  });

  async recognize() {
    if (!this.isParamsValid.value) {
      throw new Error('invalid params');
    }

    const results: Promise<string>[] = [];
    this.isRecognizing.value = true;

    for (const pageNumber of this.pageNumbers) {
      const pageImage = await this.pdfRenderer.render(pageNumber);
      results.push(this.recognizor.recognize(this.langs.value, pageImage));
    }

    this.result.value = await Promise.all(results);
    this.isRecognizing.value = false;
  }
}
