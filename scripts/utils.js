// @ts-check
import fs from 'node:fs'
import pico from 'picocolors'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)

export const targets = fs.readdirSync('packages').filter(f => {
  if (
    !fs.statSync(`packages/${f}`).isDirectory() ||
    !fs.existsSync(`packages/${f}/package.json`)
  ) {
    return false
  }
  const pkg = require(`../packages/${f}/package.json`)
  if (pkg.private && !pkg.buildOptions) {
    return false
  }
  return true
})

/**
 *
 * @param {ReadonlyArray<string>} partialTargets
 * @param {boolean | undefined} includeAllMatching
 */
export function fuzzyMatchTarget(partialTargets, includeAllMatching) {
  /** @type {Array<string>} */
  const matched = []
  partialTargets.forEach(partialTarget => {
    for (const target of targets) {
      if (target.match(partialTarget)) {
        matched.push(target)
        if (!includeAllMatching) {
          break
        }
      }
    }
  })
  if (matched.length) {
    return matched
  } else {
    console.log()
    console.error(
      `  ${pico.white(pico.bgRed(' ERROR '))} ${pico.red(
        `Target ${pico.underline(partialTargets.toString())} not found!`,
      )}`,
    )
    console.log()

    process.exit(1)
  }
}

/**
 * @param {string} command
 * @param {ReadonlyArray<string>} args
 * @param {object} [options]
 */
export async function exec(command, args, options) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: [
        'ignore', // stdin
        'pipe', // stdout
        'pipe', // stderr
      ],
      ...options,
    })

    /**
     * @type {Buffer[]}
     */
    const stderrChunks = []
    /**
     * @type {Buffer[]}
     */
    const stdoutChunks = []

    process.stderr?.on('data', chunk => {
      stderrChunks.push(chunk)
    })

    process.stdout?.on('data', chunk => {
      stdoutChunks.push(chunk)
    })

    process.on('error', error => {
      reject(error)
    })

    process.on('exit', code => {
      const ok = code === 0
      const stderr = Buffer.concat(stderrChunks).toString().trim()
      const stdout = Buffer.concat(stdoutChunks).toString().trim()
      const result = { ok, code, stderr, stdout }
      resolve(result)
    })
  })
}
