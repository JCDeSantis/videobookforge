import { writeFile } from 'fs/promises'
import { join } from 'path'
import type { BackgroundConfig } from '../../shared/types'

export interface BackgroundInputResult {
  args: string[]
  inputIndex: number
  needsCoverWrite: boolean
  coverTempPath?: string
}

export async function prepareBackground(
  bg: BackgroundConfig,
  resolution: string,
  tempDir: string
): Promise<BackgroundInputResult> {
  const [width, height] = resolution.split('x')

  if (bg.type === 'solid') {
    const hex = (bg.color ?? '#09090b').replace('#', '')
    return {
      args: ['-f', 'lavfi', '-i', `color=c=${hex}:size=${width}x${height}:rate=1`],
      inputIndex: 1,
      needsCoverWrite: false
    }
  }

  if (bg.type === 'gradient' && bg.gradientFrom && bg.gradientTo) {
    // Render gradient as a PNG via canvas (base64 passed in coverBase64)
    // Fall through to image handling if coverBase64 is set
    if (bg.coverBase64) {
      const tempPath = join(tempDir, 'gradient.png')
      const base64 = bg.coverBase64.replace(/^data:image\/\w+;base64,/, '')
      await writeFile(tempPath, Buffer.from(base64, 'base64'))
      return {
        args: ['-loop', '1', '-i', tempPath],
        inputIndex: 1,
        needsCoverWrite: false,
        coverTempPath: tempPath
      }
    }
    // Fallback: solid color from gradientFrom
    const hex = (bg.gradientFrom ?? '#09090b').replace('#', '')
    return {
      args: ['-f', 'lavfi', '-i', `color=c=${hex}:size=${width}x${height}:rate=1`],
      inputIndex: 1,
      needsCoverWrite: false
    }
  }

  if (bg.type === 'image' && bg.imagePath) {
    return {
      args: ['-loop', '1', '-i', bg.imagePath],
      inputIndex: 1,
      needsCoverWrite: false
    }
  }

  if (bg.type === 'cover' && bg.coverBase64) {
    const tempPath = join(tempDir, 'cover_bg.jpg')
    const base64 = bg.coverBase64.replace(/^data:image\/\w+;base64,/, '')
    await writeFile(tempPath, Buffer.from(base64, 'base64'))
    return {
      args: ['-loop', '1', '-i', tempPath],
      inputIndex: 1,
      needsCoverWrite: false,
      coverTempPath: tempPath
    }
  }

  // Default fallback: dark solid
  return {
    args: ['-f', 'lavfi', '-i', `color=c=09090b:size=${width}x${height}:rate=1`],
    inputIndex: 1,
    needsCoverWrite: false
  }
}
