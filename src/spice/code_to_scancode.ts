/*
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
 */

export interface CodeToScanCode {
  Escape: number
  Digit1: number
  Digit2: number
  Digit3: number
  Digit4: number
  Digit5: number
  Digit6: number
  Digit7: number
  Digit8: number
  Digit9: number
  Digit0: number
  Minus: number
  Equal: number
  Backspace: number
  Tab: number
  KeyQ: number
  KeyW: number
  KeyE: number
  KeyR: number
  KeyT: number
  KeyY: number
  KeyU: number
  KeyI: number
  KeyO: number
  KeyP: number
  BracketLeft: number
  BracketRight: number
  Enter: number
  ControlLeft: number
  KeyA: number
  KeyS: number
  KeyD: number
  KeyF: number
  KeyG: number
  KeyH: number
  KeyJ: number
  KeyK: number
  KeyL: number
  Semicolon: number
  Quote: number
  Backquote: number
  ShiftLeft: number
  Backslash: number
  KeyZ: number
  KeyX: number
  KeyC: number
  KeyV: number
  KeyB: number
  KeyN: number
  KeyM: number
  Comma: number
  Period: number
  Slash: number
  ShiftRight: number
  NumpadMultiply: number
  AltLeft: number
  Space: number
  CapsLock: number
  F1: number
  F2: number
  F3: number
  F4: number
  F5: number
  F6: number
  F7: number
  F8: number
  F9: number
  F10: number
  Pause: number
  ScrollLock: number
  Numpad7: number
  Numpad8: number
  Numpad9: number
  NumpadSubtract: number
  Numpad4: number
  Numpad5: number
  Numpad6: number
  NumpadAdd: number
  Numpad1: number
  Numpad2: number
  Numpad3: number
  Numpad0: number
  NumpadDecimal: number
  PrintScreen: number
  IntlBackslash: number
  F11: number
  F12: number
  NumpadEqual: number
  F13: number
  F14: number
  F15: number
  F16: number
  F17: number
  F18: number
  F19: number
  F20: number
  F21: number
  F22: number
  F23: number
  KanaMode: number
  IntlRo: number
  F24: number
  Convert: number
  NonConvert: number
  IntlYen: number
  NumpadComma: number
  MediaTrackPrevious: number
  MediaTrackNext: number
  NumpadEnter: number
  ControlRight: number
  AudioVolumeMute: number
  LaunchApp2: number
  MediaPlayPause: number
  MediaStop: number
  VolumeDown: number
  VolumeUp: number
  BrowserHome: number
  NumpadDivide: number
  AltRight: number
  NumLock: number
  Home: number
  ArrowUp: number
  PageUp: number
  ArrowLeft: number
  ArrowRight: number
  End: number
  ArrowDown: number
  PageDown: number
  Insert: number
  Delete: number
  MetaLeft: number
  MetaRight: number
  ContextMenu: number
  Power: number
  BrowserSearch: number
  BrowserFavorites: number
  BrowserRefresh: number
  BrowserStop: number
  BrowserForward: number
  BrowserBack: number
  LaunchApp1: number
  LaunchMail: number
  MediaSelect: number
  [key: string]: number
}

const codeToScanCodeArr: any[] = []

