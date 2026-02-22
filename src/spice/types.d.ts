declare global {
  interface Window {
    spice_connection: any
  }

  interface HTMLImageElement {
    o?: any
    alpha_img?: ImageData
    onload?: ((this: HTMLImageElement & { o: any, alpha_img?: ImageData }, ev: Event) => any) | null
  }

  interface MediaSource {
    spiceconn?: any
    stream?: any
  }

  interface SourceBuffer {
    spiceconn?: any
    stream?: any
    mode?: string
  }

  interface HTMLAudioElement {
    spiceconn?: any
  }

  interface HTMLVideoElement {
    spice_stream?: any
  }

  interface HTMLCanvasElement {
    sc?: any
    context?: CanvasRenderingContext2D
  }

  interface SpiceSurface {
    surface_id: number
    width: number
    height: number
    format: number
    flags: number
    canvas?: HTMLCanvasElement
    draw_count?: number
  }

  interface SpiceMsgCursorSet {
    flags?: number
    position?: any
    visible?: number
    cursor?: any
  }

  interface SpiceFileXferTask {
    id: number
    file: File
    read_bytes?: number
    cancelled?: boolean
  }

  interface SpiceMsgPortInit {
    name: Uint8Array
    opened: number
  }
}

export {}
