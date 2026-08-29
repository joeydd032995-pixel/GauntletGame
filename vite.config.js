import { defineConfig } from 'vite';

export default defineConfig({
  build:{
    target:'es2022',
    sourcemap:true,
    rollupOptions:{
      output:{
        manualChunks(id){
          if(id.includes('/three/examples/jsm/postprocessing/')||id.includes('/three/examples/jsm/shaders/'))return'three-postfx';
          if(id.includes('/three/examples/jsm/'))return'three-addons';
          if(id.includes('/three/'))return'three-core';
        }
      }
    }
  }
});
