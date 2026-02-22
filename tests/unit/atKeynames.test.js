import { KeyNames } from '../../src/spice/atKeynames.ts';

describe('KeyNames', () => {
  test('should export all required key names', () => {
    expect(KeyNames).toBeDefined();
    expect(typeof KeyNames).toBe('object');
  });

  test('should have correct values for alphabetic keys', () => {
    expect(KeyNames.KEY_A).toBe(30);
    expect(KeyNames.KEY_B).toBe(48);
    expect(KeyNames.KEY_C).toBe(46);
    expect(KeyNames.KEY_D).toBe(32);
    expect(KeyNames.KEY_E).toBe(18);
    expect(KeyNames.KEY_F).toBe(33);
    expect(KeyNames.KEY_G).toBe(34);
    expect(KeyNames.KEY_H).toBe(35);
    expect(KeyNames.KEY_I).toBe(23);
    expect(KeyNames.KEY_J).toBe(36);
    expect(KeyNames.KEY_K).toBe(37);
    expect(KeyNames.KEY_L).toBe(38);
    expect(KeyNames.KEY_M).toBe(50);
    expect(KeyNames.KEY_N).toBe(49);
    expect(KeyNames.KEY_O).toBe(24);
    expect(KeyNames.KEY_P).toBe(25);
    expect(KeyNames.KEY_Q).toBe(16);
    expect(KeyNames.KEY_R).toBe(19);
    expect(KeyNames.KEY_S).toBe(31);
    expect(KeyNames.KEY_T).toBe(20);
    expect(KeyNames.KEY_U).toBe(22);
    expect(KeyNames.KEY_V).toBe(47);
    expect(KeyNames.KEY_W).toBe(17);
    expect(KeyNames.KEY_X).toBe(45);
    expect(KeyNames.KEY_Y).toBe(21);
    expect(KeyNames.KEY_Z).toBe(44);
  });

  test('should have correct values for numeric keys', () => {
    expect(KeyNames.KEY_0).toBe(11);
    expect(KeyNames.KEY_1).toBe(2);
    expect(KeyNames.KEY_2).toBe(3);
    expect(KeyNames.KEY_3).toBe(4);
    expect(KeyNames.KEY_4).toBe(5);
    expect(KeyNames.KEY_5).toBe(6);
    expect(KeyNames.KEY_6).toBe(7);
    expect(KeyNames.KEY_7).toBe(8);
    expect(KeyNames.KEY_8).toBe(9);
    expect(KeyNames.KEY_9).toBe(10);
  });

  test('should have correct values for function keys', () => {
    expect(KeyNames.KEY_F1).toBe(59);
    expect(KeyNames.KEY_F2).toBe(60);
    expect(KeyNames.KEY_F3).toBe(61);
    expect(KeyNames.KEY_F4).toBe(62);
    expect(KeyNames.KEY_F5).toBe(63);
    expect(KeyNames.KEY_F6).toBe(64);
    expect(KeyNames.KEY_F7).toBe(65);
    expect(KeyNames.KEY_F8).toBe(66);
    expect(KeyNames.KEY_F9).toBe(67);
    expect(KeyNames.KEY_F10).toBe(68);
    expect(KeyNames.KEY_F11).toBe(87);
    expect(KeyNames.KEY_F12).toBe(88);
  });

  test('should have correct values for control keys', () => {
    expect(KeyNames.KEY_Escape).toBe(1);
    expect(KeyNames.KEY_Tab).toBe(15);
    expect(KeyNames.KEY_Enter).toBe(28);
    expect(KeyNames.KEY_LCtrl).toBe(29);
    expect(KeyNames.KEY_ShiftL).toBe(42);
    expect(KeyNames.KEY_ShiftR).toBe(54);
    expect(KeyNames.KEY_Alt).toBe(56);
    expect(KeyNames.KEY_Space).toBe(57);
    expect(KeyNames.KEY_CapsLock).toBe(58);
    expect(KeyNames.KEY_NumLock).toBe(69);
    expect(KeyNames.KEY_ScrollLock).toBe(70);
    expect(KeyNames.KEY_BackSpace).toBe(14);
  });

  test('should have correct values for numeric keypad keys', () => {
    expect(KeyNames.KEY_KP_0).toBe(82);
    expect(KeyNames.KEY_KP_1).toBe(79);
    expect(KeyNames.KEY_KP_2).toBe(80);
    expect(KeyNames.KEY_KP_3).toBe(81);
    expect(KeyNames.KEY_KP_4).toBe(75);
    expect(KeyNames.KEY_KP_5).toBe(76);
    expect(KeyNames.KEY_KP_6).toBe(77);
    expect(KeyNames.KEY_KP_7).toBe(71);
    expect(KeyNames.KEY_KP_8).toBe(72);
    expect(KeyNames.KEY_KP_9).toBe(73);
    expect(KeyNames.KEY_KP_Multiply).toBe(55);
    expect(KeyNames.KEY_KP_Minus).toBe(74);
    expect(KeyNames.KEY_KP_Plus).toBe(78);
    expect(KeyNames.KEY_KP_Decimal).toBe(83);
  });

  test('should have correct values for symbol keys', () => {
    expect(KeyNames.KEY_Minus).toBe(12);
    expect(KeyNames.KEY_Equal).toBe(13);
    expect(KeyNames.KEY_LBrace).toBe(26);
    expect(KeyNames.KEY_RBrace).toBe(27);
    expect(KeyNames.KEY_SemiColon).toBe(39);
    expect(KeyNames.KEY_Quote).toBe(40);
    expect(KeyNames.KEY_Tilde).toBe(41);
    expect(KeyNames.KEY_BSlash).toBe(43);
    expect(KeyNames.KEY_Comma).toBe(51);
    expect(KeyNames.KEY_Period).toBe(52);
    expect(KeyNames.KEY_Slash).toBe(53);
    expect(KeyNames.KEY_Less).toBe(86);
  });

  test('should have correct values for special keys', () => {
    expect(KeyNames.KEY_SysRequest).toBe(84);
    expect(KeyNames.KEY_Prefix0).toBe(96);
    expect(KeyNames.KEY_Prefix1).toBe(97);
  });
});
