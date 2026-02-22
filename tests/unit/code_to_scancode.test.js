import { code_to_scancode } from '../../src/spice/code_to_scancode.ts';

describe('code_to_scancode', () => {
  test('should export all required scancodes', () => {
    expect(code_to_scancode).toBeDefined();
    expect(typeof code_to_scancode).toBe('object');
  });

  test('should have correct values for function keys', () => {
    expect(code_to_scancode["F1"]).toBe(0x3B);
    expect(code_to_scancode["F2"]).toBe(0x3C);
    expect(code_to_scancode["F3"]).toBe(0x3D);
    expect(code_to_scancode["F4"]).toBe(0x3E);
    expect(code_to_scancode["F5"]).toBe(0x3F);
    expect(code_to_scancode["F6"]).toBe(0x40);
    expect(code_to_scancode["F7"]).toBe(0x41);
    expect(code_to_scancode["F8"]).toBe(0x42);
    expect(code_to_scancode["F9"]).toBe(0x43);
    expect(code_to_scancode["F10"]).toBe(0x44);
    expect(code_to_scancode["F11"]).toBe(0x57);
    expect(code_to_scancode["F12"]).toBe(0x58);
  });

  test('should have correct values for control keys', () => {
    expect(code_to_scancode["Escape"]).toBe(0x01);
    expect(code_to_scancode["Tab"]).toBe(0x0F);
    expect(code_to_scancode["Backspace"]).toBe(0x0E);
    expect(code_to_scancode["Enter"]).toBe(0x1C);
    expect(code_to_scancode["ShiftLeft"]).toBe(0x2A);
    expect(code_to_scancode["ShiftRight"]).toBe(0x36);
    expect(code_to_scancode["ControlLeft"]).toBe(0x1D);
    expect(code_to_scancode["ControlRight"]).toBe(0xE0 | (0x1D << 8));
    expect(code_to_scancode["AltLeft"]).toBe(0x38);
    expect(code_to_scancode["AltRight"]).toBe(0xE0 | (0x38 << 8));
    expect(code_to_scancode["Space"]).toBe(0x39);
    expect(code_to_scancode["CapsLock"]).toBe(0x3A);
    expect(code_to_scancode["ScrollLock"]).toBe(0x46);
    expect(code_to_scancode["Pause"]).toBe(0xE0 | (0x46 << 8));
  });

  test('should have correct values for alphabetic keys', () => {
    expect(code_to_scancode["KeyA"]).toBe(0x1E);
    expect(code_to_scancode["KeyB"]).toBe(0x30);
    expect(code_to_scancode["KeyC"]).toBe(0x2E);
    expect(code_to_scancode["KeyD"]).toBe(0x20);
    expect(code_to_scancode["KeyE"]).toBe(0x12);
    expect(code_to_scancode["KeyF"]).toBe(0x21);
    expect(code_to_scancode["KeyG"]).toBe(0x22);
    expect(code_to_scancode["KeyH"]).toBe(0x23);
    expect(code_to_scancode["KeyI"]).toBe(0x17);
    expect(code_to_scancode["KeyJ"]).toBe(0x24);
    expect(code_to_scancode["KeyK"]).toBe(0x25);
    expect(code_to_scancode["KeyL"]).toBe(0x26);
    expect(code_to_scancode["KeyM"]).toBe(0x32);
    expect(code_to_scancode["KeyN"]).toBe(0x31);
    expect(code_to_scancode["KeyO"]).toBe(0x18);
    expect(code_to_scancode["KeyP"]).toBe(0x19);
    expect(code_to_scancode["KeyQ"]).toBe(0x10);
    expect(code_to_scancode["KeyR"]).toBe(0x13);
    expect(code_to_scancode["KeyS"]).toBe(0x1F);
    expect(code_to_scancode["KeyT"]).toBe(0x14);
    expect(code_to_scancode["KeyU"]).toBe(0x16);
    expect(code_to_scancode["KeyV"]).toBe(0x2F);
    expect(code_to_scancode["KeyW"]).toBe(0x11);
    expect(code_to_scancode["KeyX"]).toBe(0x2D);
    expect(code_to_scancode["KeyY"]).toBe(0x15);
    expect(code_to_scancode["KeyZ"]).toBe(0x2C);
  });

  test('should have correct values for numeric keys', () => {
    expect(code_to_scancode["Digit0"]).toBe(0x0B);
    expect(code_to_scancode["Digit1"]).toBe(0x02);
    expect(code_to_scancode["Digit2"]).toBe(0x03);
    expect(code_to_scancode["Digit3"]).toBe(0x04);
    expect(code_to_scancode["Digit4"]).toBe(0x05);
    expect(code_to_scancode["Digit5"]).toBe(0x06);
    expect(code_to_scancode["Digit6"]).toBe(0x07);
    expect(code_to_scancode["Digit7"]).toBe(0x08);
    expect(code_to_scancode["Digit8"]).toBe(0x09);
    expect(code_to_scancode["Digit9"]).toBe(0x0A);
  });

  test('should have correct values for numeric keypad keys', () => {
    expect(code_to_scancode["Numpad0"]).toBe(0x52);
    expect(code_to_scancode["Numpad1"]).toBe(0x4F);
    expect(code_to_scancode["Numpad2"]).toBe(0x50);
    expect(code_to_scancode["Numpad3"]).toBe(0x51);
    expect(code_to_scancode["Numpad4"]).toBe(0x4B);
    expect(code_to_scancode["Numpad5"]).toBe(0x4C);
    expect(code_to_scancode["Numpad6"]).toBe(0x4D);
    expect(code_to_scancode["Numpad7"]).toBe(0x47);
    expect(code_to_scancode["Numpad8"]).toBe(0x48);
    expect(code_to_scancode["Numpad9"]).toBe(0x49);
    expect(code_to_scancode["NumpadMultiply"]).toBe(0x37);
    expect(code_to_scancode["NumpadAdd"]).toBe(0x4E);
    expect(code_to_scancode["NumpadSubtract"]).toBe(0x4A);
    expect(code_to_scancode["NumpadDecimal"]).toBe(0x53);
    expect(code_to_scancode["NumpadEnter"]).toBe(0xE0 | (0x1C << 8));
  });

  test('should have correct values for arrow keys', () => {
    expect(code_to_scancode["ArrowUp"]).toBe(0xE0 | (0x48 << 8));
    expect(code_to_scancode["ArrowDown"]).toBe(0xE0 | (0x50 << 8));
    expect(code_to_scancode["ArrowLeft"]).toBe(0xE0 | (0x4B << 8));
    expect(code_to_scancode["ArrowRight"]).toBe(0xE0 | (0x4D << 8));
  });

  test('should have correct values for media keys', () => {
    expect(code_to_scancode["MediaPlayPause"]).toBe(0xE0 | (0x22 << 8));
    expect(code_to_scancode["MediaStop"]).toBe(0xE0 | (0x24 << 8));
    expect(code_to_scancode["MediaTrackPrevious"]).toBe(0xE0 | (0x10 << 8));
    expect(code_to_scancode["MediaTrackNext"]).toBe(0xE0 | (0x19 << 8));
    expect(code_to_scancode["AudioVolumeMute"]).toBe(0xE0 | (0x20 << 8));
    expect(code_to_scancode["VolumeDown"]).toBe(0xE0 | (0x2E << 8));
    expect(code_to_scancode["VolumeUp"]).toBe(0xE0 | (0x30 << 8));
  });

  test('should have correct values for symbol keys', () => {
    expect(code_to_scancode["Minus"]).toBe(0x0C);
    expect(code_to_scancode["Equal"]).toBe(0x0D);
    expect(code_to_scancode["BracketLeft"]).toBe(0x1A);
    expect(code_to_scancode["BracketRight"]).toBe(0x1B);
    expect(code_to_scancode["Semicolon"]).toBe(0x27);
    expect(code_to_scancode["Quote"]).toBe(0x28);
    expect(code_to_scancode["Backquote"]).toBe(0x29);
    expect(code_to_scancode["Backslash"]).toBe(0x2B);
    expect(code_to_scancode["Comma"]).toBe(0x33);
    expect(code_to_scancode["Period"]).toBe(0x34);
    expect(code_to_scancode["Slash"]).toBe(0x35);
  });
});
