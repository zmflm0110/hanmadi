import { defineConfig } from 'vite';

// base './' : 어느 주소(학교 서버, GitHub Pages, 파일로 연 폴더)에 올려도 그대로 돈다
export default defineConfig({ base: './', build: { outDir: 'dist', target: 'es2020' } });
