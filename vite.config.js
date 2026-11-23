import { defineConfig } from 'vite';
import {compileCatalogs,localesDirectory} from './scripts/compile-locales.mjs';
export default defineConfig({ base: './',plugins:[{
  name:'sunny-po-catalogs',
  buildStart(){compileCatalogs();},
  configureServer(server){server.watcher.add(localesDirectory);},
  handleHotUpdate(context){
    if(context.file.startsWith(localesDirectory)&&/\.(po|pot)$/.test(context.file))compileCatalogs();
  }
}] });
