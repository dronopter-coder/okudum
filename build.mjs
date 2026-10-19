// Okudum derleme betiği: src/ → www/ (esbuild).
// Firebase ayarı sırasıyla firebase-ayar.json dosyasından ya da FIREBASE_CONFIG ortam
// değişkeninden okunur. İkisi de yoksa uygulama "demo modunda" (veriler yalnızca cihazda) çalışır.
import * as esbuild from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';

let ayar = null;
if (existsSync('firebase-ayar.json')) ayar = JSON.parse(readFileSync('firebase-ayar.json', 'utf8'));
else if (process.env.FIREBASE_CONFIG) ayar = JSON.parse(process.env.FIREBASE_CONFIG);
if (ayar && !ayar.apiKey) ayar = null;
console.log(ayar ? `Firebase projesi: ${ayar.projectId}` : 'Firebase ayarı yok → DEMO MODU');

const ortak = {
  bundle: true,
  minify: !process.argv.includes('--watch'),
  sourcemap: process.argv.includes('--watch'),
  target: ['chrome100', 'safari15'],
  logLevel: 'info',
};

const js = {
  ...ortak,
  entryPoints: { app: 'src/main.js' },
  outdir: 'www',
  format: 'esm',
  define: { __FIREBASE__: JSON.stringify(ayar) },
};
const css = {
  ...ortak,
  entryPoints: { app: 'src/stil.css' },
  outdir: 'www',
  loader: { '.woff2': 'file', '.woff': 'file' },
  assetNames: 'fonts/[name]-[hash]',
};

// Arka plan kontrolü (Background Runner): web görünümü dışında çalışır, tek dosya ve modülsüz olmalı
const arkaplan = { ...ortak, entryPoints: { kontrol: 'src/arkaplan.js' }, outdir: 'www/runners', format: 'iife', minify: false };

if (process.argv.includes('--watch')) {
  for (const o of [js, css, arkaplan]) await (await esbuild.context(o)).watch();
} else {
  await Promise.all([esbuild.build(js), esbuild.build(css), esbuild.build(arkaplan)]);
}