codeToScanCodeArr.Escape = 0x01
codeToScanCodeArr.Digit1 = 0x02
codeToScanCodeArr.Digit2 = 0x03
codeToScanCodeArr.Digit3 = 0x04
codeToScanCodeArr.Digit4 = 0x05
codeToScanCodeArr.Digit5 = 0x06
codeToScanCodeArr.Digit6 = 0x07
codeToScanCodeArr.Digit7 = 0x08
codeToScanCodeArr.Digit8 = 0x09
codeToScanCodeArr.Digit9 = 0x0A
codeToScanCodeArr.Digit0 = 0x0B
codeToScanCodeArr.Minus = 0x0C
codeToScanCodeArr.Equal = 0x0D
codeToScanCodeArr.Backspace = 0x0E
codeToScanCodeArr.Tab = 0x0F
codeToScanCodeArr.KeyQ = 0x10
codeToScanCodeArr.KeyW = 0x11
codeToScanCodeArr.KeyE = 0x12
codeToScanCodeArr.KeyR = 0x13
codeToScanCodeArr.KeyT = 0x14
codeToScanCodeArr.KeyY = 0x15
codeToScanCodeArr.KeyU = 0x16
codeToScanCodeArr.KeyI = 0x17
codeToScanCodeArr.KeyO = 0x18
codeToScanCodeArr.KeyP = 0x19
codeToScanCodeArr.BracketLeft = 0x1A
codeToScanCodeArr.BracketRight = 0x1B
codeToScanCodeArr.Enter = 0x1C
codeToScanCodeArr.ControlLeft = 0x1D
codeToScanCodeArr.KeyA = 0x1E
codeToScanCodeArr.KeyS = 0x1F
codeToScanCodeArr.KeyD = 0x20
codeToScanCodeArr.KeyF = 0x21
codeToScanCodeArr.KeyG = 0x22
codeToScanCodeArr.KeyH = 0x23
codeToScanCodeArr.KeyJ = 0x24
codeToScanCodeArr.KeyK = 0x25
codeToScanCodeArr.KeyL = 0x26
codeToScanCodeArr.Semicolon = 0x27
codeToScanCodeArr.Quote = 0x28
codeToScanCodeArr.Backquote = 0x29
codeToScanCodeArr.ShiftLeft = 0x2A
codeToScanCodeArr.Backslash = 0x2B
codeToScanCodeArr.KeyZ = 0x2C
codeToScanCodeArr.KeyX = 0x2D
codeToScanCodeArr.KeyC = 0x2E
codeToScanCodeArr.KeyV = 0x2F
codeToScanCodeArr.KeyB = 0x30
codeToScanCodeArr.KeyN = 0x31
codeToScanCodeArr.KeyM = 0x32
codeToScanCodeArr.Comma = 0x33
codeToScanCodeArr.Period = 0x34
codeToScanCodeArr.Slash = 0x35
codeToScanCodeArr.ShiftRight = 0x36
codeToScanCodeArr.NumpadMultiply = 0x37
codeToScanCodeArr.AltLeft = 0x38
codeToScanCodeArr.Space = 0x39
codeToScanCodeArr.CapsLock = 0x3A
codeToScanCodeArr.F1 = 0x3B
codeToScanCodeArr.F2 = 0x3C
codeToScanCodeArr.F3 = 0x3D
codeToScanCodeArr.F4 = 0x3E
codeToScanCodeArr.F5 = 0x3F
codeToScanCodeArr.F6 = 0x40
codeToScanCodeArr.F7 = 0x41
codeToScanCodeArr.F8 = 0x42
codeToScanCodeArr.F9 = 0x43
codeToScanCodeArr.F10 = 0x44
codeToScanCodeArr.Pause = 0x45
codeToScanCodeArr.ScrollLock = 0x46
codeToScanCodeArr.Numpad7 = 0x47
codeToScanCodeArr.Numpad8 = 0x48
codeToScanCodeArr.Numpad9 = 0x49
codeToScanCodeArr.NumpadSubtract = 0x4A
codeToScanCodeArr.Numpad4 = 0x4B
codeToScanCodeArr.Numpad5 = 0x4C
codeToScanCodeArr.Numpad6 = 0x4D
codeToScanCodeArr.NumpadAdd = 0x4E
codeToScanCodeArr.Numpad1 = 0x4F
codeToScanCodeArr.Numpad2 = 0x50
codeToScanCodeArr.Numpad3 = 0x51
codeToScanCodeArr.Numpad0 = 0x52
codeToScanCodeArr.NumpadDecimal = 0x53
codeToScanCodeArr.PrintScreen = 0x54
codeToScanCodeArr.IntlBackslash = 0x56
codeToScanCodeArr.F11 = 0x57
codeToScanCodeArr.F12 = 0x58
codeToScanCodeArr.NumpadEqual = 0x59
codeToScanCodeArr.F13 = 0x64
codeToScanCodeArr.F14 = 0x65
codeToScanCodeArr.F15 = 0x66
codeToScanCodeArr.F16 = 0x67
codeToScanCodeArr.F17 = 0x68
codeToScanCodeArr.F18 = 0x69
codeToScanCodeArr.F19 = 0x6A
codeToScanCodeArr.F20 = 0x6B
codeToScanCodeArr.F21 = 0x6C
codeToScanCodeArr.F22 = 0x6D
codeToScanCodeArr.F23 = 0x6E
codeToScanCodeArr.KanaMode = 0x70
codeToScanCodeArr.IntlRo = 0x73
codeToScanCodeArr.F24 = 0x76
codeToScanCodeArr.Convert = 0x79
codeToScanCodeArr.NonConvert = 0x7B
codeToScanCodeArr.IntlYen = 0x7D
codeToScanCodeArr.NumpadComma = 0x7E
codeToScanCodeArr.MediaTrackPrevious = 0xE0 | (0x10 << 8)
codeToScanCodeArr.MediaTrackNext = 0xE0 | (0x19 << 8)
codeToScanCodeArr.NumpadEnter = 0xE0 | (0x1C << 8)
codeToScanCodeArr.ControlRight = 0xE0 | (0x1D << 8)
codeToScanCodeArr.AudioVolumeMute = 0xE0 | (0x20 << 8)
codeToScanCodeArr.LaunchApp2 = 0xE0 | (0x21 << 8)
codeToScanCodeArr.MediaPlayPause = 0xE0 | (0x22 << 8)
codeToScanCodeArr.MediaStop = 0xE0 | (0x24 << 8)
codeToScanCodeArr.VolumeDown = 0xE0 | (0x2E << 8)
codeToScanCodeArr.VolumeUp = 0xE0 | (0x30 << 8)
codeToScanCodeArr.BrowserHome = 0xE0 | (0x32 << 8)
codeToScanCodeArr.NumpadDivide = 0xE0 | (0x35 << 8)
codeToScanCodeArr.PrintScreen = 0xE0 | (0x37 << 8)
codeToScanCodeArr.AltRight = 0xE0 | (0x38 << 8)
codeToScanCodeArr.NumLock = 0xE0 | (0x45 << 8)
codeToScanCodeArr.Pause = 0xE0 | (0x46 << 8)
codeToScanCodeArr.Home = 0xE0 | (0x47 << 8)
codeToScanCodeArr.ArrowUp = 0xE0 | (0x48 << 8)
codeToScanCodeArr.PageUp = 0xE0 | (0x49 << 8)
codeToScanCodeArr.ArrowLeft = 0xE0 | (0x4B << 8)
codeToScanCodeArr.ArrowRight = 0xE0 | (0x4D << 8)
codeToScanCodeArr.End = 0xE0 | (0x4F << 8)
codeToScanCodeArr.ArrowDown = 0xE0 | (0x50 << 8)
codeToScanCodeArr.PageDown = 0xE0 | (0x51 << 8)
codeToScanCodeArr.Insert = 0xE0 | (0x52 << 8)
codeToScanCodeArr.Delete = 0xE0 | (0x53 << 8)
codeToScanCodeArr.MetaLeft = 0xE0 | (0x5B << 8)
codeToScanCodeArr.MetaRight = 0xE0 | (0x5C << 8)
codeToScanCodeArr.ContextMenu = 0xE0 | (0x5D << 8)
codeToScanCodeArr.Power = 0xE0 | (0x5E << 8)
codeToScanCodeArr.BrowserSearch = 0xE0 | (0x65 << 8)
codeToScanCodeArr.BrowserFavorites = 0xE0 | (0x66 << 8)
codeToScanCodeArr.BrowserRefresh = 0xE0 | (0x67 << 8)
codeToScanCodeArr.BrowserStop = 0xE0 | (0x68 << 8)
codeToScanCodeArr.BrowserForward = 0xE0 | (0x69 << 8)
codeToScanCodeArr.BrowserBack = 0xE0 | (0x6A << 8)
codeToScanCodeArr.LaunchApp1 = 0xE0 | (0x6B << 8)
codeToScanCodeArr.LaunchMail = 0xE0 | (0x6C << 8)
codeToScanCodeArr.MediaSelect = 0xE0 | (0x6D << 8)

export const code_to_scancode: CodeToScanCode = codeToScanCodeArr
