import joplin from 'api';
import { Joplin } from './driver/joplin/joplinPlugin';

const joplinInstance = new Joplin();

joplin.plugins.register({
  onStart: async function () {
    await joplinInstance.setupSetting();
    await joplinInstance.initWs();
    await joplinInstance.setupToolbar();
    await joplinInstance.setupDialog();
    await joplinInstance.setupCodeMirror();
    await joplinInstance.setupMarkdownView();
  },
});
