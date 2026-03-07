#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * Script para sincronizar la versión de package.json en todos los archivos necesarios
 * Este script se ejecuta antes del build para asegurar consistencia de versiones
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.join(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const serviceWorkerPath = path.join(rootDir, 'public', 'service-worker.js')
const appVersionPath = path.join(rootDir, 'presentation', 'utils', 'app-version.ts')

/**
 * Lee la versión desde package.json
 * @returns {string} La versión del package.json
 */
function getPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  return packageJson.version
}

/**
 * Actualiza la versión en el service worker
 * @param {string} version - La nueva versión
 */
function updateServiceWorker(version) {
  if (!fs.existsSync(serviceWorkerPath)) {
    console.error('❌ service-worker.js not found')
    return false
  }

  let content = fs.readFileSync(serviceWorkerPath, 'utf8')

  // Reemplazar la versión usando regex
  const versionRegex = /const APP_VERSION = ['"][\d.]+['"]/
  const newVersionLine = `const APP_VERSION = '${version}'`

  if (versionRegex.test(content)) {
    content = content.replace(versionRegex, newVersionLine)
    fs.writeFileSync(serviceWorkerPath, content)
    console.log(`✅ service-worker.js updated to v${version}`)
    return true
  } else {
    console.error('❌ Could not find APP_VERSION in service-worker.js')
    return false
  }
}

/**
 * Actualiza la versión en app-version.ts
 * @param {string} version - La nueva versión
 */
function updateAppVersion(version) {
  if (!fs.existsSync(appVersionPath)) {
    console.error('❌ app-version.ts not found')
    return false
  }

  let content = fs.readFileSync(appVersionPath, 'utf8')

  // Reemplazar la versión usando regex
  const versionRegex = /export const APP_VERSION = ['"][\d.]+['"]/
  const newVersionLine = `export const APP_VERSION = '${version}'`

  if (versionRegex.test(content)) {
    content = content.replace(versionRegex, newVersionLine)
    fs.writeFileSync(appVersionPath, content)
    console.log(`✅ app-version.ts updated to v${version}`)
    return true
  } else {
    console.error('❌ Could not find APP_VERSION in app-version.ts')
    return false
  }
}

/**
 * Función principal
 */
function main() {
  console.log('🔄 Syncing app version...\n')

  try {
    const version = getPackageVersion()
    console.log(`📦 package.json version: ${version}\n`)

    const swUpdated = updateServiceWorker(version)
    const appVersionUpdated = updateAppVersion(version)

    if (swUpdated && appVersionUpdated) {
      console.log('\n✨ Version sync completed successfully!')
    } else {
      console.log('\n⚠️  Version sync completed with some issues')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error syncing version:', error.message)
    process.exit(1)
  }
}

main()

