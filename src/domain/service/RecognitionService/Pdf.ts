import { container, InjectionToken } from 'tsyringe';
import { Ref, ref } from 'vue';
import range from 'lodash.range';
import { RecognitionService } from './Base';

export interface PdfRenderer {
  init(pdf: ArrayBuffer): void;
  render(page: number): Promise<ArrayBuffer>;
}

export const pdfRendererToken: InjectionToken<PdfRenderer> = Symbol();

export class PdfRecognitionService extends RecognitionService {
  constructor(private readonly pdf: ArrayBuffer) {
    super();
    this.pdfRenderer.init(pdf);
  }
  private readonly pdfRenderer = container.resolve(pdfRendererToken);
  range: Array<number | [number, number]> = [];
  private get pageNumbers() {
    return this.range.map((el) => (Array.isArray(el) ? range(...el) : el)).flat();
  }

  result: Ref<null | string[]> = ref(null);
  async recognize() {
    const results: Promise<string>[] = [];

    for (const pageNumber of this.pageNumbers) {
      const pageImage = await this.pdfRenderer.render(pageNumber);
      results.push(this.recognizor.recognize(this.langs.value, pageImage));
    }

    this.result.value = await Promise.all(results);
  }
}